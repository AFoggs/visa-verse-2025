import { Router } from 'express';
import { getDb } from '../config/firebase.js';
import { getSuggestedMatches, calculateCompatibility } from '../services/matching.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all matches for current user
router.get('/', async (req, res) => {
  try {
    const db = getDb();

    const matchesSnapshot = await db.collection('matches')
      .where('user1Id', '==', req.user.uid)
      .get();

    const matchesSnapshot2 = await db.collection('matches')
      .where('user2Id', '==', req.user.uid)
      .get();

    const matches = [];

    matchesSnapshot.forEach(doc => {
      matches.push({ matchId: doc.id, ...doc.data() });
    });

    matchesSnapshot2.forEach(doc => {
      matches.push({ matchId: doc.id, ...doc.data() });
    });

    res.json({ matches });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

// Get suggested matches
router.get('/suggested', async (req, res) => {
  try {
    const matches = await getSuggestedMatches(req.user.uid, 10);
    res.json({ matches });
  } catch (error) {
    console.error('Get suggested matches error:', error);
    res.status(500).json({ error: 'Failed to get suggested matches' });
  }
});

// Get specific match
router.get('/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const db = getDb();

    const matchDoc = await db.collection('matches').doc(matchId).get();

    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchData = matchDoc.data();

    // Verify user is part of this match
    if (matchData.user1Id !== req.user.uid && matchData.user2Id !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get other user's profile
    const otherUserId = matchData.user1Id === req.user.uid ? matchData.user2Id : matchData.user1Id;
    const otherUserDoc = await db.collection('users').doc(otherUserId).get();
    const otherUserData = otherUserDoc.exists ? otherUserDoc.data() : {};

    const response = {
      matchId,
      ...matchData,
      otherUser: {
        userId: otherUserId,
        name: otherUserData.profile?.name,
        age: otherUserData.profile?.age,
        location: otherUserData.profile?.location,
      },
    };

    // Include extended profile for friends
    if (matchData.status === 'friends') {
      response.otherUser.bio = otherUserData.extendedProfile?.bio;
      response.otherUser.interests = otherUserData.profile?.interests;
    }

    res.json({ match: response });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ error: 'Failed to get match' });
  }
});

// Connect with a user (requires mutual connection)
router.post('/connect', async (req, res) => {
  try {
    const { userId } = req.body;
    console.log('Connect request:', { fromUser: req.user.uid, toUser: userId });

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const db = getDb();

    // Get both user profiles
    const currentUserDoc = await db.collection('users').doc(req.user.uid).get();
    const otherUserDoc = await db.collection('users').doc(userId).get();

    if (!currentUserDoc.exists || !otherUserDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = { userId: req.user.uid, ...currentUserDoc.data() };
    const otherUser = { userId, ...otherUserDoc.data() };

    // Check if a pending match already exists (other user already requested to connect)
    // Check both directions since user1Id/user2Id order depends on who initiated first
    const existingMatch1 = await db.collection('matches')
      .where('user1Id', '==', userId)
      .where('user2Id', '==', req.user.uid)
      .where('status', '==', 'pending')
      .get();

    const existingMatch2 = await db.collection('matches')
      .where('user1Id', '==', req.user.uid)
      .where('user2Id', '==', userId)
      .where('status', '==', 'pending')
      .get();

    // If other user already sent a connection request, complete the connection
    if (!existingMatch1.empty) {
      const matchDoc = existingMatch1.docs[0];
      const matchData = matchDoc.data();

      // Upgrade to connected
      await matchDoc.ref.update({
        status: 'connected',
        'connectionRequest.user2Accepted': true,
        connectedAt: new Date(),
      });

      // Update both users' connections
      const currentConnections = currentUser.connections?.connections || [];
      const otherConnections = otherUser.connections?.connections || [];

      await db.collection('users').doc(req.user.uid).update({
        'connections.connections': [...currentConnections, userId],
      });

      await db.collection('users').doc(userId).update({
        'connections.connections': [...otherConnections, req.user.uid],
      });

      console.log('Mutual connection complete:', { matchId: matchDoc.id, user1: userId, user2: req.user.uid });
      return res.json({
        match: { ...matchData, status: 'connected' },
        message: 'Connection complete! You can now chat.',
        mutual: true
      });
    }

    // Check if current user already sent a request
    if (!existingMatch2.empty) {
      return res.json({
        match: existingMatch2.docs[0].data(),
        message: 'Connection request already sent. Waiting for them to connect back.',
        pending: true
      });
    }

    // Calculate compatibility
    const compatibility = calculateCompatibility(currentUser, otherUser);

    if (!compatibility) {
      return res.status(400).json({ error: 'Users are not compatible' });
    }

    // Create new pending match (one-way request)
    const matchId = uuidv4();
    const matchData = {
      matchId,
      user1Id: req.user.uid,
      user2Id: userId,
      user1Profile: {
        name: currentUser.profile?.name,
        age: currentUser.profile?.age,
        location: currentUser.profile?.location,
      },
      user2Profile: {
        name: otherUser.profile?.name,
        age: otherUser.profile?.age,
        location: otherUser.profile?.location,
      },
      compatibilityScore: compatibility.score,
      sharedInterests: compatibility.sharedInterests,
      status: 'pending',
      connectionRequest: {
        initiatedBy: req.user.uid,
        user2Accepted: false,
      },
      connectionMetrics: {
        totalChatTime: 0,
        sessionCount: 0,
        lastInteraction: new Date(),
      },
      ratings: {},
      friendRequestStatus: {
        user1Requested: false,
        user2Requested: false,
      },
      createdAt: new Date(),
    };

    await db.collection('matches').doc(matchId).set(matchData);

    console.log('Connection request sent:', { matchId, from: req.user.uid, to: userId });
    res.json({
      match: matchData,
      message: 'Connection request sent! They need to connect with you too.',
      pending: true
    });
  } catch (error) {
    console.error('Connect error:', error);
    res.status(500).json({ error: 'Failed to connect', details: error.message });
  }
});

// Decline a match
router.post('/decline', async (req, res) => {
  try {
    const { userId, feedback } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const db = getDb();

    // Store feedback for improving matching
    if (feedback) {
      await db.collection('matchFeedback').add({
        fromUserId: req.user.uid,
        toUserId: userId,
        feedback,
        timestamp: new Date(),
      });
    }

    // Add to strangers list (declined)
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userData = userDoc.data();
    const strangers = userData.connections?.strangers || [];

    if (!strangers.includes(userId)) {
      await db.collection('users').doc(req.user.uid).update({
        'connections.strangers': [...strangers, userId],
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Decline error:', error);
    res.status(500).json({ error: 'Failed to decline' });
  }
});

// Rate a connection
router.post('/:matchId/rate', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const db = getDb();
    const matchDoc = await db.collection('matches').doc(matchId).get();

    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchData = matchDoc.data();

    // Determine which user's rating to update
    const ratingField = matchData.user1Id === req.user.uid ? 'ratings.user1Rating' : 'ratings.user2Rating';

    await db.collection('matches').doc(matchId).update({
      [ratingField]: rating,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Rate error:', error);
    res.status(500).json({ error: 'Failed to rate' });
  }
});

// Request to become friends
router.post('/:matchId/friend-request', async (req, res) => {
  try {
    const { matchId } = req.params;
    const db = getDb();

    const matchDoc = await db.collection('matches').doc(matchId).get();

    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchData = matchDoc.data();

    // Verify user is part of this match
    if (matchData.user1Id !== req.user.uid && matchData.user2Id !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Determine which user is making the request
    const isUser1 = matchData.user1Id === req.user.uid;
    const requestField = isUser1 ? 'friendRequestStatus.user1Requested' : 'friendRequestStatus.user2Requested';
    const otherRequestField = isUser1 ? 'friendRequestStatus.user2Requested' : 'friendRequestStatus.user1Requested';

    // Check if both have now requested
    const otherRequested = matchData.friendRequestStatus?.[isUser1 ? 'user2Requested' : 'user1Requested'];

    if (otherRequested) {
      // Both have requested - upgrade to friends!
      await db.collection('matches').doc(matchId).update({
        [requestField]: true,
        status: 'friends',
      });

      // Update both users' connections
      const currentUserDoc = await db.collection('users').doc(req.user.uid).get();
      const otherUserId = isUser1 ? matchData.user2Id : matchData.user1Id;
      const otherUserDoc = await db.collection('users').doc(otherUserId).get();

      const currentFriends = currentUserDoc.data().connections?.friends || [];
      const otherFriends = otherUserDoc.data().connections?.friends || [];
      const currentConnections = currentUserDoc.data().connections?.connections || [];
      const otherConnections = otherUserDoc.data().connections?.connections || [];

      // Move from connections to friends
      await db.collection('users').doc(req.user.uid).update({
        'connections.friends': [...currentFriends, otherUserId],
        'connections.connections': currentConnections.filter(id => id !== otherUserId),
      });

      await db.collection('users').doc(otherUserId).update({
        'connections.friends': [...otherFriends, req.user.uid],
        'connections.connections': otherConnections.filter(id => id !== req.user.uid),
      });

      return res.json({ success: true, newStatus: 'friends' });
    } else {
      // Just mark as requested
      await db.collection('matches').doc(matchId).update({
        [requestField]: true,
      });

      return res.json({ success: true, newStatus: 'pending' });
    }
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Accept friend request (alternative to mutual request)
router.post('/:matchId/accept-friend', async (req, res) => {
  // This is essentially the same as friend-request - calling it will complete the friendship
  return router.handle(req, res, () => {
    req.url = req.url.replace('/accept-friend', '/friend-request');
  });
});

export default router;

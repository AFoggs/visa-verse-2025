import { Router } from 'express';
import { getDb } from '../config/firebase.js';
import { getSuggestedMatches, calculateCompatibility, getCurrentWeights } from '../services/matching.js';
import { updateMatchFeedback, updateMatchMetrics, recordMatchOutcome } from '../services/matchOutcomeLearning.js';
import { preGenerateSummariesForUser, preGenerateAllSummaries, cleanupExpiredCache } from '../services/matchSummaryCache.js';
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

    // Check if any match already exists between these two users
    // Query all matches involving both users (regardless of who is user1 or user2)
    const allMatches1 = await db.collection('matches')
      .where('user1Id', '==', userId)
      .where('user2Id', '==', req.user.uid)
      .get();

    const allMatches2 = await db.collection('matches')
      .where('user1Id', '==', req.user.uid)
      .where('user2Id', '==', userId)
      .get();

    console.log('Existing matches check:', {
      matches1Count: allMatches1.size,
      matches2Count: allMatches2.size,
      matches1Data: allMatches1.docs.map(d => ({ id: d.id, status: d.data().status })),
      matches2Data: allMatches2.docs.map(d => ({ id: d.id, status: d.data().status })),
    });

    // Check if other user already sent a pending request TO current user
    const pendingFromOther = allMatches1.docs.find(d => d.data().status === 'pending');

    if (pendingFromOther) {
      const matchDoc = pendingFromOther;
      const matchData = matchDoc.data();

      console.log('Found pending request from other user, completing mutual connection');

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
        'connections.connections': [...new Set([...currentConnections, userId])],
      });

      await db.collection('users').doc(userId).update({
        'connections.connections': [...new Set([...otherConnections, req.user.uid])],
      });

      console.log('Mutual connection complete:', { matchId: matchDoc.id, user1: userId, user2: req.user.uid });
      return res.json({
        match: { ...matchData, status: 'connected' },
        message: 'Connection complete! You can now chat.',
        mutual: true
      });
    }

    // Check if current user already sent a pending request
    const pendingFromCurrent = allMatches2.docs.find(d => d.data().status === 'pending');

    if (pendingFromCurrent) {
      console.log('Current user already sent a request, still pending');
      return res.json({
        match: pendingFromCurrent.data(),
        message: 'Connection request already sent. Waiting for them to connect back.',
        pending: true
      });
    }

    // Check if already connected
    const alreadyConnected = [...allMatches1.docs, ...allMatches2.docs].find(d => d.data().status === 'connected');
    if (alreadyConnected) {
      return res.json({
        match: alreadyConnected.data(),
        message: 'You are already connected!',
        alreadyConnected: true
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

    // Record match outcome for learning algorithm
    recordMatchOutcome(
      matchId,
      req.user.uid,
      userId,
      compatibility.score,
      compatibility.breakdown
    ).catch(err => console.error('Failed to record match outcome:', err));

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

// Accept a pending connection request
router.post('/accept/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const db = getDb();

    const matchDoc = await db.collection('matches').doc(matchId).get();

    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchData = matchDoc.data();

    // Verify current user is user2 (the one who received the request)
    if (matchData.user2Id !== req.user.uid) {
      return res.status(403).json({ error: 'You cannot accept this request' });
    }

    if (matchData.status !== 'pending') {
      return res.status(400).json({ error: 'This request is not pending' });
    }

    // Get both user profiles for updating connections
    const currentUserDoc = await db.collection('users').doc(req.user.uid).get();
    const otherUserDoc = await db.collection('users').doc(matchData.user1Id).get();

    const currentUser = currentUserDoc.data();
    const otherUser = otherUserDoc.data();

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
      'connections.connections': [...new Set([...currentConnections, matchData.user1Id])],
    });

    await db.collection('users').doc(matchData.user1Id).update({
      'connections.connections': [...new Set([...otherConnections, req.user.uid])],
    });

    console.log('Connection accepted:', { matchId, user1: matchData.user1Id, user2: req.user.uid });
    res.json({
      match: { ...matchData, status: 'connected' },
      message: 'Connection accepted! You can now chat.',
      success: true
    });
  } catch (error) {
    console.error('Accept connection error:', error);
    res.status(500).json({ error: 'Failed to accept connection' });
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
  try {
    const { matchId } = req.params;
    const db = getDb();

    // Use a transaction to ensure atomicity and prevent race conditions
    const result = await db.runTransaction(async (transaction) => {
      const matchRef = db.collection('matches').doc(matchId);
      const matchDoc = await transaction.get(matchRef);

      if (!matchDoc.exists) {
        throw new Error('Match not found');
      }

      const matchData = matchDoc.data();

      // Verify user is part of this match
      if (matchData.user1Id !== req.user.uid && matchData.user2Id !== req.user.uid) {
        throw new Error('Access denied');
      }

      // Check if already friends
      if (matchData.status === 'friends') {
        return { success: true, newStatus: 'friends', message: 'Already friends' };
      }

      // Determine which user is accepting
      const isUser1 = matchData.user1Id === req.user.uid;

      // Check if other user requested
      const otherRequested = matchData.friendRequestStatus?.[isUser1 ? 'user2Requested' : 'user1Requested'];

      if (!otherRequested) {
        throw new Error('No pending friend request to accept');
      }

      const currentUserId = req.user.uid;
      const otherUserId = isUser1 ? matchData.user2Id : matchData.user1Id;

      // Get both user documents within the transaction
      const currentUserRef = db.collection('users').doc(currentUserId);
      const otherUserRef = db.collection('users').doc(otherUserId);

      const [currentUserDoc, otherUserDoc] = await Promise.all([
        transaction.get(currentUserRef),
        transaction.get(otherUserRef),
      ]);

      const currentFriends = currentUserDoc.data()?.connections?.friends || [];
      const otherFriends = otherUserDoc.data()?.connections?.friends || [];
      const currentConnections = currentUserDoc.data()?.connections?.connections || [];
      const otherConnections = otherUserDoc.data()?.connections?.connections || [];

      // Update match status
      const requestField = isUser1 ? 'friendRequestStatus.user1Requested' : 'friendRequestStatus.user2Requested';
      transaction.update(matchRef, {
        [requestField]: true,
        status: 'friends',
      });

      // Move from connections to friends for current user
      transaction.update(currentUserRef, {
        'connections.friends': [...new Set([...currentFriends, otherUserId])],
        'connections.connections': currentConnections.filter(id => id !== otherUserId),
      });

      // Move from connections to friends for other user
      transaction.update(otherUserRef, {
        'connections.friends': [...new Set([...otherFriends, currentUserId])],
        'connections.connections': otherConnections.filter(id => id !== currentUserId),
      });

      return { success: true, newStatus: 'friends' };
    });

    return res.json(result);
  } catch (error) {
    console.error('Accept friend error:', error);

    // Handle specific error messages
    if (error.message === 'Match not found') {
      return res.status(404).json({ error: 'Match not found' });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (error.message === 'No pending friend request to accept') {
      return res.status(400).json({ error: 'No pending friend request to accept' });
    }

    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Remove connection/friend
router.post('/:matchId/remove', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

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

    const otherUserId = matchData.user1Id === req.user.uid ? matchData.user2Id : matchData.user1Id;

    // Log the removal for analytics
    await db.collection('removals').add({
      matchId,
      removedBy: req.user.uid,
      removedUser: otherUserId,
      previousStatus: matchData.status,
      reason,
      createdAt: new Date(),
    });

    // Update match status
    await db.collection('matches').doc(matchId).update({
      status: 'removed',
      removedBy: req.user.uid,
      removedAt: new Date(),
      removeReason: reason,
    });

    // Remove from both users' connections lists
    const currentUserDoc = await db.collection('users').doc(req.user.uid).get();
    const otherUserDoc = await db.collection('users').doc(otherUserId).get();

    const currentConnections = currentUserDoc.data()?.connections?.connections || [];
    const currentFriends = currentUserDoc.data()?.connections?.friends || [];
    const otherConnections = otherUserDoc.data()?.connections?.connections || [];
    const otherFriends = otherUserDoc.data()?.connections?.friends || [];

    await db.collection('users').doc(req.user.uid).update({
      'connections.connections': currentConnections.filter(id => id !== otherUserId),
      'connections.friends': currentFriends.filter(id => id !== otherUserId),
    });

    await db.collection('users').doc(otherUserId).update({
      'connections.connections': otherConnections.filter(id => id !== req.user.uid),
      'connections.friends': otherFriends.filter(id => id !== req.user.uid),
    });

    res.json({ success: true, message: 'Connection removed successfully' });
  } catch (error) {
    console.error('Remove connection error:', error);
    res.status(500).json({ error: 'Failed to remove connection' });
  }
});

// Submit detailed match feedback for learning algorithm
router.post('/:matchId/feedback', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { rating, whatWorked, whatDidnt } = req.body;

    if (!rating || rating < 0 || rating > 100) {
      return res.status(400).json({ error: 'Rating must be between 0 and 100' });
    }

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

    // Update match feedback for learning
    const success = await updateMatchFeedback(matchId, req.user.uid, {
      rating,
      whatWorked: whatWorked || [],
      whatDidnt: whatDidnt || [],
    });

    if (success) {
      res.json({ success: true, message: 'Feedback submitted successfully' });
    } else {
      res.status(500).json({ error: 'Failed to submit feedback' });
    }
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Update match metrics (conversation count, last interaction)
router.post('/:matchId/metrics', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { conversationCount, becameFriends } = req.body;

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

    await updateMatchMetrics(matchId, {
      conversationCount: conversationCount || 0,
      becameFriends: becameFriends || false,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Update metrics error:', error);
    res.status(500).json({ error: 'Failed to update metrics' });
  }
});

// Get current algorithm weights (for debugging/transparency)
router.get('/algorithm/weights', async (req, res) => {
  try {
    const weights = getCurrentWeights();
    res.json({ weights });
  } catch (error) {
    console.error('Get weights error:', error);
    res.status(500).json({ error: 'Failed to get weights' });
  }
});

// Pre-generate AI summaries for current user's top matches
router.post('/summaries/generate', async (req, res) => {
  try {
    const { limit = 10 } = req.body;
    const result = await preGenerateSummariesForUser(req.user.uid, limit);
    res.json({
      success: true,
      message: `Generated ${result.generated} summaries, ${result.skipped} already cached`,
      ...result,
    });
  } catch (error) {
    console.error('Generate summaries error:', error);
    res.status(500).json({ error: 'Failed to generate summaries' });
  }
});

// Admin endpoint: Pre-generate summaries for all users (daily job)
// This should be called by a cron job or scheduled task
router.post('/summaries/generate-all', async (req, res) => {
  try {
    // Optional: Add admin check here
    const { limit = 10 } = req.body;

    // Run in background to not timeout the request
    res.json({
      success: true,
      message: 'Summary generation started in background',
    });

    // Execute after response is sent
    preGenerateAllSummaries(limit).then(result => {
      console.log('Batch summary generation complete:', result);
    }).catch(err => {
      console.error('Batch summary generation failed:', err);
    });
  } catch (error) {
    console.error('Generate all summaries error:', error);
    res.status(500).json({ error: 'Failed to start summary generation' });
  }
});

// Admin endpoint: Clean up expired cache entries
router.post('/summaries/cleanup', async (req, res) => {
  try {
    const result = await cleanupExpiredCache();
    res.json({
      success: true,
      message: `Cleaned up ${result.deleted || 0} expired entries`,
      ...result,
    });
  } catch (error) {
    console.error('Cleanup cache error:', error);
    res.status(500).json({ error: 'Failed to cleanup cache' });
  }
});

// Report user
router.post('/:matchId/report', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { reason, details } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Report reason is required' });
    }

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

    const reportedUserId = matchData.user1Id === req.user.uid ? matchData.user2Id : matchData.user1Id;

    // Create the report
    await db.collection('reports').add({
      matchId,
      reportedBy: req.user.uid,
      reportedUser: reportedUserId,
      reason,
      details: details || '',
      status: 'pending', // pending, reviewed, resolved, dismissed
      createdAt: new Date(),
    });

    // Increment reported user's report count for moderation
    const reportedUserDoc = await db.collection('users').doc(reportedUserId).get();
    const currentReportCount = reportedUserDoc.data()?.reportCount || 0;

    await db.collection('users').doc(reportedUserId).update({
      reportCount: currentReportCount + 1,
      lastReportedAt: new Date(),
    });

    res.json({ success: true, message: 'Report submitted successfully' });
  } catch (error) {
    console.error('Report user error:', error);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

export default router;

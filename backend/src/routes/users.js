import { Router } from 'express';
import { getDb } from '../config/firebase.js';

const router = Router();

// Get current user profile
router.get('/me', async (req, res) => {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: userDoc.data() });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Get friends list (must be before /:userId route)
router.get('/friends', async (req, res) => {
  try {
    const db = getDb();
    console.log('Fetching friends for user:', req.user.uid);

    // Query matches where current user is user1
    const matches1 = await db.collection('matches')
      .where('user1Id', '==', req.user.uid)
      .where('status', '==', 'friends')
      .get();

    // Query matches where current user is user2
    const matches2 = await db.collection('matches')
      .where('user2Id', '==', req.user.uid)
      .where('status', '==', 'friends')
      .get();

    console.log('Found friend matches:', { asUser1: matches1.size, asUser2: matches2.size });

    const friends = [];

    matches1.forEach(doc => {
      const match = doc.data();
      friends.push({
        matchId: doc.id,
        otherUser: {
          userId: match.user2Id,
          ...match.user2Profile,
        },
        compatibilityScore: match.compatibilityScore,
        sharedInterests: match.sharedInterests,
        connectionMetrics: match.connectionMetrics,
      });
    });

    matches2.forEach(doc => {
      const match = doc.data();
      friends.push({
        matchId: doc.id,
        otherUser: {
          userId: match.user1Id,
          ...match.user1Profile,
        },
        compatibilityScore: match.compatibilityScore,
        sharedInterests: match.sharedInterests,
        connectionMetrics: match.connectionMetrics,
      });
    });

    console.log('Total friends:', friends.length);
    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

// Get pending connection requests (people who want to connect with you)
router.get('/pending-requests', async (req, res) => {
  try {
    const db = getDb();
    console.log('Fetching pending requests for user:', req.user.uid);

    // Find pending matches where current user is user2 (someone sent request TO current user)
    const pendingMatches = await db.collection('matches')
      .where('user2Id', '==', req.user.uid)
      .where('status', '==', 'pending')
      .get();

    console.log('Found pending requests:', pendingMatches.size);

    const pendingRequests = [];

    pendingMatches.forEach(doc => {
      const match = doc.data();
      pendingRequests.push({
        matchId: doc.id,
        fromUser: {
          userId: match.user1Id,
          ...match.user1Profile,
        },
        compatibilityScore: match.compatibilityScore,
        sharedInterests: match.sharedInterests,
        createdAt: match.createdAt,
      });
    });

    res.json({ pendingRequests });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
});

// Get sent connection requests (requests you sent that are pending)
router.get('/sent-requests', async (req, res) => {
  try {
    const db = getDb();
    console.log('Fetching sent requests for user:', req.user.uid);

    // Find pending matches where current user is user1 (current user sent request)
    const sentMatches = await db.collection('matches')
      .where('user1Id', '==', req.user.uid)
      .where('status', '==', 'pending')
      .get();

    console.log('Found sent requests:', sentMatches.size);

    const sentRequests = [];

    sentMatches.forEach(doc => {
      const match = doc.data();
      sentRequests.push({
        matchId: doc.id,
        toUser: {
          userId: match.user2Id,
          ...match.user2Profile,
        },
        compatibilityScore: match.compatibilityScore,
        sharedInterests: match.sharedInterests,
        createdAt: match.createdAt,
      });
    });

    res.json({ sentRequests });
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({ error: 'Failed to get sent requests' });
  }
});

// Get connections list (must be before /:userId route)
router.get('/connections', async (req, res) => {
  try {
    const db = getDb();
    console.log('Fetching connections for user:', req.user.uid);

    // Query matches where current user is user1
    const matches1 = await db.collection('matches')
      .where('user1Id', '==', req.user.uid)
      .where('status', '==', 'connected')
      .get();

    // Query matches where current user is user2
    const matches2 = await db.collection('matches')
      .where('user2Id', '==', req.user.uid)
      .where('status', '==', 'connected')
      .get();

    console.log('Found matches:', { asUser1: matches1.size, asUser2: matches2.size });

    const connections = [];

    matches1.forEach(doc => {
      const match = doc.data();
      connections.push({
        matchId: doc.id,
        otherUser: {
          userId: match.user2Id,
          ...match.user2Profile,
        },
        compatibilityScore: match.compatibilityScore,
        sharedInterests: match.sharedInterests,
        connectionMetrics: match.connectionMetrics,
      });
    });

    matches2.forEach(doc => {
      const match = doc.data();
      connections.push({
        matchId: doc.id,
        otherUser: {
          userId: match.user1Id,
          ...match.user1Profile,
        },
        compatibilityScore: match.compatibilityScore,
        sharedInterests: match.sharedInterests,
        connectionMetrics: match.connectionMetrics,
      });
    });

    console.log('Total connections:', connections.length);
    res.json({ connections });
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: 'Failed to get connections' });
  }
});

// Get user profile by ID (must be AFTER specific routes like /friends, /connections)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getDb();

    // Allow users to view their own profile
    if (userId === req.user.uid) {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      return res.json({ user: userDoc.data() });
    }

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const currentUserDoc = await db.collection('users').doc(req.user.uid).get();
    const currentUser = currentUserDoc.data();

    // Check if they are friends or connections
    const areFriends = currentUser?.connections?.friends?.includes(userId);
    const areConnections = currentUser?.connections?.connections?.includes(userId);

    // Check if there's a match between these users
    const matches1 = await db.collection('matches')
      .where('user1Id', '==', req.user.uid)
      .where('user2Id', '==', userId)
      .limit(1)
      .get();

    const matches2 = await db.collection('matches')
      .where('user1Id', '==', userId)
      .where('user2Id', '==', req.user.uid)
      .limit(1)
      .get();

    // Determine match status
    let matchStatus = null;
    if (!matches1.empty) {
      matchStatus = matches1.docs[0].data().status;
    } else if (!matches2.empty) {
      matchStatus = matches2.docs[0].data().status;
    }

    // Only allow viewing profiles of friends, connections, or pending matches
    if (!matchStatus && !areFriends && !areConnections) {
      return res.status(403).json({ error: 'You can only view profiles of your connections' });
    }

    // Determine if they are friends (either from match status or legacy connections)
    const isFriend = matchStatus === 'friends' || areFriends;

    // Prepare response based on relationship
    const profile = {
      userId,
      profile: {
        name: userData.profile?.name,
        age: userData.profile?.age,
        location: userData.profile?.location,
        whyHere: userData.profile?.whyHere,
        whyHereIds: userData.profile?.whyHereIds,
        interests: userData.profile?.interests,
        preferences: userData.profile?.preferences,
        photoUrl: isFriend ? userData.profile?.photoUrl : null,
      },
      status: isFriend ? 'friends' : 'connection',
    };

    // Include extended profile for friends only
    if (isFriend) {
      profile.extendedProfile = userData.extendedProfile;
    }

    res.json({ user: profile });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const db = getDb();
    const updates = req.body;

    // Size limits for validation
    const MAX_NAME_LENGTH = 100;
    const MAX_BIO_LENGTH = 500;
    const MAX_INTERESTS = 10;
    const MAX_INTEREST_LENGTH = 50;
    const MAX_WHY_HERE_LENGTH = 500;

    // Validate profile fields
    if (updates.profile) {
      if (updates.profile.name && updates.profile.name.length > MAX_NAME_LENGTH) {
        return res.status(400).json({ error: `Name must be ${MAX_NAME_LENGTH} characters or less` });
      }
      if (updates.profile.whyHere && updates.profile.whyHere.length > MAX_WHY_HERE_LENGTH) {
        return res.status(400).json({ error: `Why here must be ${MAX_WHY_HERE_LENGTH} characters or less` });
      }
      if (updates.profile.interests) {
        if (!Array.isArray(updates.profile.interests)) {
          return res.status(400).json({ error: 'Interests must be an array' });
        }
        if (updates.profile.interests.length > MAX_INTERESTS) {
          return res.status(400).json({ error: `Maximum ${MAX_INTERESTS} interests allowed` });
        }
        for (const interest of updates.profile.interests) {
          if (typeof interest !== 'string' || interest.length > MAX_INTEREST_LENGTH) {
            return res.status(400).json({ error: `Each interest must be a string of ${MAX_INTEREST_LENGTH} characters or less` });
          }
        }
      }
    }

    // Validate extended profile
    if (updates.extendedProfile) {
      if (updates.extendedProfile.bio && updates.extendedProfile.bio.length > MAX_BIO_LENGTH) {
        return res.status(400).json({ error: `Bio must be ${MAX_BIO_LENGTH} characters or less` });
      }
    }

    // Only allow updating certain fields
    const allowedFields = ['profile', 'extendedProfile'];
    const sanitizedUpdates = {};

    for (const field of allowedFields) {
      if (updates[field]) {
        sanitizedUpdates[field] = updates[field];
      }
    }

    sanitizedUpdates.lastActive = new Date();

    await db.collection('users').doc(req.user.uid).update(sanitizedUpdates);

    // Also update stored profile data in all matches
    if (updates.profile) {
      const profileSnapshot = {
        name: updates.profile.name,
        age: updates.profile.age,
        location: updates.profile.location,
      };

      // Update matches where user is user1
      const matches1 = await db.collection('matches')
        .where('user1Id', '==', req.user.uid)
        .get();

      // Update matches where user is user2
      const matches2 = await db.collection('matches')
        .where('user2Id', '==', req.user.uid)
        .get();

      const batch = db.batch();

      matches1.forEach(doc => {
        batch.update(doc.ref, { user1Profile: profileSnapshot });
      });

      matches2.forEach(doc => {
        batch.update(doc.ref, { user2Profile: profileSnapshot });
      });

      if (matches1.size > 0 || matches2.size > 0) {
        await batch.commit();
        console.log(`Updated profile in ${matches1.size + matches2.size} matches`);
      }
    }

    const updatedDoc = await db.collection('users').doc(req.user.uid).get();

    res.json({ user: updatedDoc.data() });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;

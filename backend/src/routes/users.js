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

// Get user profile by ID
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const db = getDb();

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const currentUserDoc = await db.collection('users').doc(req.user.uid).get();
    const currentUser = currentUserDoc.data();

    // Check if they are friends
    const areFriends = currentUser?.connections?.friends?.includes(userId);

    // Prepare response based on relationship
    const profile = {
      userId,
      profile: {
        name: userData.profile?.name,
        age: userData.profile?.age,
        location: userData.profile?.location,
        whyHere: userData.profile?.whyHere,
        interests: userData.profile?.interests,
      },
      status: areFriends ? 'friends' : 'connection',
    };

    // Include extended profile for friends
    if (areFriends) {
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

    const updatedDoc = await db.collection('users').doc(req.user.uid).get();

    res.json({ user: updatedDoc.data() });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get friends list
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

// Get connections list
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

export default router;

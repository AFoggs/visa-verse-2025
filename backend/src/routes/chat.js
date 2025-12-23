import { Router } from 'express';
import { getDb } from '../config/firebase.js';
import { generateIcebreakersForUser, generateTopicPrompt } from '../services/claude.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get conversation
router.get('/:matchId', async (req, res) => {
  try {
    const { matchId } = req.params;
    const db = getDb();

    // Verify user is part of this match
    const matchDoc = await db.collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchData = matchDoc.data();
    if (matchData.user1Id !== req.user.uid && matchData.user2Id !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get conversation
    const convDoc = await db.collection('conversations').doc(matchId).get();

    if (!convDoc.exists) {
      return res.json({
        conversationId: matchId,
        messages: [],
        currentPhase: matchData.status === 'friends' ? 'friend' : 'connection',
      });
    }

    res.json({
      conversationId: matchId,
      messages: convDoc.data().messages || [],
      currentPhase: matchData.status === 'friends' ? 'friend' : 'connection',
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Send message
router.post('/:matchId/message', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { content, type = 'text' } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const db = getDb();

    // Verify user is part of this match
    const matchDoc = await db.collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchData = matchDoc.data();
    if (matchData.user1Id !== req.user.uid && matchData.user2Id !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = {
      messageId: uuidv4(),
      senderId: req.user.uid,
      content,
      type,
      timestamp: new Date().toISOString(),
    };

    // Get or create conversation
    const convDoc = await db.collection('conversations').doc(matchId).get();

    if (convDoc.exists) {
      const currentMessages = convDoc.data().messages || [];
      await db.collection('conversations').doc(matchId).update({
        messages: [...currentMessages, message],
        updatedAt: new Date(),
      });
    } else {
      await db.collection('conversations').doc(matchId).set({
        conversationId: matchId,
        participants: [matchData.user1Id, matchData.user2Id],
        messages: [message],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Update connection metrics
    await db.collection('matches').doc(matchId).update({
      'connectionMetrics.lastInteraction': new Date(),
      'connectionMetrics.sessionCount': (matchData.connectionMetrics?.sessionCount || 0) + 1,
    });

    // Emit to socket if available
    const io = req.app.get('io');
    if (io) {
      io.to(matchId).emit('new_message', {
        roomId: matchId,
        ...message,
      });
    }

    res.json({ message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get AI icebreakers (per-user, independent for each participant)
router.get('/:matchId/icebreakers', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { refresh } = req.query; // Optional: force regenerate
    const db = getDb();

    // Verify user is part of this match
    const matchDoc = await db.collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchData = matchDoc.data();
    if (matchData.user1Id !== req.user.uid && matchData.user2Id !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const currentUserId = req.user.uid;
    const otherUserId = matchData.user1Id === currentUserId ? matchData.user2Id : matchData.user1Id;
    const userKey = `icebreakers_${currentUserId}`; // Store icebreakers per-user

    // Check if icebreakers already generated for this user
    const convDoc = await db.collection('conversations').doc(matchId).get();
    if (!refresh && convDoc.exists && convDoc.data().aiSuggestions?.[userKey]?.length > 0) {
      return res.json({ icebreakers: convDoc.data().aiSuggestions[userKey] });
    }

    // Get user profiles
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    const otherUserDoc = await db.collection('users').doc(otherUserId).get();

    const currentUserProfile = currentUserDoc.data() || {};
    const otherUserProfile = otherUserDoc.data() || {};

    // Generate icebreakers personalized for THIS user to ask the other
    const icebreakers = await generateIcebreakersForUser(
      currentUserProfile,
      otherUserProfile,
      matchData.sharedInterests
    );

    // Store icebreakers for this specific user
    if (convDoc.exists) {
      await db.collection('conversations').doc(matchId).update({
        [`aiSuggestions.${userKey}`]: icebreakers,
      });
    } else {
      await db.collection('conversations').doc(matchId).set({
        conversationId: matchId,
        participants: [matchData.user1Id, matchData.user2Id],
        messages: [],
        aiSuggestions: { [userKey]: icebreakers },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    res.json({ icebreakers });
  } catch (error) {
    console.error('Get icebreakers error:', error);
    res.status(500).json({ error: 'Failed to get icebreakers' });
  }
});

// Get topic prompt for inactive conversations
router.get('/:matchId/topic-prompt', async (req, res) => {
  try {
    const { matchId } = req.params;
    const db = getDb();

    // Verify user is part of this match
    const matchDoc = await db.collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchData = matchDoc.data();
    if (matchData.user1Id !== req.user.uid && matchData.user2Id !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get recent messages for context
    const convDoc = await db.collection('conversations').doc(matchId).get();
    const messages = convDoc.exists ? convDoc.data().messages || [] : [];

    const recentContext = messages
      .slice(-5)
      .map(m => m.content)
      .join(' ');

    const prompt = await generateTopicPrompt(recentContext, matchData.sharedInterests);

    res.json({ prompt });
  } catch (error) {
    console.error('Get topic prompt error:', error);
    res.status(500).json({ error: 'Failed to get topic prompt' });
  }
});

export default router;

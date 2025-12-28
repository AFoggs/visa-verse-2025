import { Router } from 'express';
import { getDb } from '../config/firebase.js';
import { generateCompanionResponse, analyzePersonality } from '../services/claude.js';
import { extractPersonalityProfile } from '../services/personalityAnalysis.js';
import { updateCityPersonalization } from '../services/cityPersonalization.js';

const router = Router();

// Chat with companion
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const db = getDb();

    // Get user profile
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    const userProfile = userDoc.exists ? userDoc.data() : {};

    // Get conversation history
    const companionDoc = await db.collection('companionConversations').doc(req.user.uid).get();
    const conversationData = companionDoc.exists ? companionDoc.data() : { messages: [] };
    const conversationHistory = conversationData.messages || [];

    // Generate response
    const response = await generateCompanionResponse(
      req.user.uid,
      message,
      conversationHistory.slice(-10), // Last 10 messages for context
      userProfile
    );

    // Save new messages
    const newMessages = [
      ...conversationHistory,
      { role: 'user', content: message, timestamp: new Date().toISOString() },
      { role: 'assistant', content: response.message, timestamp: new Date().toISOString() },
    ];

    // Keep only last 100 messages
    const trimmedMessages = newMessages.slice(-100);

    await db.collection('companionConversations').doc(req.user.uid).set({
      userId: req.user.uid,
      messages: trimmedMessages,
      lastCheckIn: new Date(),
      detectedInterests: conversationData.detectedInterests || [],
    }, { merge: true });

    // Update personality fingerprint periodically
    if (trimmedMessages.length % 10 === 0) {
      const personality = await analyzePersonality(trimmedMessages);
      if (personality) {
        await db.collection('users').doc(req.user.uid).update({
          'companionData.personalityFingerprint': personality,
        });
      }
    }

    // Update personality profile for predictive matching every 10 messages (background task, no user notification)
    if (trimmedMessages.length % 10 === 0 && trimmedMessages.length >= 8) {
      console.log('Running personality profile analysis for predictive matching...');

      // Run in background - no user notification
      extractPersonalityProfile(
        trimmedMessages,
        userProfile.companionData?.personalityProfile
      ).then(profile => {
        if (profile) {
          db.collection('users').doc(req.user.uid).update({
            'companionData.personalityProfile': profile,
          });
          console.log('Personality profile updated for predictive matching');
        }
      }).catch(err => {
        console.error('Personality profile analysis failed:', err);
      });
    }

    res.json({
      message: response.message,
      detectedInterest: response.detectedInterest,
      detectedMobility: response.detectedMobility,
    });
  } catch (error) {
    console.error('Companion chat error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Get conversation history
router.get('/history', async (req, res) => {
  try {
    const db = getDb();
    const companionDoc = await db.collection('companionConversations').doc(req.user.uid).get();

    if (!companionDoc.exists) {
      return res.json({ messages: [] });
    }

    const data = companionDoc.data();
    res.json({ messages: data.messages || [] });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// Get companion insights
router.get('/insights', async (req, res) => {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    res.json({
      personalityFingerprint: userData.companionData?.personalityFingerprint || null,
      interests: userData.profile?.interests || [],
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// Confirm or reject detected interest
router.post('/confirm-interest', async (req, res) => {
  try {
    const { interest, confirm } = req.body;

    if (!interest || typeof confirm !== 'boolean') {
      return res.status(400).json({ error: 'Interest and confirm flag are required' });
    }

    const db = getDb();

    if (confirm) {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      const userData = userDoc.data();
      const currentInterests = userData.profile?.interests || [];

      // Add if not already present and under limit
      if (!currentInterests.includes(interest) && currentInterests.length < 10) {
        const newInterests = [...currentInterests, interest];
        await db.collection('users').doc(req.user.uid).update({
          'profile.interests': newInterests,
        });

        // Trigger city personalization refresh for any viewed cities
        const cityDiscovery = userData.cityDiscovery || {};
        Object.keys(cityDiscovery).forEach(cityId => {
          updateCityPersonalization(req.user.uid, cityId, newInterests)
            .catch(err => console.error('City personalization refresh failed:', err));
        });
      }
    }

    // Update companion conversation to track detected interests
    const companionDoc = await db.collection('companionConversations').doc(req.user.uid).get();
    const companionData = companionDoc.exists ? companionDoc.data() : {};
    const detectedInterests = companionData.detectedInterests || [];

    await db.collection('companionConversations').doc(req.user.uid).update({
      detectedInterests: [
        ...detectedInterests,
        { interest, confirmed: confirm, timestamp: new Date() },
      ],
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Confirm interest error:', error);
    res.status(500).json({ error: 'Failed to confirm interest' });
  }
});

// Confirm or update detected mobility
router.post('/confirm-mobility', async (req, res) => {
  try {
    const { mobility, confirm } = req.body;

    if (!mobility || typeof confirm !== 'boolean') {
      return res.status(400).json({ error: 'Mobility data and confirm flag are required' });
    }

    const db = getDb();

    if (confirm) {
      // Validate the mobility data
      const validModes = ['LOCAL', 'TRAVELER'];
      if (!validModes.includes(mobility.mode)) {
        return res.status(400).json({ error: 'Invalid mode' });
      }

      if (!mobility.country || typeof mobility.country !== 'string') {
        return res.status(400).json({ error: 'Country is required' });
      }

      // Build the mobility object
      const mobilityUpdate = {
        mode: mobility.mode,
        area: {
          country: mobility.country.trim(),
          city: mobility.city ? mobility.city.trim() : '',
        },
        updatedAt: new Date(),
      };

      // Preserve existing goal and connectionIntent if not provided
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      const existingMobility = userDoc.data()?.mobility || {};

      await db.collection('users').doc(req.user.uid).update({
        mobility: {
          ...existingMobility,
          ...mobilityUpdate,
        },
      });
    }

    // Track detected mobility in companion conversation
    const companionDoc = await db.collection('companionConversations').doc(req.user.uid).get();
    const companionData = companionDoc.exists ? companionDoc.data() : {};
    const detectedMobility = companionData.detectedMobility || [];

    await db.collection('companionConversations').doc(req.user.uid).update({
      detectedMobility: [
        ...detectedMobility,
        { ...mobility, confirmed: confirm, timestamp: new Date() },
      ],
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Confirm mobility error:', error);
    res.status(500).json({ error: 'Failed to confirm mobility' });
  }
});

export default router;

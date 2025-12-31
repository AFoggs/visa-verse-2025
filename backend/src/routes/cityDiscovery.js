import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import {
  generatePersonalizedCityContent,
  findRelevantLocalContacts,
  getOrCreateCityContent,
} from '../services/cityPersonalization.js';
import { getDb } from '../config/firebase.js';

const router = Router();

// Debug: Log all requests to city discovery routes
router.use((req, res, next) => {
  console.log(`[CityDiscovery] ${req.method} ${req.path} - User: ${req.user?.uid || 'unknown'}`);
  next();
});

/**
 * GET /api/city-discovery/cities/available
 * Get list of available cities
 * NOTE: This must come BEFORE /:cityId routes to avoid matching "cities" as a cityId
 */
router.get('/cities/available', async (req, res) => {
  try {
    console.log('[CityDiscovery] Getting available cities...');
    const db = getDb();
    const citiesQuery = await db.collection('cityContent').get();

    const cities = [];
    citiesQuery.forEach(doc => {
      const data = doc.data();
      cities.push({
        cityId: doc.id,
        cityName: data.cityName,
        country: data.country,
      });
    });

    console.log(`[CityDiscovery] Found ${cities.length} cities`);
    res.json({ cities });
  } catch (error) {
    console.error('[CityDiscovery] Get cities error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to get cities', message: error.message });
  }
});

/**
 * POST /api/city-discovery/cities/create
 * Create a new city (admin or auto-create)
 * NOTE: This must come BEFORE /:cityId routes
 */
router.post('/cities/create', async (req, res) => {
  try {
    const { cityName, country } = req.body;

    if (!cityName || !country) {
      return res.status(400).json({ error: 'City name and country are required' });
    }

    // Create city ID from name and country
    const cityId = `${cityName.toLowerCase().replace(/\s+/g, '-')}-${country.toLowerCase().replace(/\s+/g, '-')}`;

    const cityContent = await getOrCreateCityContent(cityId, cityName, country);

    res.json({ cityId, cityContent });
  } catch (error) {
    console.error('Create city error:', error);
    res.status(500).json({ error: 'Failed to create city' });
  }
});

/**
 * GET /api/city-discovery/:cityId
 * Get personalized city content for user
 */
router.get('/:cityId', async (req, res) => {
  try {
    const { cityId } = req.params;
    const userId = req.user.uid;

    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Check if city content exists, if not return error
    const cityDoc = await db.collection('cityContent').doc(cityId).get();
    if (!cityDoc.exists) {
      return res.status(404).json({ error: 'City not found' });
    }

    const cityData = cityDoc.data();

    // Check if we have cached personalized content
    const existing = userData?.cityDiscovery?.[cityId]?.personalizedContent;
    const cacheAge = existing?.generatedAt ?
      Date.now() - new Date(existing.generatedAt).getTime() :
      Infinity;

    // Use cached if less than 7 days old
    if (existing && cacheAge < 7 * 24 * 60 * 60 * 1000) {
      return res.json({
        content: existing,
        cityInfo: {
          cityName: cityData.cityName,
          country: cityData.country,
          baseContent: cityData.baseContent,
        },
        cached: true
      });
    }

    // Generate fresh personalized content
    const content = await generatePersonalizedCityContent(userId, cityId);

    res.json({
      content,
      cityInfo: {
        cityName: cityData.cityName,
        country: cityData.country,
        baseContent: cityData.baseContent,
      },
      cached: false
    });
  } catch (error) {
    console.error('City discovery error:', error);
    res.status(500).json({ error: 'Failed to generate city content' });
  }
});

/**
 * POST /api/city-discovery/:cityId/generate
 * Force regenerate personalized content
 */
router.post('/:cityId/generate', async (req, res) => {
  try {
    const { cityId } = req.params;
    const userId = req.user.uid;

    const content = await generatePersonalizedCityContent(userId, cityId);

    res.json({ content, regenerated: true });
  } catch (error) {
    console.error('City regeneration error:', error);
    res.status(500).json({ error: 'Failed to regenerate city content' });
  }
});

/**
 * GET /api/city-discovery/:cityId/locals
 * Find relevant local contacts for city
 */
router.get('/:cityId/locals', async (req, res) => {
  try {
    const { cityId } = req.params;
    const userId = req.user.uid;

    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();
    const interests = userDoc.data()?.profile?.interests || [];

    const locals = await findRelevantLocalContacts(userId, cityId, interests);

    res.json({ locals });
  } catch (error) {
    console.error('Find locals error:', error);
    res.status(500).json({ error: 'Failed to find local contacts' });
  }
});

/**
 * POST /api/city-discovery/:cityId/bookmark
 * Bookmark a place or activity
 */
router.post('/:cityId/bookmark', async (req, res) => {
  try {
    const { cityId } = req.params;
    const { item } = req.body;
    const userId = req.user.uid;

    if (!item) {
      return res.status(400).json({ error: 'Item is required' });
    }

    const db = getDb();
    await db.collection('users').doc(userId).update({
      [`cityDiscovery.${cityId}.bookmarks`]: FieldValue.arrayUnion(item)
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Bookmark error:', error);
    res.status(500).json({ error: 'Failed to bookmark' });
  }
});

/**
 * DELETE /api/city-discovery/:cityId/bookmark
 * Remove a bookmark
 */
router.delete('/:cityId/bookmark', async (req, res) => {
  try {
    const { cityId } = req.params;
    const { item } = req.body;
    const userId = req.user.uid;

    if (!item) {
      return res.status(400).json({ error: 'Item is required' });
    }

    const db = getDb();
    await db.collection('users').doc(userId).update({
      [`cityDiscovery.${cityId}.bookmarks`]: FieldValue.arrayRemove(item)
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Remove bookmark error:', error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

/**
 * GET /api/city-discovery/:cityId/bookmarks
 * Get user's bookmarks for a city
 */
router.get('/:cityId/bookmarks', async (req, res) => {
  try {
    const { cityId } = req.params;
    const userId = req.user.uid;

    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();
    const bookmarks = userDoc.data()?.cityDiscovery?.[cityId]?.bookmarks || [];

    res.json({ bookmarks });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    res.status(500).json({ error: 'Failed to get bookmarks' });
  }
});

/**
 * PUT /api/city-discovery/:cityId/notes
 * Add personal notes about city
 */
router.put('/:cityId/notes', async (req, res) => {
  try {
    const { cityId } = req.params;
    const { notes } = req.body;
    const userId = req.user.uid;

    const db = getDb();
    await db.collection('users').doc(userId).update({
      [`cityDiscovery.${cityId}.notes`]: notes || ''
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Notes error:', error);
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

/**
 * GET /api/city-discovery/:cityId/notes
 * Get user's notes for a city
 */
router.get('/:cityId/notes', async (req, res) => {
  try {
    const { cityId } = req.params;
    const userId = req.user.uid;

    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();
    const notes = userDoc.data()?.cityDiscovery?.[cityId]?.notes || '';

    res.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to get notes' });
  }
});

export default router;

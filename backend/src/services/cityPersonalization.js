import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../config/firebase.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate personalized city content based on user's profile and AI companion insights
 */
export async function generatePersonalizedCityContent(userId, cityId) {
  const db = getDb();

  // Get user data
  const userDoc = await db.collection('users').doc(userId).get();
  const user = userDoc.data();

  // Get base city content
  const cityDoc = await db.collection('cityContent').doc(cityId).get();
  if (!cityDoc.exists) {
    throw new Error('City content not found');
  }
  const cityContent = cityDoc.data();

  // Extract user interests and personality
  const interests = user.profile?.interests || [];
  const detectedSignals = user.companionData?.detectedSignals || {};
  const personality = user.companionData?.personalityProfile || {};
  const mobility = user.mobility || {};

  // Build user profile for AI
  const userProfile = {
    interests,
    activityPreference: detectedSignals.activityPreference?.type || 'mixed',
    socialStyle: detectedSignals.socialStyle?.type || 'unknown',
    culturalCuriosity: detectedSignals.culturalInterests?.curiosity || 'medium',
    budget: mobility.budget || 'moderate',
    travelReason: mobility.travelReason,
    connectionIntent: mobility.connectionIntent,
    whyHere: user.profile?.whyHere,
  };

  // Generate personalized content
  const personalizedContent = await generateAIPersonalization(
    userProfile,
    cityContent,
    personality
  );

  // Store for caching
  await db.collection('users').doc(userId).update({
    [`cityDiscovery.${cityId}.personalizedContent`]: {
      ...personalizedContent,
      generatedAt: new Date(),
      basedOnInterests: interests,
    },
    [`cityDiscovery.${cityId}.viewedAt`]: new Date(),
  });

  return personalizedContent;
}

async function generateAIPersonalization(userProfile, cityContent, personality) {
  const prompt = `You're creating a personalized city guide for a traveler. Make it feel tailored and relevant.

CITY: ${cityContent.cityName}, ${cityContent.country}

USER PROFILE:
- Interests: ${userProfile.interests.join(', ') || 'Not specified'}
- Activity preference: ${userProfile.activityPreference}
- Social style: ${userProfile.socialStyle}
- Cultural curiosity: ${userProfile.culturalCuriosity}
- Travel reason: ${userProfile.travelReason || 'Not specified'}
- Why here: ${userProfile.whyHere || 'Not specified'}

AVAILABLE CONTENT:
Neighborhoods: ${cityContent.baseContent?.neighborhoods?.map(n => n.name).join(', ') || 'Various neighborhoods'}
Categories: ${cityContent.categories?.map(c => c.name).join(', ') || 'Food, Culture, Nightlife, Outdoor'}
Cultural notes: ${cityContent.culturalNotes?.slice(0, 3).join('; ') || 'Rich local culture'}

Generate a personalized city discovery experience. Return ONLY valid JSON:

{
  "customIntro": "A warm, personalized 2-3 sentence intro that connects their interests to the city",
  "recommendedNeighborhoods": [
    {
      "name": "neighborhood name",
      "whyMatch": "why this fits their interests/style",
      "highlights": ["specific thing 1", "specific thing 2"]
    }
  ],
  "mustDoActivities": [
    {
      "activity": "specific activity",
      "whyRelevant": "how it connects to their interests",
      "category": "food|culture|outdoor|nightlife|etc"
    }
  ],
  "hiddenGems": [
    {
      "place": "name",
      "description": "what makes it special for them",
      "interest": "which of their interests it matches"
    }
  ],
  "practicalTips": [
    "Tip tailored to their travel style/reason"
  ],
  "localConnectionSuggestions": "What types of locals they should connect with based on their goals"
}

Make recommendations SPECIFIC and PERSONAL. Don't be generic. Connect directly to their stated interests.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    let content = response.content[0].text.trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    return JSON.parse(content);
  } catch (error) {
    console.error('AI personalization failed:', error);
    // Return fallback content
    return generateFallbackContent(userProfile, cityContent);
  }
}

function generateFallbackContent(userProfile, cityContent) {
  const cityName = cityContent.cityName || 'this city';
  const interests = userProfile.interests.slice(0, 3).join(', ') || 'exploring new places';

  return {
    customIntro: `Welcome to ${cityName}! Based on your interest in ${interests}, we've curated some recommendations to help you make the most of your visit.`,
    recommendedNeighborhoods: cityContent.baseContent?.neighborhoods?.slice(0, 3).map(n => ({
      name: n.name,
      whyMatch: n.description || 'A great area to explore',
      highlights: [n.vibe || 'Unique atmosphere', n.priceRange || 'Various options']
    })) || [],
    mustDoActivities: cityContent.categories?.slice(0, 4).map(c => ({
      activity: c.highlights?.[0] || c.name,
      whyRelevant: c.description || 'Popular among visitors',
      category: c.id || 'general'
    })) || [],
    hiddenGems: [{
      place: 'Local favorites',
      description: 'Ask locals through the app for personalized recommendations',
      interest: interests.split(',')[0] || 'exploration'
    }],
    practicalTips: cityContent.localTips?.slice(0, 3) || [
      'Connect with locals for insider tips',
      'Explore beyond the tourist areas',
      'Try the local cuisine'
    ],
    localConnectionSuggestions: `Connect with locals who share your interest in ${interests} to get authentic recommendations.`
  };
}

/**
 * Update personalized content when user's interests/profile changes
 */
export async function updateCityPersonalization(userId, cityId, updatedInterests) {
  const db = getDb();
  const userDoc = await db.collection('users').doc(userId).get();
  const existing = userDoc.data()?.cityDiscovery?.[cityId]?.personalizedContent;

  if (!existing) {
    return generatePersonalizedCityContent(userId, cityId);
  }

  const existingInterests = new Set(existing.basedOnInterests || []);
  const newInterests = new Set(updatedInterests);

  // Calculate change
  const added = [...newInterests].filter(i => !existingInterests.has(i));
  const removed = [...existingInterests].filter(i => !newInterests.has(i));

  // Regenerate if >30% change
  const changePercent = (added.length + removed.length) / Math.max(existingInterests.size, 1);

  if (changePercent > 0.3) {
    console.log(`Regenerating city content due to ${Math.round(changePercent * 100)}% interest change`);
    return generatePersonalizedCityContent(userId, cityId);
  }

  return existing;
}

/**
 * Match locals who can provide relevant city insights
 */
export async function findRelevantLocalContacts(userId, cityId, userInterests) {
  const db = getDb();

  // Get city data
  const cityDoc = await db.collection('cityContent').doc(cityId).get();
  if (!cityDoc.exists) {
    return [];
  }
  const cityData = cityDoc.data();

  // Find locals in this city who share interests
  const localsQuery = await db.collection('users')
    .where('mobility.mode', '==', 'LOCAL')
    .where('mobility.area.city', '==', cityData.cityName)
    .limit(50)
    .get();

  const relevantLocals = [];

  localsQuery.forEach(doc => {
    if (doc.id === userId) return; // Skip self

    const local = { odloc: doc.id, ...doc.data() };
    const localInterests = local.profile?.interests || [];
    const sharedInterests = userInterests.filter(i => localInterests.includes(i));

    if (sharedInterests.length >= 2) {
      relevantLocals.push({
        userId: doc.id,
        name: local.profile?.name,
        sharedInterests,
        expertise: local.companionData?.detectedSignals?.expertiseAreas || [],
      });
    }
  });

  // Sort by shared interests
  relevantLocals.sort((a, b) => b.sharedInterests.length - a.sharedInterests.length);

  return relevantLocals.slice(0, 5);
}

/**
 * Get or create base city content
 */
export async function getOrCreateCityContent(cityId, cityName, country) {
  const db = getDb();
  const cityDoc = await db.collection('cityContent').doc(cityId).get();

  if (cityDoc.exists) {
    return cityDoc.data();
  }

  // Create basic city content structure
  const baseContent = {
    cityId,
    cityName,
    country,
    baseContent: {
      overview: `Welcome to ${cityName}, ${country}`,
      climate: 'Check local weather forecasts',
      transportation: 'Various public transit options available',
      cost_of_living: 'Varies by area',
      neighborhoods: [],
      essentials: {
        emergency: 'Local emergency services',
        healthcare: 'Multiple healthcare options',
        banking: 'Major banks available',
        communication: 'Good mobile coverage',
      }
    },
    categories: [
      { id: 'food', name: 'Food & Dining', description: 'Local cuisine and restaurants', highlights: [], tags: ['food', 'restaurants', 'cuisine'] },
      { id: 'culture', name: 'Culture & Arts', description: 'Museums, galleries, and cultural sites', highlights: [], tags: ['culture', 'art', 'museums'] },
      { id: 'outdoor', name: 'Outdoor Activities', description: 'Parks, nature, and outdoor fun', highlights: [], tags: ['outdoor', 'nature', 'parks'] },
      { id: 'nightlife', name: 'Nightlife', description: 'Bars, clubs, and evening entertainment', highlights: [], tags: ['nightlife', 'bars', 'entertainment'] },
    ],
    localTips: [],
    culturalNotes: [],
    lastUpdated: new Date(),
  };

  await db.collection('cityContent').doc(cityId).set(baseContent);

  return baseContent;
}

import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../config/firebase.js';

// Lazy initialization of Anthropic client
let anthropicClient = null;

function getAnthropicClient() {
  if (!anthropicClient) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

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
  const cityName = cityContent.cityName;
  const country = cityContent.country;
  const interestsList = userProfile.interests.length > 0 ? userProfile.interests.join(', ') : 'general exploration, meeting locals, experiencing culture';

  // First, search for real city information
  const searchPrompt = `Search for current information about ${cityName}, ${country} including:
1. Popular neighborhoods and districts for visitors
2. Top-rated restaurants and food experiences
3. Cultural attractions and activities
4. Hidden gems and local favorites
5. Practical travel tips

Focus on finding specific place names, addresses, and links where available.`;

  try {
    // Use web search to get real, current information
    const anthropic = getAnthropicClient();
    const searchResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      tools: [{
        type: 'web_search',
        name: 'web_search',
        max_uses: 5
      }],
      messages: [{
        role: 'user',
        content: searchPrompt
      }]
    });

    // Extract search results
    let searchResults = '';
    for (const block of searchResponse.content) {
      if (block.type === 'text') {
        searchResults += block.text + '\n';
      }
    }

    // Now generate personalized recommendations based on search results
    const personalizationPrompt = `Based on this research about ${cityName}, ${country}:

${searchResults}

Create a personalized city guide for a traveler with these preferences:
- Interests: ${interestsList}
- Activity preference: ${userProfile.activityPreference}
- Social style: ${userProfile.socialStyle}
- Travel reason: ${userProfile.travelReason || 'exploring and connecting with locals'}
- Why here: ${userProfile.whyHere || 'looking for authentic experiences'}

Return ONLY valid JSON with this structure:
{
  "customIntro": "A warm 2-3 sentence intro connecting their interests to ${cityName}",
  "recommendedNeighborhoods": [
    {
      "name": "Real neighborhood name",
      "whyMatch": "Why this fits their interests",
      "highlights": ["Specific place or attraction", "Another highlight"],
      "link": "Google Maps or travel guide link if available"
    }
  ],
  "mustDoActivities": [
    {
      "activity": "Specific restaurant, attraction, or experience name",
      "whyRelevant": "How it connects to their interests",
      "category": "food|culture|outdoor|nightlife|social",
      "address": "Address if known",
      "link": "Website or Google Maps link if available"
    }
  ],
  "hiddenGems": [
    {
      "place": "Specific lesser-known spot",
      "description": "What makes it special",
      "interest": "Which interest it matches",
      "link": "Link if available"
    }
  ],
  "practicalTips": [
    "Specific practical tip for ${cityName}"
  ],
  "localConnectionSuggestions": "What types of locals to connect with"
}

REQUIREMENTS:
- Use REAL place names from the search results
- Include 3 neighborhoods, 4-5 activities, 3 hidden gems, 3 tips
- Add links (Google Maps, TripAdvisor, official websites) where possible
- Be specific - no generic placeholders`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      temperature: 0.5,
      messages: [{
        role: 'user',
        content: personalizationPrompt
      }]
    });

    let content = response.content[0].text.trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    return JSON.parse(content);
  } catch (error) {
    console.error('AI personalization with search failed:', error);
    // Try without web search as fallback
    return generateAIFallback(userProfile, cityContent);
  }
}

async function generateAIFallback(userProfile, cityContent) {
  const cityName = cityContent.cityName;
  const country = cityContent.country;
  const interestsList = userProfile.interests.length > 0 ? userProfile.interests.join(', ') : 'general exploration, meeting locals, experiencing culture';

  const prompt = `You're creating a personalized city guide for ${cityName}, ${country}. Use your knowledge to provide SPECIFIC, REAL recommendations.

USER: Interests in ${interestsList}, ${userProfile.activityPreference} activities, traveling for ${userProfile.travelReason || 'exploration'}.

Return ONLY valid JSON:
{
  "customIntro": "2-3 sentence personalized intro",
  "recommendedNeighborhoods": [
    {"name": "Real neighborhood", "whyMatch": "Why it fits", "highlights": ["Specific thing 1", "Thing 2"], "link": "https://maps.google.com/?q=NEIGHBORHOOD+${encodeURIComponent(cityName)}"}
  ],
  "mustDoActivities": [
    {"activity": "Real place/activity", "whyRelevant": "Connection to interests", "category": "food|culture|outdoor|nightlife|social", "link": "Search link"}
  ],
  "hiddenGems": [
    {"place": "Real lesser-known spot", "description": "Why special", "interest": "matching interest"}
  ],
  "practicalTips": ["Specific tip 1", "Tip 2", "Tip 3"],
  "localConnectionSuggestions": "Types of locals to connect with"
}

Provide 3 neighborhoods, 4 activities, 3 gems, 3 tips. Use REAL places in ${cityName}.`;

  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2500,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }]
    });

    let content = response.content[0].text.trim();
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    return JSON.parse(content);
  } catch (error) {
    console.error('AI fallback failed:', error);
    return generateFallbackContent(userProfile, cityContent);
  }
}

function generateFallbackContent(userProfile, cityContent) {
  const cityName = cityContent.cityName || 'this city';
  const country = cityContent.country || '';
  const interests = userProfile.interests.slice(0, 3).join(', ') || 'exploring new places';

  return {
    customIntro: `Welcome to ${cityName}${country ? `, ${country}` : ''}! Based on your interest in ${interests}, we're preparing personalized recommendations. Connect with locals through the app to discover hidden gems and authentic experiences.`,
    recommendedNeighborhoods: [
      {
        name: 'City Center',
        whyMatch: 'The heart of the city with easy access to major attractions',
        highlights: ['Central location', 'Walkable to main sites']
      },
      {
        name: 'Local Quarter',
        whyMatch: 'Where residents live and hang out - great for authentic experiences',
        highlights: ['Local restaurants', 'Neighborhood cafes']
      },
      {
        name: 'Arts District',
        whyMatch: 'Creative hub with galleries, street art, and unique venues',
        highlights: ['Cultural events', 'Independent shops']
      }
    ],
    mustDoActivities: [
      {
        activity: 'Local food tour or market visit',
        whyRelevant: 'Experience authentic local cuisine and food culture',
        category: 'food'
      },
      {
        activity: 'Walking tour of historic areas',
        whyRelevant: 'Learn the city\'s story and discover hidden spots',
        category: 'culture'
      },
      {
        activity: 'Visit a local park or waterfront',
        whyRelevant: 'See where locals relax and enjoy outdoor time',
        category: 'outdoor'
      },
      {
        activity: 'Evening in a local neighborhood bar or cafe',
        whyRelevant: 'Meet locals in a relaxed social setting',
        category: 'social'
      }
    ],
    hiddenGems: [
      {
        place: 'Ask a local!',
        description: 'The best hidden gems come from people who live here. Use the Locals tab to connect with residents who share your interests.',
        interest: interests.split(',')[0]?.trim() || 'exploration'
      },
      {
        place: 'Neighborhood breakfast spots',
        description: 'Skip the hotel breakfast and find where locals grab their morning coffee',
        interest: 'food'
      },
      {
        place: 'Local community events',
        description: 'Check local boards and apps for markets, meetups, and cultural events',
        interest: 'culture'
      }
    ],
    practicalTips: [
      'Download offline maps before exploring neighborhoods',
      'Learn a few local phrases - it goes a long way',
      'Ask your connections in the app for their personal recommendations'
    ],
    localConnectionSuggestions: `Connect with locals who share your interest in ${interests}. They can share insider tips, recommend their favorite spots, and help you experience ${cityName} like a resident.`
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
 * Find locals who are either connected or potential matches
 * Only shows: 1) Existing connections in this city, 2) Suggested matches (potential connections)
 */
export async function findRelevantLocalContacts(userId, cityId, userInterests) {
  const db = getDb();

  // Get city data
  const cityDoc = await db.collection('cityContent').doc(cityId).get();
  if (!cityDoc.exists) {
    return [];
  }
  const cityData = cityDoc.data();

  // Get user's existing connections and matches
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();
  const connections = userData?.connections || [];
  const friends = userData?.friends || [];
  const connectedUserIds = new Set([...connections, ...friends]);

  // Get pending matches (users who have sent connection requests or user has sent to)
  const matchesQuery = await db.collection('matches')
    .where('users', 'array-contains', userId)
    .get();

  const pendingMatchIds = new Set();
  matchesQuery.forEach(doc => {
    const match = doc.data();
    if (match.status === 'pending' || match.status === 'connected') {
      match.users.forEach(uid => {
        if (uid !== userId) pendingMatchIds.add(uid);
      });
    }
  });

  const relevantLocals = [];

  // First, find connected locals in this city
  for (const connectedId of connectedUserIds) {
    const connectedDoc = await db.collection('users').doc(connectedId).get();
    if (!connectedDoc.exists) continue;

    const connectedUser = connectedDoc.data();
    const isLocal = connectedUser.mobility?.mode === 'LOCAL';
    const isInCity = connectedUser.mobility?.area?.city?.toLowerCase() === cityData.cityName.toLowerCase();

    if (isLocal && isInCity) {
      const localInterests = connectedUser.profile?.interests || [];
      const sharedInterests = userInterests.filter(i => localInterests.includes(i));

      relevantLocals.push({
        userId: connectedId,
        name: connectedUser.profile?.name,
        sharedInterests,
        connectionStatus: friends.includes(connectedId) ? 'friend' : 'connected',
        canMessage: true,
      });
    }
  }

  // Then, find potential matches (locals they haven't connected with yet)
  const localsQuery = await db.collection('users')
    .where('mobility.mode', '==', 'LOCAL')
    .where('mobility.area.city', '==', cityData.cityName)
    .limit(30)
    .get();

  localsQuery.forEach(doc => {
    if (doc.id === userId) return; // Skip self
    if (connectedUserIds.has(doc.id)) return; // Already added as connection

    const local = doc.data();
    const localInterests = local.profile?.interests || [];
    const sharedInterests = userInterests.filter(i => localInterests.includes(i));

    // Only suggest if they have at least 2 shared interests
    if (sharedInterests.length >= 2) {
      relevantLocals.push({
        userId: doc.id,
        name: local.profile?.name,
        sharedInterests,
        connectionStatus: pendingMatchIds.has(doc.id) ? 'pending' : 'suggested',
        canMessage: false,
      });
    }
  });

  // Sort: connected first, then by shared interests
  relevantLocals.sort((a, b) => {
    // Connected users first
    const aConnected = a.connectionStatus === 'friend' || a.connectionStatus === 'connected';
    const bConnected = b.connectionStatus === 'friend' || b.connectionStatus === 'connected';
    if (aConnected && !bConnected) return -1;
    if (!aConnected && bConnected) return 1;
    // Then by shared interests
    return b.sharedInterests.length - a.sharedInterests.length;
  });

  return relevantLocals.slice(0, 10);
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

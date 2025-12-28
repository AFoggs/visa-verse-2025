import Anthropic from '@anthropic-ai/sdk';

// Lazy initialization to ensure env vars are loaded
let anthropic = null;

function getClient() {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

/**
 * Extract Big Five personality traits and communication patterns
 * from companion conversation history
 */
export async function extractPersonalityProfile(conversationHistory, currentProfile = null) {
  if (conversationHistory.length < 8) {
    return currentProfile;
  }

  // Get user messages only
  const userMessages = conversationHistory
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join('\n\n');

  const analysisPrompt = `Analyze this user's conversation style and personality. Extract ONLY what is clearly evident.

User messages:
${userMessages}

Return a JSON object with these dimensions (score 0-100, or null if unclear):

{
  "bigFive": {
    "openness": 0-100,
    "conscientiousness": 0-100,
    "extraversion": 0-100,
    "agreeableness": 0-100,
    "neuroticism": 0-100,
    "confidence": 0-100
  },
  "communicationStyle": {
    "averageResponseLength": "concise"|"moderate"|"verbose",
    "formalityLevel": 0-100,
    "humorFrequency": 0-100,
    "emojiUsage": 0-100,
    "questionAskerScore": 0-100,
    "selfDisclosureLevel": 0-100,
    "topicDiversity": 0-100
  },
  "conversationalPreferences": {
    "prefersDeepTopics": 0-100,
    "energyLevel": 0-100,
    "emotionalExpressiveness": 0-100,
    "directnessLevel": 0-100
  },
  "insights": {
    "communicationStrengths": ["strength1", "strength2"],
    "conversationStyle": "brief description",
    "idealMatchType": "brief description"
  }
}

Only include scores you're confident about. Return null for unclear traits.`;

  try {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: analysisPrompt,
      }],
    });

    let analysis = response.content[0].text.trim();
    analysis = analysis.replace(/```json\n?/g, '').replace(/```\n?/g, '');

    const parsed = JSON.parse(analysis);

    // Merge with existing profile if available
    return mergePersonalityData(currentProfile, parsed);
  } catch {
    // Silently return existing profile on failure
    return currentProfile;
  }
}

function mergePersonalityData(existing, newData) {
  if (!existing) {
    return {
      ...newData,
      analyzedAt: new Date().toISOString(),
      conversationsAnalyzed: 1,
    };
  }

  // Weighted merge: 70% existing, 30% new
  const weight = 0.7;

  return {
    bigFive: mergeBigFive(existing.bigFive, newData.bigFive, weight),
    communicationStyle: mergeCommunicationStyle(existing.communicationStyle, newData.communicationStyle, weight),
    conversationalPreferences: mergePreferences(existing.conversationalPreferences, newData.conversationalPreferences, weight),
    insights: newData.insights, // Always use latest insights
    analyzedAt: new Date().toISOString(),
    conversationsAnalyzed: (existing.conversationsAnalyzed || 0) + 1,
  };
}

function mergeBigFive(existing, updated, weight) {
  if (!existing) return updated;
  if (!updated) return existing;

  const merged = {};
  for (const trait in updated) {
    if (updated[trait] !== null && existing[trait] !== null) {
      merged[trait] = Math.round(existing[trait] * weight + updated[trait] * (1 - weight));
    } else {
      merged[trait] = updated[trait] || existing[trait];
    }
  }
  return merged;
}

function mergeCommunicationStyle(existing, updated, weight) {
  if (!existing) return updated;
  if (!updated) return existing;

  const merged = { ...existing };

  // Merge numeric scores
  for (const key in updated) {
    if (typeof updated[key] === 'number' && typeof existing[key] === 'number') {
      merged[key] = Math.round(existing[key] * weight + updated[key] * (1 - weight));
    } else if (updated[key] !== null) {
      merged[key] = updated[key];
    }
  }

  return merged;
}

function mergePreferences(existing, updated, weight) {
  return mergeCommunicationStyle(existing, updated, weight);
}

/**
 * Calculate conversation quality prediction
 * Higher score = more likely to have engaging, flowing conversations
 */
export function predictConversationQuality(user1Personality, user2Personality) {
  if (!user1Personality || !user2Personality) {
    return 50; // Neutral if no data
  }

  const p1 = user1Personality;
  const p2 = user2Personality;

  let score = 0;
  let factors = 0;

  // Communication style compatibility
  if (p1.communicationStyle && p2.communicationStyle) {
    const c1 = p1.communicationStyle;
    const c2 = p2.communicationStyle;

    // Response length compatibility (similar is better)
    if (c1.averageResponseLength === c2.averageResponseLength) {
      score += 85;
    } else if (
      c1.averageResponseLength === 'moderate' || c2.averageResponseLength === 'moderate'
    ) {
      score += 70; // Moderate can adapt to either
    } else {
      score += 50; // Concise + verbose might struggle
    }
    factors++;

    // Question asker + good listener = ideal pairing
    if (c1.questionAskerScore && c2.selfDisclosureLevel &&
        c2.questionAskerScore && c1.selfDisclosureLevel) {
      const balanceScore = Math.min(
        c1.questionAskerScore + c2.selfDisclosureLevel,
        c2.questionAskerScore + c1.selfDisclosureLevel
      );
      score += Math.min(balanceScore, 100);
      factors++;
    }

    // Similar formality levels
    if (c1.formalityLevel != null && c2.formalityLevel != null) {
      score += 100 - Math.abs(c1.formalityLevel - c2.formalityLevel) * 0.6;
      factors++;
    }

    // Humor compatibility
    if (c1.humorFrequency != null && c2.humorFrequency != null) {
      score += 100 - Math.abs(c1.humorFrequency - c2.humorFrequency);
      factors++;
    }
  }

  // Conversational preference alignment
  if (p1.conversationalPreferences && p2.conversationalPreferences) {
    const pref1 = p1.conversationalPreferences;
    const pref2 = p2.conversationalPreferences;

    // Deep topic preference (both like deep OR both like light)
    if (pref1.prefersDeepTopics != null && pref2.prefersDeepTopics != null) {
      score += 100 - Math.abs(pref1.prefersDeepTopics - pref2.prefersDeepTopics) * 0.7;
      factors++;
    }

    // Energy level compatibility
    if (pref1.energyLevel != null && pref2.energyLevel != null) {
      score += 100 - Math.abs(pref1.energyLevel - pref2.energyLevel) * 0.5;
      factors++;
    }

    // Emotional expressiveness (moderate difference OK)
    if (pref1.emotionalExpressiveness != null && pref2.emotionalExpressiveness != null) {
      score += 100 - Math.abs(pref1.emotionalExpressiveness - pref2.emotionalExpressiveness) * 0.4;
      factors++;
    }
  }

  // Big Five compatibility for conversation quality
  if (p1.bigFive && p2.bigFive) {
    const b1 = p1.bigFive;
    const b2 = p2.bigFive;

    // Openness similarity (both like new ideas or both prefer familiar)
    if (b1.openness != null && b2.openness != null) {
      score += 100 - Math.abs(b1.openness - b2.openness);
      factors++;
    }

    // Agreeableness (both agreeable = smooth conversations)
    if (b1.agreeableness != null && b2.agreeableness != null) {
      score += (b1.agreeableness + b2.agreeableness) / 2;
      factors++;
    }

    // Extraversion (similar is better for conversation flow)
    if (b1.extraversion != null && b2.extraversion != null) {
      score += 100 - Math.abs(b1.extraversion - b2.extraversion) * 0.7;
      factors++;
    }
  }

  return factors > 0 ? Math.min(Math.round(score / factors), 100) : 50;
}

export default {
  extractPersonalityProfile,
  predictConversationQuality,
};

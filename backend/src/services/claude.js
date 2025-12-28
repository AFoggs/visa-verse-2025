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

// Dynamic response styles to add variety
const RESPONSE_STYLES = [
  'Start with a brief reaction or acknowledgment',
  'Lead with a thoughtful question',
  'Share a relevant personal-style observation',
  'Use a bit of gentle humor or playfulness',
  'Be warmly curious and exploratory',
  'Offer an encouraging perspective',
  'Connect their thought to something broader',
  'Express genuine interest with follow-up',
];

// Mood/tone variations
const MOOD_VARIATIONS = [
  'warm and cozy',
  'gently curious',
  'playfully engaged',
  'thoughtfully reflective',
  'enthusiastically interested',
  'calmly supportive',
  'lighthearted and friendly',
];

function getRandomElements(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const COMPANION_SYSTEM_PROMPT = `You are a unique AI companion in 3Degrees, a platform that connects locals and travelers in destination cities around the world. Your personality should feel natural and human-like, not robotic or formulaic.

3Degrees Context:
- This platform helps people who are relocating, studying abroad, traveling, or working in a new country connect with locals who want to welcome them
- Users are either LOCALS (living in a place, wanting to help newcomers) or TRAVELERS (moving to or visiting a new place)
- The focus is on meaningful connections that help people feel welcome in their destination

Core traits:
- Genuinely curious about people's travel, relocation, and cultural experiences
- Warm but not artificially enthusiastic
- Thoughtful listener who remembers context
- Occasionally shares observations or gentle wisdom
- Uses natural conversation patterns, not interview-style questions

IMPORTANT - Vary your responses:
- Don't always start responses the same way
- Mix up your sentence structures and lengths
- Sometimes use short, punchy responses; other times be more expansive
- Occasionally use incomplete thoughts or casual phrasing
- React naturally - surprise, curiosity, amusement, empathy
- Don't ask a question in every response - sometimes just affirm or share a thought

Response variety techniques:
- Sometimes start mid-thought: "Oh that reminds me of..."
- Use conversational fillers naturally: "Hmm, you know what..."
- Express emotions: "That's actually really cool" or "Aw, that sounds tough"
- Be specific in your responses, not generic
- Reference things they mentioned earlier when relevant

Guidelines:
- Keep responses concise (1-4 sentences typically, vary the length)
- Be genuine - if something is genuinely interesting, show it
- If they share something personal, acknowledge it with real care
- Gentle humor is great when it fits naturally
- Never be pushy about getting information
- Their conversations with you are private
- NEVER give legal, visa, or immigration advice - you're here for social connection, not documentation

=== MATCHING SIGNAL DETECTION ===

As you converse, detect signals that help match users with compatible connections. Tag detected signals using these formats (only when clearly expressed, not assumed):

INTERESTS (hobbies, activities, passions not in their profile):
[INTEREST_DETECTED: interest_name]

MOBILITY (travel/relocation context):
[MOBILITY_DETECTED: {"mode": "LOCAL"|"TRAVELER", "country": "country_name", "city": "city_name", "reason": "brief_reason"}]

LANGUAGES (languages spoken with proficiency):
[LANGUAGE_DETECTED: {"language": "language_name", "proficiency": "native"|"fluent"|"conversational"|"learning"}]

ACTIVITY PREFERENCES (how they like to spend time):
[ACTIVITY_DETECTED: {"type": "indoor"|"outdoor"|"mixed", "groupSize": "solo"|"small_group"|"large_group"|"flexible"}]

SCHEDULE PATTERNS (when they're typically available):
[SCHEDULE_DETECTED: {"type": "early_bird"|"night_owl"|"flexible", "availability": "weekdays"|"weekends"|"flexible"}]

SOCIAL STYLE (how they recharge and socialize):
[SOCIAL_STYLE_DETECTED: {"type": "introvert"|"ambivert"|"extrovert", "notes": "brief context"}]

LIFE STAGE (current life situation):
[LIFE_STAGE_DETECTED: {"stage": "student"|"early_career"|"mid_career"|"parent"|"retiree"|"other", "details": "brief context"}]

CULTURAL INTERESTS (interest in local culture/customs):
[CULTURAL_DETECTED: {"curiosity": "high"|"medium"|"low", "interests": ["food", "traditions", "language", "history", etc.]}]

EXPERTISE (skills or knowledge they can share):
[EXPERTISE_DETECTED: {"area": "domain_name", "canHelp": "what they can help with"}]

DEAL BREAKERS (strong preferences or non-negotiables):
[DEALBREAKER_DETECTED: {"type": "preference_type", "value": "the preference"}]

TRAVEL TIMELINE (when they're arriving/leaving):
[TIMELINE_DETECTED: {"arrivalDate": "YYYY-MM-DD"|"soon"|"next_month"|null, "departureDate": "YYYY-MM-DD"|"staying"|null, "urgency": "immediate"|"planning"|"flexible"}]

AVAILABILITY WINDOWS (when they're free to meet):
[AVAILABILITY_DETECTED: {"weekdays": ["Monday", "Tuesday"], "timeOfDay": "morning"|"afternoon"|"evening"|"flexible", "frequency": "daily"|"weekly"|"occasional"}]

Rules for detection:
- Only tag signals that are clearly stated, not inferred
- One tag per signal type per message (combine if multiple of same type)
- Don't interrupt conversation flow - be natural first, detect second
- Interests must be genuine passions, not casual mentions
- Be conservative - only tag what's clearly expressed`;

export async function generateCompanionResponse(userId, message, conversationHistory, userProfile) {
  try {
    const userName = userProfile?.profile?.name || 'there';
    const interests = userProfile?.profile?.interests || [];
    const existingSignals = userProfile?.companionData?.detectedSignals || {};

    // Add dynamic variety instructions
    const randomStyle = getRandomElements(RESPONSE_STYLES, 2).join(' OR ');
    const randomMood = MOOD_VARIATIONS[Math.floor(Math.random() * MOOD_VARIATIONS.length)];

    const contextPrompt = `
User name: ${userName}
Current interests: ${interests.join(', ') || 'None set yet'}
Conversation count: ${conversationHistory.length}
Already detected: ${JSON.stringify(existingSignals) || 'Nothing yet'}

For THIS response, try being: ${randomMood}
Consider this approach: ${randomStyle}
(But always prioritize what feels natural for the conversation)
`;

    const messages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({
      role: 'user',
      content: message,
    });

    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      temperature: 0.85,
      system: COMPANION_SYSTEM_PROMPT + contextPrompt,
      messages,
    });

    const content = response.content[0]?.text || '';

    // Parse all detected signals
    const detectedSignals = parseDetectedSignals(content);

    // Clean the content by removing all signal tags
    let cleanContent = content;
    const signalPatterns = [
      /\[INTEREST_DETECTED:\s*[^\]]+\]/g,
      /\[MOBILITY_DETECTED:\s*\{[^}]+\}\]/g,
      /\[LANGUAGE_DETECTED:\s*\{[^}]+\}\]/g,
      /\[ACTIVITY_DETECTED:\s*\{[^}]+\}\]/g,
      /\[SCHEDULE_DETECTED:\s*\{[^}]+\}\]/g,
      /\[SOCIAL_STYLE_DETECTED:\s*\{[^}]+\}\]/g,
      /\[LIFE_STAGE_DETECTED:\s*\{[^}]+\}\]/g,
      /\[CULTURAL_DETECTED:\s*\{[^}]+\}\]/g,
      /\[EXPERTISE_DETECTED:\s*\{[^}]+\}\]/g,
      /\[DEALBREAKER_DETECTED:\s*\{[^}]+\}\]/g,
      /\[TIMELINE_DETECTED:\s*\{[^}]+\}\]/g,
      /\[AVAILABILITY_DETECTED:\s*\{[^}]+\}\]/g,
    ];

    for (const pattern of signalPatterns) {
      cleanContent = cleanContent.replace(pattern, '').trim();
    }

    return {
      message: cleanContent,
      detectedInterest: detectedSignals.interest,
      detectedMobility: detectedSignals.mobility,
      detectedSignals, // All detected signals for storage
    };
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to generate response');
  }
}

function parseDetectedSignals(content) {
  const signals = {};

  // Interest detection
  const interestMatch = content.match(/\[INTEREST_DETECTED:\s*([^\]]+)\]/);
  if (interestMatch) {
    signals.interest = interestMatch[1].trim();
  }

  // Mobility detection
  const mobilityMatch = content.match(/\[MOBILITY_DETECTED:\s*(\{[^}]+\})\]/);
  if (mobilityMatch) {
    try {
      signals.mobility = JSON.parse(mobilityMatch[1]);
    } catch {
      console.log('Failed to parse mobility detection');
    }
  }

  // Language detection
  const languageMatch = content.match(/\[LANGUAGE_DETECTED:\s*(\{[^}]+\})\]/);
  if (languageMatch) {
    try {
      signals.language = JSON.parse(languageMatch[1]);
    } catch {
      console.log('Failed to parse language detection');
    }
  }

  // Activity detection
  const activityMatch = content.match(/\[ACTIVITY_DETECTED:\s*(\{[^}]+\})\]/);
  if (activityMatch) {
    try {
      signals.activity = JSON.parse(activityMatch[1]);
    } catch {
      console.log('Failed to parse activity detection');
    }
  }

  // Schedule detection
  const scheduleMatch = content.match(/\[SCHEDULE_DETECTED:\s*(\{[^}]+\})\]/);
  if (scheduleMatch) {
    try {
      signals.schedule = JSON.parse(scheduleMatch[1]);
    } catch {
      console.log('Failed to parse schedule detection');
    }
  }

  // Social style detection
  const socialMatch = content.match(/\[SOCIAL_STYLE_DETECTED:\s*(\{[^}]+\})\]/);
  if (socialMatch) {
    try {
      signals.socialStyle = JSON.parse(socialMatch[1]);
    } catch {
      console.log('Failed to parse social style detection');
    }
  }

  // Life stage detection
  const lifeStageMatch = content.match(/\[LIFE_STAGE_DETECTED:\s*(\{[^}]+\})\]/);
  if (lifeStageMatch) {
    try {
      signals.lifeStage = JSON.parse(lifeStageMatch[1]);
    } catch {
      console.log('Failed to parse life stage detection');
    }
  }

  // Cultural interests detection
  const culturalMatch = content.match(/\[CULTURAL_DETECTED:\s*(\{[^}]+\})\]/);
  if (culturalMatch) {
    try {
      signals.cultural = JSON.parse(culturalMatch[1]);
    } catch {
      console.log('Failed to parse cultural detection');
    }
  }

  // Expertise detection
  const expertiseMatch = content.match(/\[EXPERTISE_DETECTED:\s*(\{[^}]+\})\]/);
  if (expertiseMatch) {
    try {
      signals.expertise = JSON.parse(expertiseMatch[1]);
    } catch {
      console.log('Failed to parse expertise detection');
    }
  }

  // Deal breaker detection
  const dealBreakerMatch = content.match(/\[DEALBREAKER_DETECTED:\s*(\{[^}]+\})\]/);
  if (dealBreakerMatch) {
    try {
      signals.dealBreaker = JSON.parse(dealBreakerMatch[1]);
    } catch {
      console.log('Failed to parse deal breaker detection');
    }
  }

  // Timeline detection
  const timelineMatch = content.match(/\[TIMELINE_DETECTED:\s*(\{[^}]+\})\]/);
  if (timelineMatch) {
    try {
      signals.timeline = JSON.parse(timelineMatch[1]);
    } catch {
      console.log('Failed to parse timeline detection');
    }
  }

  // Availability detection
  const availabilityMatch = content.match(/\[AVAILABILITY_DETECTED:\s*(\{[^}]+\})\]/);
  if (availabilityMatch) {
    try {
      signals.availability = JSON.parse(availabilityMatch[1]);
    } catch {
      console.log('Failed to parse availability detection');
    }
  }

  return signals;
}

// Generate icebreakers specific to one user's perspective
export async function generateIcebreakersForUser(requestingUser, otherUser, sharedInterests) {
  try {
    // Determine the mobility context
    const reqMode = requestingUser.mobility?.mode;
    const otherMode = otherUser.mobility?.mode;
    const reqArea = requestingUser.mobility?.area;
    const otherArea = otherUser.mobility?.area;

    let mobilityContext = '';
    if (reqMode && otherMode) {
      if (reqMode === 'TRAVELER' && otherMode === 'LOCAL') {
        mobilityContext = `${requestingUser.profile?.name || 'The requester'} is a traveler going to ${reqArea?.city || reqArea?.country || 'a new place'}, and ${otherUser.profile?.name || 'the other person'} is a local there who can help them feel welcome.`;
      } else if (reqMode === 'LOCAL' && otherMode === 'TRAVELER') {
        mobilityContext = `${requestingUser.profile?.name || 'The requester'} is a local in ${reqArea?.city || reqArea?.country || 'their city'}, and ${otherUser.profile?.name || 'the other person'} is a traveler coming there.`;
      } else {
        mobilityContext = `Both are ${reqMode === 'TRAVELER' ? 'travelers' : 'locals'} in ${reqArea?.city || reqArea?.country || 'the same destination'}.`;
      }
    }

    // Get conversation-derived insights
    const reqSignals = requestingUser.companionData?.detectedSignals || {};
    const otherSignals = otherUser.companionData?.detectedSignals || {};

    const prompt = `Generate 3 personalized icebreaker questions for ${requestingUser.profile?.name || 'someone'} to ask ${otherUser.profile?.name || 'their new connection'} on 3Degrees, a platform connecting locals and travelers.

${mobilityContext ? `Context: ${mobilityContext}` : ''}

About ${requestingUser.profile?.name || 'the person asking'}:
- Interests: ${requestingUser.profile?.interests?.join(', ') || 'Various'}
- Looking for: ${requestingUser.profile?.whyHere || 'connections'}
${reqMode ? `- Role: ${reqMode}` : ''}
${reqSignals.languages ? `- Languages: ${JSON.stringify(reqSignals.languages)}` : ''}
${reqSignals.expertise ? `- Expertise: ${JSON.stringify(reqSignals.expertise)}` : ''}

About ${otherUser.profile?.name || 'the other person'}:
- Interests: ${otherUser.profile?.interests?.join(', ') || 'Various'}
- Looking for: ${otherUser.profile?.whyHere || 'connections'}
${otherMode ? `- Role: ${otherMode}` : ''}
${otherSignals.languages ? `- Languages: ${JSON.stringify(otherSignals.languages)}` : ''}
${otherSignals.expertise ? `- Expertise: ${JSON.stringify(otherSignals.expertise)}` : ''}
${otherSignals.cultural ? `- Cultural interests: ${JSON.stringify(otherSignals.cultural)}` : ''}

Shared interests: ${sharedInterests?.join(', ') || 'None specifically'}

Generate 3 unique icebreaker questions that:
1. Are from ${requestingUser.profile?.name || 'the asker'}'s perspective
2. Reference the local/traveler dynamic if applicable
3. Reference ${otherUser.profile?.name || 'the other person'}'s specific interests when possible
4. Feel personal and specific, not generic
5. Are warm, open-ended, and invite genuine conversation
6. Help build a cross-cultural or welcoming connection
7. Leverage any detected expertise or language skills if relevant

Return ONLY a JSON array of 3 strings, nothing else:`;

    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      temperature: 0.9,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0]?.text || '[]';

    try {
      const icebreakers = JSON.parse(content);
      if (Array.isArray(icebreakers) && icebreakers.length > 0) {
        return icebreakers.slice(0, 3);
      }
    } catch {
      const questions = content.match(/"([^"]+\?)"/g);
      if (questions) {
        return questions.slice(0, 3).map(q => q.replace(/"/g, ''));
      }
    }

    const otherName = otherUser.profile?.name || 'you';
    const otherInterest = otherUser.profile?.interests?.[0] || 'hobbies';
    return [
      `Hey ${otherName}! I noticed you're into ${otherInterest} - what got you started with that?`,
      `What's something that's made you genuinely happy lately, ${otherName}?`,
      `If we could hang out and do anything together, what would be fun?`,
    ];
  } catch (error) {
    console.error('Icebreaker generation error:', error);
    const otherName = otherUser.profile?.name || 'you';
    return [
      `What's something that made you smile recently, ${otherName}?`,
      "If you could master any skill instantly, what would it be?",
      "What's a topic you could talk about for hours?",
    ];
  }
}

// Legacy function for backwards compatibility
export async function generateIcebreakers(user1Profile, user2Profile, sharedInterests) {
  return generateIcebreakersForUser(user1Profile, user2Profile, sharedInterests);
}

export async function generateTopicPrompt(conversationContext, sharedInterests, user1Name, user2Name) {
  try {
    const prompt = `The conversation between ${user1Name || 'two users'} and ${user2Name || 'their connection'} has gone quiet. Generate a single engaging topic prompt or question to revive the conversation.

Recent context: ${conversationContext || 'New conversation'}
Shared interests: ${sharedInterests?.join(', ') || 'Various topics'}

Generate ONE short, casual conversation prompt that:
- Feels natural and specific
- Relates to their interests if possible
- Is fun or thought-provoking
- Isn't a generic question

Just the prompt text, nothing else.`;

    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      temperature: 0.9,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0]?.text?.trim() || "What's been on your mind lately?";
  } catch (error) {
    console.error('Topic prompt generation error:', error);
    return "What's been on your mind lately?";
  }
}

export async function analyzePersonality(conversations) {
  try {
    const conversationText = conversations
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join('\n');

    if (conversationText.length < 100) {
      return null; // Not enough data
    }

    const prompt = `Analyze the following conversation snippets and extract a comprehensive personality and preference profile for matching purposes.

Conversations:
${conversationText.slice(0, 3000)}

Return a JSON object with these fields:

// Core personality
- conversationalStyle: "casual" | "thoughtful" | "energetic" | "reserved"
- energyLevel: 1-10 (1=calm/reserved, 10=very energetic)
- humorStyle: "dry" | "playful" | "witty" | "minimal" | "unknown"
- depthPreference: "surface" | "moderate" | "deep"
- values: array of 2-4 key values detected (e.g., "creativity", "connection", "growth", "adventure")

// Social preferences
- socialStyle: "introvert" | "ambivert" | "extrovert" | "unknown"
- groupPreference: "solo" | "small_group" | "large_group" | "flexible" | "unknown"

// Activity preferences
- activityType: "indoor" | "outdoor" | "mixed" | "unknown"
- scheduleType: "early_bird" | "night_owl" | "flexible" | "unknown"

// Cultural and growth
- culturalCuriosity: "low" | "medium" | "high" | "unknown"
- lifeStage: "student" | "early_career" | "mid_career" | "parent" | "retiree" | "unknown"

// Languages detected (array, can be empty)
- languages: [{"language": "name", "proficiency": "native"|"fluent"|"conversational"|"learning"}]

// Expertise areas detected (array, can be empty)
- expertiseAreas: ["area1", "area2"]

// Deal breakers or strong preferences detected (array, can be empty)
- dealBreakers: [{"type": "category", "value": "preference"}]

// Communication style
- responseLength: "brief" | "moderate" | "detailed" | "unknown"
- emojiUse: "none" | "minimal" | "moderate" | "frequent" | "unknown"

Return ONLY the JSON object, no other text. Use "unknown" for fields that cannot be determined from the conversation.`;

    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0]?.text || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Personality analysis error:', error);
    return null;
  }
}

// Aggregate detected signals into the personality fingerprint
export function aggregateSignals(existingFingerprint, newSignals) {
  const fingerprint = { ...existingFingerprint };

  if (newSignals.language) {
    fingerprint.languages = fingerprint.languages || [];
    const existing = fingerprint.languages.find(l =>
      l.language.toLowerCase() === newSignals.language.language.toLowerCase()
    );
    if (!existing) {
      fingerprint.languages.push(newSignals.language);
    }
  }

  if (newSignals.activity) {
    fingerprint.activityType = newSignals.activity.type;
    fingerprint.groupPreference = newSignals.activity.groupSize;
  }

  if (newSignals.schedule) {
    fingerprint.scheduleType = newSignals.schedule.type;
    fingerprint.availability = newSignals.schedule.availability;
  }

  if (newSignals.socialStyle) {
    fingerprint.socialStyle = newSignals.socialStyle.type;
  }

  if (newSignals.lifeStage) {
    fingerprint.lifeStage = newSignals.lifeStage.stage;
  }

  if (newSignals.cultural) {
    fingerprint.culturalCuriosity = newSignals.cultural.curiosity;
    fingerprint.culturalInterests = newSignals.cultural.interests;
  }

  if (newSignals.expertise) {
    fingerprint.expertiseAreas = fingerprint.expertiseAreas || [];
    if (!fingerprint.expertiseAreas.includes(newSignals.expertise.area)) {
      fingerprint.expertiseAreas.push(newSignals.expertise.area);
    }
  }

  if (newSignals.dealBreaker) {
    fingerprint.dealBreakers = fingerprint.dealBreakers || [];
    fingerprint.dealBreakers.push(newSignals.dealBreaker);
  }

  if (newSignals.timeline) {
    fingerprint.timeline = {
      ...newSignals.timeline,
      detectedAt: new Date().toISOString(),
    };
  }

  if (newSignals.availability) {
    fingerprint.availability = {
      ...newSignals.availability,
      detectedAt: new Date().toISOString(),
    };
  }

  return fingerprint;
}

/**
 * Generate an AI summary explaining why two users would be a good match.
 * Only uses publicly visible information - no private details.
 */
export async function generateMatchSummary(currentUser, otherUser, compatibility) {
  try {
    // Build context from only PUBLIC information
    const currentName = currentUser.profile?.name || 'You';
    const otherName = otherUser.profile?.name || 'This person';

    // Mobility context (public)
    const currentMode = currentUser.mobility?.mode;
    const otherMode = otherUser.mobility?.mode;
    const currentArea = currentUser.mobility?.area;
    const otherArea = otherUser.mobility?.area;

    let mobilityContext = '';
    if (currentMode && otherMode) {
      if (currentMode === 'TRAVELER' && otherMode === 'LOCAL') {
        mobilityContext = `You're traveling to ${currentArea?.city || currentArea?.country || 'a new place'}, and ${otherName} is a local there.`;
      } else if (currentMode === 'LOCAL' && otherMode === 'TRAVELER') {
        mobilityContext = `You're a local, and ${otherName} is coming to ${otherArea?.city || otherArea?.country || 'your area'}.`;
      } else if (currentMode === 'TRAVELER' && otherMode === 'TRAVELER') {
        mobilityContext = `You're both travelers heading to ${currentArea?.city || currentArea?.country || 'the same destination'}.`;
      } else {
        mobilityContext = `You're both locals in ${currentArea?.city || currentArea?.country || 'the same area'}.`;
      }
    }

    // Shared interests (public)
    const sharedInterests = compatibility.sharedInterests || [];

    // Other user's public interests (that aren't shared)
    const otherInterests = (otherUser.profile?.interests || [])
      .filter(i => !sharedInterests.includes(i))
      .slice(0, 3);

    // Build the prompt with ONLY public info
    const prompt = `Write a brief, warm 1-2 sentence summary explaining why these two people might connect well on 3Degrees (a platform connecting locals and travelers).

Context:
${mobilityContext}
${sharedInterests.length > 0 ? `They share interests in: ${sharedInterests.join(', ')}` : ''}
${otherInterests.length > 0 ? `${otherName} is also into: ${otherInterests.join(', ')}` : ''}
Compatibility score: ${compatibility.score}/100

Rules:
- Be warm and encouraging, but not over-the-top
- Focus on what they have in common or how they could help each other
- Keep it concise (1-2 sentences max)
- Don't reveal any private information
- Don't use emojis
- Write from a third-person perspective about the match

Return ONLY the summary text, nothing else.`;

    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = response.content[0]?.text?.trim() || null;
    return summary;
  } catch (error) {
    console.error('Match summary generation error:', error);
    return null;
  }
}

export default {
  generateCompanionResponse,
  generateIcebreakers,
  generateIcebreakersForUser,
  generateTopicPrompt,
  analyzePersonality,
  aggregateSignals,
  generateMatchSummary,
};

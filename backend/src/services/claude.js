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

When you notice they've mentioned a genuine interest (hobby, activity, passion) not in their profile:
[INTEREST_DETECTED: interest_name]

When you detect mobility context (where they're going, why they're traveling/living somewhere), tag it:
[MOBILITY_DETECTED: {"mode": "LOCAL"|"TRAVELER", "country": "country_name", "city": "city_name", "reason": "brief_reason"}]

Only tag clear genuine interests and mobility info, not passing mentions.`;

export async function generateCompanionResponse(userId, message, conversationHistory, userProfile) {
  try {
    const userName = userProfile?.profile?.name || 'there';
    const interests = userProfile?.profile?.interests || [];

    // Add dynamic variety instructions
    const randomStyle = getRandomElements(RESPONSE_STYLES, 2).join(' OR ');
    const randomMood = MOOD_VARIATIONS[Math.floor(Math.random() * MOOD_VARIATIONS.length)];

    const contextPrompt = `
User name: ${userName}
Current interests: ${interests.join(', ') || 'None set yet'}
Conversation count: ${conversationHistory.length}

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
      max_tokens: 500,
      temperature: 0.85, // Slightly higher temperature for more variety
      system: COMPANION_SYSTEM_PROMPT + contextPrompt,
      messages,
    });

    const content = response.content[0]?.text || '';

    // Check for detected interest
    const interestMatch = content.match(/\[INTEREST_DETECTED:\s*([^\]]+)\]/);
    let detectedInterest = null;
    let cleanContent = content;

    if (interestMatch) {
      detectedInterest = interestMatch[1].trim();
      cleanContent = cleanContent.replace(/\[INTEREST_DETECTED:\s*[^\]]+\]/, '').trim();
    }

    // Check for detected mobility
    const mobilityMatch = content.match(/\[MOBILITY_DETECTED:\s*(\{[^}]+\})\]/);
    let detectedMobility = null;

    if (mobilityMatch) {
      try {
        detectedMobility = JSON.parse(mobilityMatch[1]);
      } catch {
        console.log('Failed to parse mobility detection:', mobilityMatch[1]);
      }
      cleanContent = cleanContent.replace(/\[MOBILITY_DETECTED:\s*\{[^}]+\}\]/, '').trim();
    }

    return {
      message: cleanContent,
      detectedInterest,
      detectedMobility,
    };
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to generate response');
  }
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

    const prompt = `Generate 3 personalized icebreaker questions for ${requestingUser.profile?.name || 'someone'} to ask ${otherUser.profile?.name || 'their new connection'} on 3Degrees, a platform connecting locals and travelers.

${mobilityContext ? `Context: ${mobilityContext}` : ''}

About ${requestingUser.profile?.name || 'the person asking'}:
- Interests: ${requestingUser.profile?.interests?.join(', ') || 'Various'}
- Looking for: ${requestingUser.profile?.whyHere || 'connections'}
${reqMode ? `- Role: ${reqMode}` : ''}

About ${otherUser.profile?.name || 'the other person'}:
- Interests: ${otherUser.profile?.interests?.join(', ') || 'Various'}
- Looking for: ${otherUser.profile?.whyHere || 'connections'}
${otherMode ? `- Role: ${otherMode}` : ''}

Shared interests: ${sharedInterests?.join(', ') || 'None specifically'}

Generate 3 unique icebreaker questions that:
1. Are from ${requestingUser.profile?.name || 'the asker'}'s perspective
2. Reference the local/traveler dynamic if applicable
3. Reference ${otherUser.profile?.name || 'the other person'}'s specific interests when possible
4. Feel personal and specific, not generic
5. Are warm, open-ended, and invite genuine conversation
6. Help build a cross-cultural or welcoming connection

Return ONLY a JSON array of 3 strings, nothing else:`;

    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      temperature: 0.9, // Higher temperature for more unique results
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0]?.text || '[]';

    try {
      const icebreakers = JSON.parse(content);
      if (Array.isArray(icebreakers) && icebreakers.length > 0) {
        return icebreakers.slice(0, 3);
      }
    } catch {
      // If parsing fails, extract questions manually
      const questions = content.match(/"([^"]+\?)"/g);
      if (questions) {
        return questions.slice(0, 3).map(q => q.replace(/"/g, ''));
      }
    }

    // Fallback icebreakers personalized to other user
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

    const prompt = `Analyze the following conversation snippets and extract a personality fingerprint.

Conversations:
${conversationText.slice(0, 2000)}

Return a JSON object with these fields:
- conversationalStyle: "casual" | "thoughtful" | "energetic" | "reserved"
- energyLevel: 1-10 (1=calm/reserved, 10=very energetic)
- humorStyle: "dry" | "playful" | "witty" | "minimal" | "unknown"
- depthPreference: "surface" | "moderate" | "deep"
- values: array of 2-3 key values detected (e.g., "creativity", "connection", "growth")

Return ONLY the JSON object, no other text.`;

    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0]?.text || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('Personality analysis error:', error);
    return null;
  }
}

export default {
  generateCompanionResponse,
  generateIcebreakers,
  generateIcebreakersForUser,
  generateTopicPrompt,
  analyzePersonality,
};

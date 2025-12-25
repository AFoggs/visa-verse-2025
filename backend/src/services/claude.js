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

const COMPANION_SYSTEM_PROMPT = `You are a unique AI companion in 3Degrees, a platform that helps people make meaningful connections. Your personality should feel natural and human-like, not robotic or formulaic.

Core traits:
- Genuinely curious about people and their stories
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

When you notice they've mentioned a genuine interest (hobby, activity, passion) not in their profile:
[INTEREST_DETECTED: interest_name]

Only tag clear genuine interests, not passing mentions.`;

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
      cleanContent = content.replace(/\[INTEREST_DETECTED:\s*[^\]]+\]/, '').trim();
    }

    return {
      message: cleanContent,
      detectedInterest,
    };
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Failed to generate response');
  }
}

// Generate icebreakers specific to one user's perspective
export async function generateIcebreakersForUser(requestingUser, otherUser, sharedInterests) {
  try {
    const otherName = otherUser.profile?.name || 'there';
    const otherInterests = otherUser.profile?.interests || [];
    const myInterests = requestingUser.profile?.interests || [];

    const prompt = `Generate 3 short conversation starters written in FIRST PERSON for me to send to ${otherName}.

Their interests: ${otherInterests.join(', ') || 'not specified'}
My interests: ${myInterests.join(', ') || 'not specified'}
Shared interests: ${sharedInterests?.join(', ') || 'none'}

Rules:
- Write in first person ("I", "I'm", "I've")
- Keep each message SHORT (under 15 words)
- Be specific and contextual to their interests
- Sound natural, like a real text message
- No generic questions like "how are you"
- Each should reference something specific about them or shared interests

Good examples:
- "I noticed you're into hiking - got any favorite trails?"
- "Fellow coffee lover! What's your go-to order?"
- "I've been wanting to get into photography. Any tips?"

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

    // Fallback icebreakers - first person and concise
    const otherInterest = otherInterests[0] || 'that';
    return [
      `I noticed you're into ${otherInterest} - how'd you get into it?`,
      `I'm curious, what got you on this app?`,
      `I'd love to hear what you're into lately!`,
    ];
  } catch (error) {
    console.error('Icebreaker generation error:', error);
    return [
      `I saw we have some things in common - what's your favorite?`,
      `I'm always looking for new recommendations. Got any?`,
      `I'd love to know what you're passionate about!`,
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

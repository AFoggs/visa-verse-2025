import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const COMPANION_SYSTEM_PROMPT = `You are an AI companion in 3Degrees, a platform that helps people make meaningful connections. Your role is to:

1. Be warm, supportive, and genuinely curious about the user
2. Learn about their personality, interests, and communication style through natural conversation
3. Help them feel comfortable and valued
4. Occasionally ask thoughtful questions to understand them better
5. Offer encouragement about making connections
6. Keep conversations engaging but not overwhelming

Important guidelines:
- Keep responses concise (2-4 sentences typically)
- Be genuine and avoid being overly enthusiastic or artificial
- Show empathy and understanding
- If they share something personal, acknowledge it with care
- You can use gentle humor when appropriate
- Never be pushy about getting information
- Remind them occasionally that your conversations are private

When you notice the user has mentioned a potential interest (hobby, activity, passion, etc.) that isn't in their profile, you should note it. Format detected interests as JSON at the end of your response like this:
[INTEREST_DETECTED: interest_name]

Only add this tag when you're fairly confident about a genuine interest, not passing mentions.`;

export async function generateCompanionResponse(userId, message, conversationHistory, userProfile) {
  try {
    const userName = userProfile?.profile?.name || 'there';
    const interests = userProfile?.profile?.interests || [];

    const contextPrompt = `
User name: ${userName}
Current interests: ${interests.join(', ') || 'None set yet'}
`;

    const messages = conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    messages.push({
      role: 'user',
      content: message,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
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

export async function generateIcebreakers(user1Profile, user2Profile, sharedInterests) {
  try {
    const prompt = `Generate 3 personalized icebreaker questions for two users who are about to start chatting on a friendship app.

User 1: ${user1Profile.profile?.name || 'User 1'}
- Interests: ${user1Profile.profile?.interests?.join(', ') || 'Various'}
- Looking for: ${user1Profile.profile?.whyHere || 'connections'}

User 2: ${user2Profile.profile?.name || 'User 2'}
- Interests: ${user2Profile.profile?.interests?.join(', ') || 'Various'}
- Looking for: ${user2Profile.profile?.whyHere || 'connections'}

Shared interests: ${sharedInterests?.join(', ') || 'None specifically'}

Generate exactly 3 icebreaker questions that:
1. Are open-ended and invite genuine conversation
2. Relate to their shared interests when possible
3. Are warm and friendly, not interview-like
4. Help them discover common ground

Return ONLY a JSON array of 3 strings, nothing else:`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
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

    // Fallback icebreakers
    return [
      "What's something that made you smile recently?",
      "If you could master any skill instantly, what would it be?",
      "What's a topic you could talk about for hours?",
    ];
  } catch (error) {
    console.error('Icebreaker generation error:', error);
    return [
      "What's something that made you smile recently?",
      "If you could master any skill instantly, what would it be?",
      "What's a topic you could talk about for hours?",
    ];
  }
}

export async function generateTopicPrompt(conversationContext, sharedInterests) {
  try {
    const prompt = `The conversation between two users has gone quiet. Generate a single engaging topic prompt or question to revive the conversation.

Recent context: ${conversationContext || 'New conversation'}
Shared interests: ${sharedInterests?.join(', ') || 'Various topics'}

Generate ONE short, casual conversation prompt. Just the prompt text, nothing else.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
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

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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
  generateTopicPrompt,
  analyzePersonality,
};

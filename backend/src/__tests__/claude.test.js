/**
 * Claude Service Tests
 * Critical tests for the AI companion chatbot functionality
 */

import { jest } from '@jest/globals';

// Mock the Anthropic SDK before importing the service
jest.unstable_mockModule('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn(),
    },
  })),
}));

describe('Claude Service', () => {
  let generateCompanionResponse;
  let generateIcebreakersForUser;
  let analyzePersonality;
  let mockAnthropicClient;

  beforeEach(async () => {
    jest.resetModules();

    // Import the mocked Anthropic
    const AnthropicMock = (await import('@anthropic-ai/sdk')).default;
    mockAnthropicClient = {
      messages: {
        create: jest.fn(),
      },
    };
    AnthropicMock.mockImplementation(() => mockAnthropicClient);

    // Import the service after mocking
    const claudeService = await import('../services/claude.js');
    generateCompanionResponse = claudeService.generateCompanionResponse;
    generateIcebreakersForUser = claudeService.generateIcebreakersForUser;
    analyzePersonality = claudeService.analyzePersonality;
  });

  describe('generateCompanionResponse', () => {
    const mockUserProfile = {
      profile: {
        name: 'Test User',
        interests: ['Travel', 'Music', 'Photography'],
      },
    };

    const mockConversationHistory = [
      { role: 'user', content: 'Hello!' },
      { role: 'assistant', content: 'Hi there! How are you?' },
    ];

    it('should generate a response successfully', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ text: 'Great to hear from you! What brings you to VisaVerse today?' }],
      });

      const result = await generateCompanionResponse(
        'user-123',
        'I just signed up!',
        mockConversationHistory,
        mockUserProfile
      );

      expect(result).toHaveProperty('message');
      expect(result.message).toBe('Great to hear from you! What brings you to VisaVerse today?');
      expect(mockAnthropicClient.messages.create).toHaveBeenCalled();
    });

    it('should detect interests in conversation', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ text: 'That sounds fun! [INTEREST_DETECTED: Hiking] Do you go often?' }],
      });

      const result = await generateCompanionResponse(
        'user-123',
        'I love hiking in the mountains',
        mockConversationHistory,
        mockUserProfile
      );

      expect(result.detectedInterest).toBe('Hiking');
      expect(result.message).not.toContain('[INTEREST_DETECTED');
    });

    it('should detect mobility context in conversation', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          text: 'Moving to Berlin sounds exciting! [MOBILITY_DETECTED: {"mode": "TRAVELER", "country": "Germany", "city": "Berlin", "reason": "work"}] I can help you connect with locals there.'
        }],
      });

      const result = await generateCompanionResponse(
        'user-123',
        'I am moving to Berlin for work next month',
        mockConversationHistory,
        mockUserProfile
      );

      expect(result.detectedMobility).toEqual({
        mode: 'TRAVELER',
        country: 'Germany',
        city: 'Berlin',
        reason: 'work',
      });
      expect(result.message).not.toContain('[MOBILITY_DETECTED');
    });

    it('should handle API errors gracefully', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(new Error('API Error'));

      await expect(
        generateCompanionResponse(
          'user-123',
          'Hello',
          mockConversationHistory,
          mockUserProfile
        )
      ).rejects.toThrow('Failed to generate response');
    });

    it('should handle empty response content', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [],
      });

      const result = await generateCompanionResponse(
        'user-123',
        'Hello',
        mockConversationHistory,
        mockUserProfile
      );

      expect(result.message).toBe('');
    });

    it('should use correct model and parameters', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ text: 'Hello!' }],
      });

      await generateCompanionResponse(
        'user-123',
        'Hi',
        [],
        mockUserProfile
      );

      expect(mockAnthropicClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          temperature: expect.any(Number),
        })
      );
    });
  });

  describe('generateIcebreakersForUser', () => {
    const mockRequestingUser = {
      profile: {
        name: 'Alice',
        interests: ['Travel', 'Music'],
        whyHere: 'Making friends',
      },
      mobility: {
        mode: 'TRAVELER',
        area: { country: 'Germany', city: 'Berlin' },
      },
    };

    const mockOtherUser = {
      profile: {
        name: 'Bob',
        interests: ['Music', 'Photography'],
        whyHere: 'Welcoming travelers',
      },
      mobility: {
        mode: 'LOCAL',
        area: { country: 'Germany', city: 'Berlin' },
      },
    };

    it('should generate personalized icebreakers', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          text: '["What is your favorite thing about Berlin?", "How did you get into photography?", "Any music recommendations for someone new to town?"]'
        }],
      });

      const result = await generateIcebreakersForUser(
        mockRequestingUser,
        mockOtherUser,
        ['Music']
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should provide fallback icebreakers on API error', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(new Error('API Error'));

      const result = await generateIcebreakersForUser(
        mockRequestingUser,
        mockOtherUser,
        ['Music']
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      // Fallback should include the other user's name
      expect(result[0]).toContain('Bob');
    });

    it('should handle invalid JSON response', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ text: 'Invalid JSON response' }],
      });

      const result = await generateIcebreakersForUser(
        mockRequestingUser,
        mockOtherUser,
        []
      );

      // Should provide fallback icebreakers
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('analyzePersonality', () => {
    it('should analyze personality from conversations', async () => {
      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            conversationalStyle: 'thoughtful',
            energyLevel: 7,
            humorStyle: 'playful',
            depthPreference: 'deep',
            values: ['creativity', 'connection'],
          })
        }],
      });

      const result = await analyzePersonality([
        { role: 'user', content: 'I love exploring new ideas and connecting with people' },
        { role: 'user', content: 'Travel has taught me so much about different cultures' },
      ]);

      expect(result).toHaveProperty('conversationalStyle');
      expect(result).toHaveProperty('energyLevel');
      expect(result).toHaveProperty('humorStyle');
    });

    it('should return null for insufficient conversation data', async () => {
      const result = await analyzePersonality([
        { role: 'user', content: 'Hi' },
      ]);

      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      mockAnthropicClient.messages.create.mockRejectedValue(new Error('API Error'));

      const result = await analyzePersonality([
        { role: 'user', content: 'A longer message to meet the minimum length requirement for analysis' },
        { role: 'user', content: 'Another message with enough content for personality analysis testing' },
      ]);

      expect(result).toBeNull();
    });
  });
});

describe('Claude Service - Environment', () => {
  it('should throw error if ANTHROPIC_API_KEY is not set', async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    // Reset modules to clear cached client
    jest.resetModules();

    try {
      const { generateCompanionResponse } = await import('../services/claude.js');
      await expect(
        generateCompanionResponse('user-123', 'Hello', [], {})
      ).rejects.toThrow('ANTHROPIC_API_KEY environment variable is not set');
    } finally {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });
});

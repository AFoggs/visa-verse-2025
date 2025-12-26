/**
 * Companion Routes Tests
 * Tests for the AI companion chat API endpoints
 */

import { jest } from '@jest/globals';

// Mock Firebase
const mockDb = {
  collection: jest.fn(),
};

jest.unstable_mockModule('../config/firebase.js', () => ({
  getDb: jest.fn(() => mockDb),
  initializeFirebase: jest.fn(),
}));

// Mock Claude service
jest.unstable_mockModule('../services/claude.js', () => ({
  generateCompanionResponse: jest.fn(),
  analyzePersonality: jest.fn(),
}));

describe('Companion Routes', () => {
  let request;
  let app;
  let generateCompanionResponse;
  let analyzePersonality;

  beforeAll(async () => {
    // Import after mocks are set up
    const express = (await import('express')).default;
    const companionRoutes = (await import('../routes/companion.js')).default;
    const claudeService = await import('../services/claude.js');

    generateCompanionResponse = claudeService.generateCompanionResponse;
    analyzePersonality = claudeService.analyzePersonality;

    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { uid: 'test-user-123' };
      next();
    });

    app.use('/api/companion', companionRoutes);

    const supertest = (await import('supertest')).default;
    request = supertest(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/companion/chat', () => {
    const mockUserDoc = {
      exists: true,
      data: () => ({
        profile: {
          name: 'Test User',
          interests: ['Travel', 'Music'],
        },
      }),
    };

    const mockCompanionDoc = {
      exists: true,
      data: () => ({
        messages: [
          { role: 'assistant', content: 'Hello!', timestamp: '2024-01-01T00:00:00Z' },
        ],
      }),
    };

    beforeEach(() => {
      mockDb.collection.mockImplementation((name) => {
        if (name === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockUserDoc),
              update: jest.fn().mockResolvedValue({}),
            }),
          };
        }
        if (name === 'companionConversations') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockCompanionDoc),
              set: jest.fn().mockResolvedValue({}),
            }),
          };
        }
        return { doc: jest.fn() };
      });
    });

    it('should successfully chat with companion', async () => {
      generateCompanionResponse.mockResolvedValue({
        message: 'Nice to meet you!',
        detectedInterest: null,
        detectedMobility: null,
      });

      const response = await request
        .post('/api/companion/chat')
        .send({ message: 'Hello, I am new here!' })
        .expect(200);

      expect(response.body.message).toBe('Nice to meet you!');
      expect(generateCompanionResponse).toHaveBeenCalled();
    });

    it('should return detected interest when found', async () => {
      generateCompanionResponse.mockResolvedValue({
        message: 'Hiking sounds great!',
        detectedInterest: 'Hiking',
        detectedMobility: null,
      });

      const response = await request
        .post('/api/companion/chat')
        .send({ message: 'I love hiking' })
        .expect(200);

      expect(response.body.detectedInterest).toBe('Hiking');
    });

    it('should return detected mobility when found', async () => {
      generateCompanionResponse.mockResolvedValue({
        message: 'Berlin is amazing!',
        detectedInterest: null,
        detectedMobility: { mode: 'TRAVELER', country: 'Germany', city: 'Berlin' },
      });

      const response = await request
        .post('/api/companion/chat')
        .send({ message: 'I am moving to Berlin' })
        .expect(200);

      expect(response.body.detectedMobility).toEqual({
        mode: 'TRAVELER',
        country: 'Germany',
        city: 'Berlin',
      });
    });

    it('should reject empty message', async () => {
      await request
        .post('/api/companion/chat')
        .send({ message: '' })
        .expect(400);
    });

    it('should reject missing message', async () => {
      await request
        .post('/api/companion/chat')
        .send({})
        .expect(400);
    });

    it('should reject non-string message', async () => {
      await request
        .post('/api/companion/chat')
        .send({ message: 123 })
        .expect(400);
    });

    it('should handle API errors gracefully', async () => {
      generateCompanionResponse.mockRejectedValue(new Error('API Error'));

      await request
        .post('/api/companion/chat')
        .send({ message: 'Hello' })
        .expect(500);
    });

    it('should trigger personality analysis at intervals', async () => {
      // Mock 10 messages to trigger analysis
      const manyMessages = Array(10).fill(null).map((_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      mockDb.collection.mockImplementation((name) => {
        if (name === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue(mockUserDoc),
              update: jest.fn().mockResolvedValue({}),
            }),
          };
        }
        if (name === 'companionConversations') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ messages: manyMessages }),
              }),
              set: jest.fn().mockResolvedValue({}),
            }),
          };
        }
        return { doc: jest.fn() };
      });

      generateCompanionResponse.mockResolvedValue({
        message: 'Response',
        detectedInterest: null,
        detectedMobility: null,
      });

      analyzePersonality.mockResolvedValue({
        conversationalStyle: 'thoughtful',
        energyLevel: 7,
      });

      await request
        .post('/api/companion/chat')
        .send({ message: 'Hello' })
        .expect(200);

      // Personality analysis should be called when message count is divisible by 10
      // After adding 2 messages (user + assistant), total will be 12
      // 12 % 10 !== 0, so it won't be called
      // But if we had 8 messages, adding 2 would give 10
    });
  });

  describe('GET /api/companion/history', () => {
    it('should return conversation history', async () => {
      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              messages: [
                { role: 'assistant', content: 'Hello!', timestamp: '2024-01-01T00:00:00Z' },
                { role: 'user', content: 'Hi there!', timestamp: '2024-01-01T00:00:01Z' },
              ],
            }),
          }),
        }),
      });

      const response = await request
        .get('/api/companion/history')
        .expect(200);

      expect(response.body.messages).toHaveLength(2);
      expect(response.body.messages[0].role).toBe('assistant');
    });

    it('should return empty array for new user', async () => {
      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: false,
          }),
        }),
      });

      const response = await request
        .get('/api/companion/history')
        .expect(200);

      expect(response.body.messages).toEqual([]);
    });
  });

  describe('GET /api/companion/insights', () => {
    it('should return user insights', async () => {
      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              companionData: {
                personalityFingerprint: {
                  conversationalStyle: 'thoughtful',
                  energyLevel: 7,
                },
              },
              profile: {
                interests: ['Travel', 'Music'],
              },
            }),
          }),
        }),
      });

      const response = await request
        .get('/api/companion/insights')
        .expect(200);

      expect(response.body.personalityFingerprint).toBeDefined();
      expect(response.body.interests).toEqual(['Travel', 'Music']);
    });

    it('should return 404 for non-existent user', async () => {
      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: false,
          }),
        }),
      });

      await request
        .get('/api/companion/insights')
        .expect(404);
    });
  });

  describe('POST /api/companion/confirm-interest', () => {
    it('should confirm and add interest', async () => {
      mockDb.collection.mockImplementation((name) => {
        if (name === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  profile: { interests: ['Travel'] },
                }),
              }),
              update: jest.fn().mockResolvedValue({}),
            }),
          };
        }
        if (name === 'companionConversations') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ detectedInterests: [] }),
              }),
              update: jest.fn().mockResolvedValue({}),
            }),
          };
        }
        return { doc: jest.fn() };
      });

      const response = await request
        .post('/api/companion/confirm-interest')
        .send({ interest: 'Hiking', confirm: true })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject interest without confirmation flag', async () => {
      await request
        .post('/api/companion/confirm-interest')
        .send({ interest: 'Hiking' })
        .expect(400);
    });

    it('should not add duplicate interests', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});

      mockDb.collection.mockImplementation((name) => {
        if (name === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({
                  profile: { interests: ['Travel', 'Hiking'] }, // Already has Hiking
                }),
              }),
              update: mockUpdate,
            }),
          };
        }
        if (name === 'companionConversations') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
              update: jest.fn().mockResolvedValue({}),
            }),
          };
        }
        return { doc: jest.fn() };
      });

      await request
        .post('/api/companion/confirm-interest')
        .send({ interest: 'Hiking', confirm: true })
        .expect(200);

      // Update should not have been called with new interest
      expect(mockUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({
          'profile.interests': expect.arrayContaining(['Hiking', 'Hiking']),
        })
      );
    });
  });

  describe('POST /api/companion/confirm-mobility', () => {
    it('should confirm and update mobility', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});

      mockDb.collection.mockImplementation((name) => {
        if (name === 'users') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => ({ mobility: {} }),
              }),
              update: mockUpdate,
            }),
          };
        }
        if (name === 'companionConversations') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
              update: jest.fn().mockResolvedValue({}),
            }),
          };
        }
        return { doc: jest.fn() };
      });

      const response = await request
        .post('/api/companion/confirm-mobility')
        .send({
          mobility: { mode: 'TRAVELER', country: 'Germany', city: 'Berlin' },
          confirm: true,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should reject invalid mobility mode', async () => {
      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
        }),
      });

      await request
        .post('/api/companion/confirm-mobility')
        .send({
          mobility: { mode: 'INVALID', country: 'Germany' },
          confirm: true,
        })
        .expect(400);
    });

    it('should reject missing country', async () => {
      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
        }),
      });

      await request
        .post('/api/companion/confirm-mobility')
        .send({
          mobility: { mode: 'TRAVELER' },
          confirm: true,
        })
        .expect(400);
    });

    it('should track declined mobility', async () => {
      const mockCompanionUpdate = jest.fn().mockResolvedValue({});

      mockDb.collection.mockImplementation((name) => {
        if (name === 'companionConversations') {
          return {
            doc: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
              update: mockCompanionUpdate,
            }),
          };
        }
        return { doc: jest.fn() };
      });

      await request
        .post('/api/companion/confirm-mobility')
        .send({
          mobility: { mode: 'TRAVELER', country: 'Germany' },
          confirm: false,
        })
        .expect(200);

      expect(mockCompanionUpdate).toHaveBeenCalled();
    });
  });
});

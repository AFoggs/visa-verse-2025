/**
 * User Routes Tests
 * Tests for user profile API endpoints
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

describe('User Routes', () => {
  let request;
  let app;

  beforeAll(async () => {
    const express = (await import('express')).default;
    const userRoutes = (await import('../routes/users.js')).default;

    app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { uid: 'test-user-123' };
      next();
    });

    app.use('/api/users', userRoutes);

    const supertest = (await import('supertest')).default;
    request = supertest(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users/me', () => {
    it('should return current user profile', async () => {
      const mockUser = {
        userId: 'test-user-123',
        profile: {
          name: 'Test User',
          age: 25,
          location: { city: 'Berlin', country: 'Germany' },
          interests: ['Travel', 'Music'],
        },
        mobility: {
          mode: 'TRAVELER',
          area: { country: 'Germany', city: 'Berlin' },
        },
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockUser,
          }),
        }),
      });

      const response = await request
        .get('/api/users/me')
        .expect(200);

      expect(response.body.user.profile.name).toBe('Test User');
      expect(response.body.user.mobility.mode).toBe('TRAVELER');
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
        .get('/api/users/me')
        .expect(404);
    });
  });

  describe('GET /api/users/:userId', () => {
    it('should return own profile with full data', async () => {
      const mockUser = {
        userId: 'test-user-123',
        profile: {
          name: 'Test User',
          age: 25,
          photoUrl: 'https://example.com/photo.jpg',
        },
        extendedProfile: { bio: 'Hello!' },
      };

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => mockUser,
          }),
        }),
      });

      const response = await request
        .get('/api/users/test-user-123')
        .expect(200);

      expect(response.body.user).toEqual(mockUser);
    });

    it('should return friend profile with photoUrl', async () => {
      const mockFriend = {
        userId: 'friend-456',
        profile: {
          name: 'Friend User',
          age: 28,
          photoUrl: 'https://example.com/friend.jpg',
          interests: ['Photography'],
        },
        mobility: { mode: 'LOCAL', area: { country: 'Germany', city: 'Berlin' } },
        extendedProfile: { bio: 'I am a local!' },
      };

      const mockCurrentUser = {
        connections: {
          friends: ['friend-456'],
        },
      };

      mockDb.collection.mockImplementation((name) => {
        if (name === 'users') {
          return {
            doc: jest.fn().mockImplementation((id) => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => id === 'test-user-123' ? mockCurrentUser : mockFriend,
              }),
            })),
          };
        }
        if (name === 'matches') {
          return {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true }),
          };
        }
        return { doc: jest.fn() };
      });

      const response = await request
        .get('/api/users/friend-456')
        .expect(200);

      expect(response.body.user.status).toBe('friends');
      expect(response.body.user.profile.photoUrl).toBe('https://example.com/friend.jpg');
      expect(response.body.user.extendedProfile.bio).toBe('I am a local!');
    });

    it('should return connection profile without photoUrl', async () => {
      const mockConnection = {
        userId: 'connection-789',
        profile: {
          name: 'Connection User',
          age: 30,
          photoUrl: 'https://example.com/connection.jpg',
          interests: ['Sports'],
        },
        mobility: { mode: 'TRAVELER', area: { country: 'USA' } },
      };

      const mockCurrentUser = {
        connections: {
          connections: ['connection-789'],
          friends: [],
        },
      };

      mockDb.collection.mockImplementation((name) => {
        if (name === 'users') {
          return {
            doc: jest.fn().mockImplementation((id) => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => id === 'test-user-123' ? mockCurrentUser : mockConnection,
              }),
            })),
          };
        }
        if (name === 'matches') {
          return {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true }),
          };
        }
        return { doc: jest.fn() };
      });

      const response = await request
        .get('/api/users/connection-789')
        .expect(200);

      expect(response.body.user.status).toBe('connection');
      expect(response.body.user.profile.photoUrl).toBeNull(); // Not visible to non-friends
    });

    it('should return 403 for unconnected users', async () => {
      const mockCurrentUser = {
        connections: {
          connections: [],
          friends: [],
        },
      };

      mockDb.collection.mockImplementation((name) => {
        if (name === 'users') {
          return {
            doc: jest.fn().mockImplementation((id) => ({
              get: jest.fn().mockResolvedValue({
                exists: true,
                data: () => id === 'test-user-123' ? mockCurrentUser : { userId: 'stranger-999' },
              }),
            })),
          };
        }
        if (name === 'matches') {
          return {
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({ empty: true }),
          };
        }
        return { doc: jest.fn() };
      });

      await request
        .get('/api/users/stranger-999')
        .expect(403);
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
        .get('/api/users/non-existent')
        .expect(404);
    });
  });

  describe('PUT /api/users/mobility', () => {
    it('should update user mobility', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});

      mockDb.collection.mockReturnValue({
        doc: jest.fn().mockReturnValue({
          update: mockUpdate,
        }),
      });

      const response = await request
        .put('/api/users/mobility')
        .send({
          mode: 'TRAVELER',
          area: { country: 'Germany', city: 'Berlin' },
          travelReason: 'RELOCATING',
          goal: 'MAKE_FRIENDS',
          connectionIntent: 'COMMUNITY',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should reject invalid mode', async () => {
      await request
        .put('/api/users/mobility')
        .send({
          mode: 'INVALID_MODE',
          area: { country: 'Germany' },
        })
        .expect(400);
    });

    it('should reject invalid travel reason', async () => {
      await request
        .put('/api/users/mobility')
        .send({
          mode: 'TRAVELER',
          area: { country: 'Germany' },
          travelReason: 'INVALID_REASON',
        })
        .expect(400);
    });

    it('should reject invalid goal', async () => {
      await request
        .put('/api/users/mobility')
        .send({
          mode: 'LOCAL',
          area: { country: 'Germany' },
          goal: 'INVALID_GOAL',
        })
        .expect(400);
    });
  });

  describe('GET /api/users/friends', () => {
    it('should return list of friends', async () => {
      const mockMatches = [
        {
          id: 'match-1',
          data: () => ({
            user1Id: 'test-user-123',
            user2Id: 'friend-456',
            user2Profile: { name: 'Friend 1', interests: ['Travel'] },
            status: 'friends',
            compatibilityScore: 85,
            sharedInterests: ['Travel'],
          }),
        },
      ];

      mockDb.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          size: 1,
          forEach: (fn) => mockMatches.forEach(fn),
        }),
      });

      const response = await request
        .get('/api/users/friends')
        .expect(200);

      expect(Array.isArray(response.body.friends)).toBe(true);
    });
  });

  describe('GET /api/users/connections', () => {
    it('should return list of connections', async () => {
      const mockMatches = [
        {
          id: 'match-2',
          data: () => ({
            user1Id: 'test-user-123',
            user2Id: 'connection-789',
            user2Profile: { name: 'Connection 1', interests: ['Music'] },
            status: 'connected',
            compatibilityScore: 72,
            sharedInterests: ['Music'],
          }),
        },
      ];

      mockDb.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          size: 1,
          forEach: (fn) => mockMatches.forEach(fn),
        }),
      });

      const response = await request
        .get('/api/users/connections')
        .expect(200);

      expect(Array.isArray(response.body.connections)).toBe(true);
    });
  });

  describe('GET /api/users/pending-requests', () => {
    it('should return pending connection requests', async () => {
      const mockMatches = [
        {
          id: 'match-3',
          data: () => ({
            user1Id: 'requester-111',
            user2Id: 'test-user-123',
            user1Profile: { name: 'Requester', interests: ['Gaming'] },
            status: 'pending',
            compatibilityScore: 68,
          }),
        },
      ];

      mockDb.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          size: 1,
          forEach: (fn) => mockMatches.forEach(fn),
        }),
      });

      const response = await request
        .get('/api/users/pending-requests')
        .expect(200);

      expect(Array.isArray(response.body.requests)).toBe(true);
    });
  });
});

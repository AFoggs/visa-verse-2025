/**
 * Matching Service Tests
 * Tests for the user matching algorithm
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

describe('Matching Service', () => {
  let calculateCompatibilityScore;
  let findMatchingUsers;

  beforeAll(async () => {
    const matchingService = await import('../services/matching.js');
    calculateCompatibilityScore = matchingService.calculateCompatibilityScore;
    findMatchingUsers = matchingService.findMatchingUsers;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateCompatibilityScore', () => {
    it('should calculate high score for matching local and traveler in same destination', () => {
      const local = {
        mobility: {
          mode: 'LOCAL',
          area: { country: 'Germany', city: 'Berlin' },
          connectionIntent: 'COMMUNITY',
        },
        profile: {
          interests: ['Travel', 'Music', 'Photography', 'Food'],
        },
      };

      const traveler = {
        mobility: {
          mode: 'TRAVELER',
          area: { country: 'Germany', city: 'Berlin' },
          connectionIntent: 'COMMUNITY',
        },
        profile: {
          interests: ['Travel', 'Music', 'Art', 'Coffee'],
        },
      };

      const result = calculateCompatibilityScore(local, traveler);

      expect(result.score).toBeGreaterThan(70);
      expect(result.sharedInterests).toContain('Travel');
      expect(result.sharedInterests).toContain('Music');
      expect(result.matchReasons).toBeDefined();
    });

    it('should calculate lower score for different destinations', () => {
      const user1 = {
        mobility: {
          mode: 'TRAVELER',
          area: { country: 'Germany', city: 'Berlin' },
          connectionIntent: 'COMMUNITY',
        },
        profile: {
          interests: ['Travel', 'Music'],
        },
      };

      const user2 = {
        mobility: {
          mode: 'LOCAL',
          area: { country: 'France', city: 'Paris' },
          connectionIntent: 'COMMUNITY',
        },
        profile: {
          interests: ['Travel', 'Music'],
        },
      };

      const result = calculateCompatibilityScore(user1, user2);

      // Should still have some score from interests but lower overall
      expect(result.score).toBeLessThan(50);
    });

    it('should give bonus for same country different city', () => {
      const user1 = {
        mobility: {
          mode: 'TRAVELER',
          area: { country: 'Germany', city: 'Berlin' },
          connectionIntent: 'COMMUNITY',
        },
        profile: {
          interests: ['Travel', 'Music'],
        },
      };

      const user2 = {
        mobility: {
          mode: 'LOCAL',
          area: { country: 'Germany', city: 'Munich' },
          connectionIntent: 'COMMUNITY',
        },
        profile: {
          interests: ['Travel', 'Music'],
        },
      };

      const result = calculateCompatibilityScore(user1, user2);

      // Should have country match bonus
      expect(result.matchReasons).toContain('Same country');
    });

    it('should give bonus for matching connection intents', () => {
      const user1 = {
        mobility: {
          mode: 'TRAVELER',
          area: { country: 'Germany', city: 'Berlin' },
          connectionIntent: 'CAREER',
        },
        profile: {
          interests: ['Networking', 'Business'],
        },
      };

      const user2 = {
        mobility: {
          mode: 'LOCAL',
          area: { country: 'Germany', city: 'Berlin' },
          connectionIntent: 'CAREER',
        },
        profile: {
          interests: ['Networking', 'Entrepreneurship'],
        },
      };

      const result = calculateCompatibilityScore(user1, user2);

      expect(result.matchReasons).toContain('Similar goals');
    });

    it('should handle users without mobility data', () => {
      const user1 = {
        profile: {
          interests: ['Travel', 'Music'],
        },
      };

      const user2 = {
        profile: {
          interests: ['Travel', 'Photography'],
        },
      };

      const result = calculateCompatibilityScore(user1, user2);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.sharedInterests).toContain('Travel');
    });

    it('should handle empty interests arrays', () => {
      const user1 = {
        mobility: {
          mode: 'TRAVELER',
          area: { country: 'Germany' },
        },
        profile: {
          interests: [],
        },
      };

      const user2 = {
        mobility: {
          mode: 'LOCAL',
          area: { country: 'Germany' },
        },
        profile: {
          interests: [],
        },
      };

      const result = calculateCompatibilityScore(user1, user2);

      expect(result.sharedInterests).toEqual([]);
    });

    it('should prioritize local-traveler matches over same-mode matches', () => {
      const local = {
        mobility: {
          mode: 'LOCAL',
          area: { country: 'Germany', city: 'Berlin' },
          connectionIntent: 'COMMUNITY',
        },
        profile: {
          interests: ['Travel', 'Music'],
        },
      };

      const traveler = {
        mobility: {
          mode: 'TRAVELER',
          area: { country: 'Germany', city: 'Berlin' },
          connectionIntent: 'COMMUNITY',
        },
        profile: {
          interests: ['Travel', 'Music'],
        },
      };

      const anotherLocal = {
        mobility: {
          mode: 'LOCAL',
          area: { country: 'Germany', city: 'Berlin' },
          connectionIntent: 'COMMUNITY',
        },
        profile: {
          interests: ['Travel', 'Music'],
        },
      };

      const localTravelerScore = calculateCompatibilityScore(local, traveler);
      const localLocalScore = calculateCompatibilityScore(local, anotherLocal);

      expect(localTravelerScore.score).toBeGreaterThan(localLocalScore.score);
    });
  });

  describe('findMatchingUsers', () => {
    it('should find and rank potential matches', async () => {
      const currentUser = {
        userId: 'user-123',
        mobility: {
          mode: 'TRAVELER',
          area: { country: 'Germany', city: 'Berlin' },
          connectionIntent: 'COMMUNITY',
        },
        profile: {
          interests: ['Travel', 'Music', 'Photography'],
        },
        connections: {
          connections: [],
          friends: [],
        },
      };

      const potentialMatches = [
        {
          id: 'local-1',
          data: () => ({
            userId: 'local-1',
            onboardingComplete: true,
            mobility: {
              mode: 'LOCAL',
              area: { country: 'Germany', city: 'Berlin' },
              connectionIntent: 'COMMUNITY',
            },
            profile: {
              interests: ['Travel', 'Music', 'Art'],
            },
          }),
        },
        {
          id: 'local-2',
          data: () => ({
            userId: 'local-2',
            onboardingComplete: true,
            mobility: {
              mode: 'LOCAL',
              area: { country: 'Germany', city: 'Munich' },
              connectionIntent: 'CAREER',
            },
            profile: {
              interests: ['Business', 'Networking'],
            },
          }),
        },
      ];

      mockDb.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: potentialMatches,
          empty: false,
        }),
      });

      const matches = await findMatchingUsers(currentUser, 10);

      expect(Array.isArray(matches)).toBe(true);
      // Berlin local should rank higher than Munich local
      if (matches.length >= 2) {
        expect(matches[0].userId).toBe('local-1');
      }
    });

    it('should exclude already connected users', async () => {
      const currentUser = {
        userId: 'user-123',
        mobility: {
          mode: 'TRAVELER',
          area: { country: 'Germany', city: 'Berlin' },
        },
        profile: {
          interests: ['Travel'],
        },
        connections: {
          connections: ['connected-user'],
          friends: ['friend-user'],
        },
      };

      const potentialMatches = [
        {
          id: 'connected-user',
          data: () => ({
            userId: 'connected-user',
            onboardingComplete: true,
            mobility: { mode: 'LOCAL', area: { country: 'Germany', city: 'Berlin' } },
            profile: { interests: ['Travel'] },
          }),
        },
        {
          id: 'new-user',
          data: () => ({
            userId: 'new-user',
            onboardingComplete: true,
            mobility: { mode: 'LOCAL', area: { country: 'Germany', city: 'Berlin' } },
            profile: { interests: ['Travel'] },
          }),
        },
      ];

      mockDb.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: potentialMatches,
          empty: false,
        }),
      });

      const matches = await findMatchingUsers(currentUser, 10);

      expect(matches.find(m => m.userId === 'connected-user')).toBeUndefined();
      expect(matches.find(m => m.userId === 'new-user')).toBeDefined();
    });

    it('should exclude users without completed onboarding', async () => {
      const currentUser = {
        userId: 'user-123',
        mobility: {
          mode: 'TRAVELER',
          area: { country: 'Germany', city: 'Berlin' },
        },
        profile: {
          interests: ['Travel'],
        },
        connections: {
          connections: [],
          friends: [],
        },
      };

      const potentialMatches = [
        {
          id: 'incomplete-user',
          data: () => ({
            userId: 'incomplete-user',
            onboardingComplete: false,
            mobility: { mode: 'LOCAL', area: { country: 'Germany', city: 'Berlin' } },
            profile: { interests: ['Travel'] },
          }),
        },
        {
          id: 'complete-user',
          data: () => ({
            userId: 'complete-user',
            onboardingComplete: true,
            mobility: { mode: 'LOCAL', area: { country: 'Germany', city: 'Berlin' } },
            profile: { interests: ['Travel'] },
          }),
        },
      ];

      mockDb.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: potentialMatches,
          empty: false,
        }),
      });

      const matches = await findMatchingUsers(currentUser, 10);

      expect(matches.find(m => m.userId === 'incomplete-user')).toBeUndefined();
    });

    it('should return empty array when no matches found', async () => {
      const currentUser = {
        userId: 'user-123',
        mobility: {
          mode: 'TRAVELER',
          area: { country: 'Antarctica' },
        },
        profile: {
          interests: ['Penguins'],
        },
        connections: {
          connections: [],
          friends: [],
        },
      };

      mockDb.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: [],
          empty: true,
        }),
      });

      const matches = await findMatchingUsers(currentUser, 10);

      expect(matches).toEqual([]);
    });

    it('should respect the limit parameter', async () => {
      const currentUser = {
        userId: 'user-123',
        mobility: {
          mode: 'TRAVELER',
          area: { country: 'Germany', city: 'Berlin' },
        },
        profile: {
          interests: ['Travel'],
        },
        connections: {
          connections: [],
          friends: [],
        },
      };

      const potentialMatches = Array(20).fill(null).map((_, i) => ({
        id: `user-${i}`,
        data: () => ({
          userId: `user-${i}`,
          onboardingComplete: true,
          mobility: { mode: 'LOCAL', area: { country: 'Germany', city: 'Berlin' } },
          profile: { interests: ['Travel'] },
        }),
      }));

      mockDb.collection.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        get: jest.fn().mockResolvedValue({
          docs: potentialMatches,
          empty: false,
        }),
      });

      const matches = await findMatchingUsers(currentUser, 5);

      expect(matches.length).toBeLessThanOrEqual(5);
    });
  });
});

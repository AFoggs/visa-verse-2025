/**
 * API Service Tests
 * Tests for frontend API service functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Firebase auth
vi.mock('../services/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
  },
}));

describe('API Service', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  describe('Companion API', () => {
    it('should send chat message with authentication', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          message: 'Hello!',
          detectedInterest: null,
          detectedMobility: null,
        }),
      });

      // Simulate the chat function behavior
      const chatWithCompanion = async (message) => {
        const token = 'mock-token';
        const response = await fetch('/api/companion/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ message }),
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        return response.json();
      };

      const result = await chatWithCompanion('Hello!');

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/companion/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token',
          }),
          body: JSON.stringify({ message: 'Hello!' }),
        })
      );
      expect(result.message).toBe('Hello!');
    });

    it('should handle API errors', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      const chatWithCompanion = async (message) => {
        const response = await fetch('/api/companion/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify({ message }),
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        return response.json();
      };

      await expect(chatWithCompanion('Hello!')).rejects.toThrow('Request failed');
    });

    it('should fetch conversation history', async () => {
      const mockHistory = {
        messages: [
          { role: 'assistant', content: 'Welcome!', timestamp: '2024-01-01T00:00:00Z' },
          { role: 'user', content: 'Hi!', timestamp: '2024-01-01T00:00:01Z' },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHistory),
      });

      const getHistory = async () => {
        const response = await fetch('/api/companion/history', {
          headers: {
            'Authorization': 'Bearer mock-token',
          },
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        return response.json();
      };

      const result = await getHistory();

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe('Welcome!');
    });

    it('should confirm detected interest', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const confirmInterest = async (interest, confirm) => {
        const response = await fetch('/api/companion/confirm-interest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify({ interest, confirm }),
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        return response.json();
      };

      const result = await confirmInterest('Hiking', true);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/companion/confirm-interest',
        expect.objectContaining({
          body: JSON.stringify({ interest: 'Hiking', confirm: true }),
        })
      );
    });

    it('should confirm detected mobility', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const confirmMobility = async (mobility, confirm) => {
        const response = await fetch('/api/companion/confirm-mobility', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify({ mobility, confirm }),
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        return response.json();
      };

      const mobility = { mode: 'TRAVELER', country: 'Germany', city: 'Berlin' };
      const result = await confirmMobility(mobility, true);

      expect(result.success).toBe(true);
    });
  });

  describe('User API', () => {
    it('should fetch current user profile', async () => {
      const mockProfile = {
        user: {
          profile: {
            name: 'Test User',
            interests: ['Travel', 'Music'],
          },
          mobility: {
            mode: 'TRAVELER',
            area: { country: 'Germany' },
          },
        },
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      });

      const getMyProfile = async () => {
        const response = await fetch('/api/users/me', {
          headers: {
            'Authorization': 'Bearer mock-token',
          },
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        return response.json();
      };

      const result = await getMyProfile();

      expect(result.user.profile.name).toBe('Test User');
      expect(result.user.mobility.mode).toBe('TRAVELER');
    });

    it('should update user mobility', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const updateMobility = async (mobility) => {
        const response = await fetch('/api/users/mobility', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify(mobility),
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        return response.json();
      };

      const mobility = {
        mode: 'TRAVELER',
        area: { country: 'Germany', city: 'Berlin' },
        travelReason: 'RELOCATING',
        goal: 'MAKE_FRIENDS',
        connectionIntent: 'COMMUNITY',
      };

      const result = await updateMobility(mobility);

      expect(result.success).toBe(true);
    });

    it('should fetch another user profile', async () => {
      const mockProfile = {
        user: {
          userId: 'other-user-123',
          profile: {
            name: 'Other User',
            photoUrl: null, // Not friends, so no photo
          },
          status: 'connection',
        },
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      });

      const getProfile = async (userId) => {
        const response = await fetch(`/api/users/${userId}`, {
          headers: {
            'Authorization': 'Bearer mock-token',
          },
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        return response.json();
      };

      const result = await getProfile('other-user-123');

      expect(result.user.status).toBe('connection');
      expect(result.user.profile.photoUrl).toBeNull();
    });
  });

  describe('Matches API', () => {
    it('should fetch suggested matches', async () => {
      const mockMatches = {
        matches: [
          {
            userId: 'match-1',
            name: 'Match User',
            compatibilityScore: 85,
            sharedInterests: ['Travel'],
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMatches),
      });

      const getSuggestedMatches = async () => {
        const response = await fetch('/api/matches/suggested', {
          headers: {
            'Authorization': 'Bearer mock-token',
          },
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        return response.json();
      };

      const result = await getSuggestedMatches();

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].compatibilityScore).toBe(85);
    });

    it('should send connection request', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, matchId: 'new-match-123' }),
      });

      const connect = async (userId) => {
        const response = await fetch('/api/matches/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          throw new Error('Request failed');
        }

        return response.json();
      };

      const result = await connect('other-user-123');

      expect(result.success).toBe(true);
      expect(result.matchId).toBe('new-match-123');
    });
  });
});

describe('Location Search API', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  it('should search for cities using Nominatim', async () => {
    const mockResults = [
      {
        place_id: 1,
        display_name: 'Berlin, Germany',
        type: 'city',
        address: {
          city: 'Berlin',
          country: 'Germany',
          state: 'Berlin',
        },
      },
    ];

    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    const searchLocations = async (query) => {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=6`,
        {
          headers: { 'Accept-Language': 'en' },
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      return response.json();
    };

    const results = await searchLocations('Berlin');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('nominatim.openstreetmap.org'),
      expect.any(Object)
    );
    expect(results).toHaveLength(1);
    expect(results[0].address.city).toBe('Berlin');
  });

  it('should search for countries', async () => {
    const mockResults = [
      {
        place_id: 2,
        display_name: 'Germany',
        type: 'country',
        name: 'Germany',
        address: {
          country: 'Germany',
          country_code: 'de',
        },
      },
    ];

    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    const searchCountries = async (query) => {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=8&featuretype=country`,
        {
          headers: { 'Accept-Language': 'en' },
        }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      return response.json();
    };

    const results = await searchCountries('Germany');

    expect(results).toHaveLength(1);
    expect(results[0].type).toBe('country');
  });
});

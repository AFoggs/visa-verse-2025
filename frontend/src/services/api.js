const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function getAuthToken() {
  const { auth } = await import('./firebase');
  const user = auth.currentUser;
  if (user) {
    return await user.getIdToken();
  }
  return null;
}

async function fetchWithAuth(endpoint, options = {}) {
  const token = await getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// Companion API
export const companionApi = {
  chat: (message) =>
    fetchWithAuth('/api/companion/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),

  getHistory: () => fetchWithAuth('/api/companion/history'),

  getInsights: () => fetchWithAuth('/api/companion/insights'),

  confirmInterest: (interest, confirm) =>
    fetchWithAuth('/api/companion/confirm-interest', {
      method: 'POST',
      body: JSON.stringify({ interest, confirm }),
    }),

  confirmMobility: (mobility, confirm) =>
    fetchWithAuth('/api/companion/confirm-mobility', {
      method: 'POST',
      body: JSON.stringify({ mobility, confirm }),
    }),
};

// Matches API
export const matchesApi = {
  getMatches: () => fetchWithAuth('/api/matches'),

  getSuggestedMatches: () => fetchWithAuth('/api/matches/suggested'),

  connect: (userId) =>
    fetchWithAuth('/api/matches/connect', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  decline: (userId, feedback) =>
    fetchWithAuth('/api/matches/decline', {
      method: 'POST',
      body: JSON.stringify({ userId, feedback }),
    }),

  getMatch: (matchId) => fetchWithAuth(`/api/matches/${matchId}`),

  rateConnection: (matchId, rating) =>
    fetchWithAuth(`/api/matches/${matchId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    }),

  requestFriend: (matchId) =>
    fetchWithAuth(`/api/matches/${matchId}/friend-request`, {
      method: 'POST',
    }),

  acceptFriend: (matchId) =>
    fetchWithAuth(`/api/matches/${matchId}/accept-friend`, {
      method: 'POST',
    }),

  acceptConnection: (matchId) =>
    fetchWithAuth(`/api/matches/accept/${matchId}`, {
      method: 'POST',
    }),

  removeConnection: (matchId, reason) =>
    fetchWithAuth(`/api/matches/${matchId}/remove`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  reportUser: (matchId, reason, details) =>
    fetchWithAuth(`/api/matches/${matchId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    }),
};

// Chat API
export const chatApi = {
  getConversation: (matchId) => fetchWithAuth(`/api/chat/${matchId}`),

  sendMessage: (matchId, content, type = 'text') =>
    fetchWithAuth(`/api/chat/${matchId}/message`, {
      method: 'POST',
      body: JSON.stringify({ content, type }),
    }),

  getIcebreakers: (matchId) => fetchWithAuth(`/api/chat/${matchId}/icebreakers`),

  getTopicPrompt: (matchId) => fetchWithAuth(`/api/chat/${matchId}/topic-prompt`),
};

// User API
export const userApi = {
  getProfile: (userId) => fetchWithAuth(`/api/users/${userId}`),

  getMe: () => fetchWithAuth('/api/users/me'),

  updateProfile: (updates) =>
    fetchWithAuth('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  getMobility: () => fetchWithAuth('/api/users/mobility'),

  updateMobility: (mobility) =>
    fetchWithAuth('/api/users/mobility', {
      method: 'PUT',
      body: JSON.stringify(mobility),
    }),

  getFriends: () => fetchWithAuth('/api/users/friends'),

  getConnections: () => fetchWithAuth('/api/users/connections'),

  getPendingRequests: () => fetchWithAuth('/api/users/pending-requests'),

  getSentRequests: () => fetchWithAuth('/api/users/sent-requests'),
};

// Games API
export const gamesApi = {
  startGame: (matchId, gameType) =>
    fetchWithAuth(`/api/games/${matchId}/start`, {
      method: 'POST',
      body: JSON.stringify({ gameType }),
    }),

  acceptGame: (matchId) =>
    fetchWithAuth(`/api/games/${matchId}/accept`, {
      method: 'POST',
    }),

  declineGame: (matchId) =>
    fetchWithAuth(`/api/games/${matchId}/decline`, {
      method: 'POST',
    }),

  submitMove: (matchId, move) =>
    fetchWithAuth(`/api/games/${matchId}/move`, {
      method: 'POST',
      body: JSON.stringify({ move }),
    }),

  getGameState: (matchId) => fetchWithAuth(`/api/games/${matchId}/state`),
};

// City Discovery API
export const cityDiscoveryApi = {
  // Get personalized city content
  getCityContent: (cityId) => fetchWithAuth(`/api/city-discovery/${cityId}`),

  // Force regenerate personalized content
  regenerateCityContent: (cityId) =>
    fetchWithAuth(`/api/city-discovery/${cityId}/generate`, {
      method: 'POST',
    }),

  // Find relevant locals for a city
  getRelevantLocals: (cityId) => fetchWithAuth(`/api/city-discovery/${cityId}/locals`),

  // Bookmark management
  addBookmark: (cityId, item) =>
    fetchWithAuth(`/api/city-discovery/${cityId}/bookmark`, {
      method: 'POST',
      body: JSON.stringify({ item }),
    }),

  removeBookmark: (cityId, item) =>
    fetchWithAuth(`/api/city-discovery/${cityId}/bookmark`, {
      method: 'DELETE',
      body: JSON.stringify({ item }),
    }),

  getBookmarks: (cityId) => fetchWithAuth(`/api/city-discovery/${cityId}/bookmarks`),

  // Notes management
  saveNotes: (cityId, notes) =>
    fetchWithAuth(`/api/city-discovery/${cityId}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    }),

  getNotes: (cityId) => fetchWithAuth(`/api/city-discovery/${cityId}/notes`),

  // Get available cities
  getAvailableCities: () => fetchWithAuth('/api/city-discovery/cities/available'),

  // Create a new city
  createCity: (cityName, country) =>
    fetchWithAuth('/api/city-discovery/cities/create', {
      method: 'POST',
      body: JSON.stringify({ cityName, country }),
    }),
};

export default {
  companionApi,
  matchesApi,
  chatApi,
  userApi,
  gamesApi,
  cityDiscoveryApi,
};

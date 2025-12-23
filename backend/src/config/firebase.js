import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';

let db;
let auth;

export function initializeFirebase() {
  try {
    let credential;

    // Try to load from file first
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY && existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)) {
      const serviceAccount = JSON.parse(
        readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, 'utf8')
      );
      credential = admin.credential.cert(serviceAccount);
    }
    // Try environment variables
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    }
    // Use default credentials (for Google Cloud environments)
    else {
      credential = admin.credential.applicationDefault();
    }

    admin.initializeApp({
      credential,
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    db = admin.firestore();
    auth = admin.auth();

    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Firebase initialization error:', error);
    // Initialize with mock for development if Firebase is not configured
    if (process.env.NODE_ENV === 'development') {
      console.log('Running in development mode without Firebase');
      db = createMockFirestore();
      auth = createMockAuth();
    } else {
      throw error;
    }
  }
}

// Mock Firestore for development without credentials
function createMockFirestore() {
  const mockData = new Map();

  return {
    collection: (name) => ({
      doc: (id) => ({
        get: async () => ({
          exists: mockData.has(`${name}/${id}`),
          data: () => mockData.get(`${name}/${id}`),
          id,
        }),
        set: async (data) => {
          mockData.set(`${name}/${id}`, { ...data, id });
        },
        update: async (data) => {
          const existing = mockData.get(`${name}/${id}`) || {};
          mockData.set(`${name}/${id}`, { ...existing, ...data });
        },
        delete: async () => {
          mockData.delete(`${name}/${id}`);
        },
      }),
      where: () => ({
        where: () => ({
          get: async () => ({ docs: [], empty: true }),
          limit: () => ({ get: async () => ({ docs: [], empty: true }) }),
        }),
        get: async () => ({ docs: [], empty: true }),
        limit: () => ({ get: async () => ({ docs: [], empty: true }) }),
      }),
      get: async () => ({ docs: [], empty: true }),
      add: async (data) => {
        const id = `mock_${Date.now()}`;
        mockData.set(`${name}/${id}`, { ...data, id });
        return { id };
      },
    }),
  };
}

function createMockAuth() {
  return {
    verifyIdToken: async (token) => {
      // For development, accept any token and return mock user
      return {
        uid: token.startsWith('mock_') ? token : `mock_${Date.now()}`,
        email: 'dev@example.com',
      };
    },
  };
}

export function getDb() {
  return db;
}

export function getAuth() {
  return auth;
}

export default admin;

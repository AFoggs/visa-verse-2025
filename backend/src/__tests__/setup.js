// Test setup and environment configuration
process.env.NODE_ENV = 'test';
process.env.ANTHROPIC_API_KEY = 'test-api-key';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.PORT = '5001';

// Global test utilities
global.mockFirebaseDoc = (data = {}) => ({
  exists: true,
  data: () => data,
  id: 'test-doc-id',
});

global.mockFirebaseDocNotFound = () => ({
  exists: false,
  data: () => null,
});

global.mockFirebaseCollection = (docs = []) => ({
  get: jest.fn().mockResolvedValue({
    docs: docs.map((doc, i) => ({
      id: doc.id || `doc-${i}`,
      data: () => doc,
    })),
    empty: docs.length === 0,
    size: docs.length,
    forEach: (fn) => docs.forEach((doc, i) => fn({ id: doc.id || `doc-${i}`, data: () => doc })),
  }),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
});

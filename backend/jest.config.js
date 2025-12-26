export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/scripts/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000,
  // Mock environment variables for tests
  setupFiles: ['<rootDir>/src/__tests__/setup.js'],
};

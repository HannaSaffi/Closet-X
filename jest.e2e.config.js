module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/e2e/**/*.test.js'],
  coverageDirectory: 'coverage/e2e',
  testTimeout: 60000,
  verbose: true,
  maxWorkers: 1 // Run E2E tests sequentially
};

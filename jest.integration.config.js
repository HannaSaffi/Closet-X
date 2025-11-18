module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/integration/**/*.test.js'],
  coverageDirectory: 'coverage/integration',
  collectCoverageFrom: [
    'services/**/src/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  testTimeout: 30000,
  verbose: true
};

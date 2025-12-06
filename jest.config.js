// jest.config.js
/**
 * Root-level Jest configuration for Closet-X
 * This configuration is used for running all tests across the project
 */

module.exports = {
  // Use Node environment for all tests
  testEnvironment: 'node',
  
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  
  // Collect coverage from all relevant files
  collectCoverageFrom: [
    'services/**/src/**/*.js',
    'workers/**/src/**/*.js',
    'shared/**/*.js',
    '!**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!**/dist/**',
    '!**/build/**',
    '!**/*.config.js',
    '!**/index.js' // Exclude entry points that just start servers
  ],
  
  // Coverage directory
  coverageDirectory: 'coverage',
  
  // Coverage thresholds - enforce minimum coverage
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],
  
  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/'
  ],
  
  // Module paths
  modulePaths: ['<rootDir>'],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test timeout (30 seconds for integration tests)
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Detect open handles to prevent hanging tests
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Projects configuration for running tests in different services
  projects: [
    {
      displayName: 'user-service',
      testMatch: ['<rootDir>/services/user-service/tests/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'wardrobe-service',
      testMatch: ['<rootDir>/services/wardrobe-service/tests/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'outfit-service',
      testMatch: ['<rootDir>/services/outfit-service/tests/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'workers',
      testMatch: ['<rootDir>/workers/**/tests/**/*.test.js'],
      testEnvironment: 'node'
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      testTimeout: 60000
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      testEnvironment: 'node',
      testTimeout: 120000,
      maxWorkers: 1 // Run E2E tests sequentially
    }
  ],
  
  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],
  
  // Transform files (if needed for ES modules)
  transform: {},
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],
  
  // Global setup/teardown
  // globalSetup: '<rootDir>/tests/globalSetup.js',
  // globalTeardown: '<rootDir>/tests/globalTeardown.js',
  
  // Max workers for parallel test execution
  maxWorkers: '50%',
  
  // Bail after first test failure (useful for CI)
  // bail: 1,
  
  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache'
};

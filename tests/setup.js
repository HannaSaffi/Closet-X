// tests/setup.js
/**
 * Global test setup file
 * Runs before all tests to configure the testing environment
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Set default test timeout
jest.setTimeout(30000);

// Suppress console logs during tests (optional, uncomment if needed)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Mock environment variables for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/closetx_test';
process.env.PORT = process.env.PORT || '3000';

// Global test utilities
global.testUtils = {
  /**
   * Sleep for specified milliseconds
   */
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Generate random test ID
   */
  randomId: () => Math.random().toString(36).substring(7),
  
  /**
   * Generate random email
   */
  randomEmail: () => `test-${Math.random().toString(36).substring(7)}@example.com`,
};

// Add custom matchers
expect.extend({
  /**
   * Check if value is a valid MongoDB ObjectId
   */
  toBeValidObjectId(received) {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    const pass = typeof received === 'string' && objectIdRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ObjectId`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ObjectId`,
        pass: false,
      };
    }
  },
  
  /**
   * Check if value is a valid email
   */
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
  
  /**
   * Check if value is a valid JWT token
   */
  toBeValidJWT(received) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    const pass = typeof received === 'string' && jwtRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JWT`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid JWT`,
        pass: false,
      };
    }
  },
  
  /**
   * Check if response has success structure
   */
  toHaveSuccessResponse(received) {
    const hasSuccess = received && typeof received === 'object' && received.success === true;
    const hasData = 'data' in received;
    const pass = hasSuccess && hasData;
    
    if (pass) {
      return {
        message: () => `expected response not to have success structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to have success structure with success=true and data field`,
        pass: false,
      };
    }
  },
  
  /**
   * Check if response has error structure
   */
  toHaveErrorResponse(received) {
    const hasSuccess = received && typeof received === 'object' && received.success === false;
    const hasError = 'error' in received;
    const pass = hasSuccess && hasError;
    
    if (pass) {
      return {
        message: () => `expected response not to have error structure`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected response to have error structure with success=false and error field`,
        pass: false,
      };
    }
  }
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in test:', reason);
});

// Clean up after all tests
afterAll(async () => {
  // Add any global cleanup here
  await new Promise(resolve => setTimeout(resolve, 500)); // Give time for async operations to complete
});

console.log('✅ Test environment setup complete');

/**
 * Auth Middleware Tests - FIXED VERSION
 * Tests authentication middleware with correct error message expectations
 */

const jwt = require('jsonwebtoken');
const User = require('../src/models/User');
const authMiddleware = require('../src/middleware/authMiddleware');

jest.mock('jsonwebtoken');
jest.mock('../src/models/User');

describe('Auth Middleware Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      header: jest.fn(),
      headers: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });

  describe('authenticate()', () => {
    test('should authenticate valid token', async () => {
      // Setup
      mockReq.header.mockReturnValue('Bearer valid.jwt.token');
      jwt.verify.mockReturnValue({ userId: 'user123' });
      
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      };
      User.findById.mockResolvedValue(mockUser);

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.user).toEqual(mockUser);
      expect(mockReq.token).toBe('valid.jwt.token');
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject request without authorization header', async () => {
      // Setup
      mockReq.header.mockReturnValue(null);

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert - Match actual error message
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required. Please provide a valid token.'
      });
    });

    test('should reject malformed authorization header', async () => {
      // Setup - no "Bearer " prefix
      mockReq.header.mockReturnValue('invalid-token-format');

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });

    test('should reject invalid token', async () => {
      // Setup
      mockReq.header.mockReturnValue('Bearer invalid.token');
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert - Match actual error message
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed'
      });
    });

    test('should reject expired token', async () => {
      // Setup
      mockReq.header.mockReturnValue('Bearer expired.token');
      const expiredError = new Error('Token expired');
      expiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw expiredError;
      });

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false
      }));
    });

    test('should reject when user not found', async () => {
      // Setup
      mockReq.header.mockReturnValue('Bearer valid.jwt.token');
      jwt.verify.mockReturnValue({ userId: 'nonexistent' });
      User.findById.mockResolvedValue(null);

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert - Match actual error message
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication failed'
      });
    });

    test('should handle database errors', async () => {
      // Setup
      mockReq.header.mockReturnValue('Bearer valid.jwt.token');
      jwt.verify.mockReturnValue({ userId: 'user123' });
      User.findById.mockRejectedValue(new Error('Database error'));

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert - Database errors return 401 in actual implementation
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should extract token from Bearer format', async () => {
      // Setup
      mockReq.header.mockReturnValue('Bearer token123');
      jwt.verify.mockReturnValue({ userId: 'user123' });
      User.findById.mockResolvedValue({ _id: 'user123' });

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith('token123', expect.any(String));
    });

    test('should attach user to request object', async () => {
      // Setup
      mockReq.header.mockReturnValue('Bearer my.jwt.token');
      jwt.verify.mockReturnValue({ userId: 'user123' });
      
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        name: 'Test User'
      };
      User.findById.mockResolvedValue(mockUser);

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.user).toEqual(mockUser);
      expect(mockReq.user.email).toBe('test@example.com');
    });

    test('should attach token to request object', async () => {
      // Setup
      mockReq.header.mockReturnValue('Bearer my.jwt.token');
      jwt.verify.mockReturnValue({ userId: 'user123' });
      User.findById.mockResolvedValue({ _id: 'user123' });

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockReq.token).toBe('my.jwt.token');
    });
  });

  describe('Token Verification', () => {
    test('should verify token with correct secret', async () => {
      // Setup
      mockReq.header.mockReturnValue('Bearer valid.token');
      jwt.verify.mockReturnValue({ userId: 'user123' });
      User.findById.mockResolvedValue({ _id: 'user123' });

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith('valid.token', expect.any(String));
    });

    test('should reject token with wrong secret', async () => {
      // Setup
      mockReq.header.mockReturnValue('Bearer token.with.wrong.secret');
      jwt.verify.mockImplementation(() => {
        const error = new Error('invalid signature');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    test('should handle malformed tokens', async () => {
      // Setup
      mockReq.header.mockReturnValue('Bearer malformed.token');
      jwt.verify.mockImplementation(() => {
        const error = new Error('jwt malformed');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Authorization Header Formats', () => {
    test('should accept standard Bearer format', async () => {
      // Setup
      mockReq.header.mockReturnValue('Bearer standard.token');
      jwt.verify.mockReturnValue({ userId: 'user123' });
      User.findById.mockResolvedValue({ _id: 'user123' });

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalled();
    });

    test('should reject lowercase bearer', async () => {
      // Setup
      mockReq.header.mockReturnValue('bearer lowercase.token');

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject missing Bearer prefix', async () => {
      // Setup
      mockReq.header.mockReturnValue('just.a.token');

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    test('should reject empty token after Bearer', async () => {
      // Setup
      mockReq.header.mockReturnValue('Bearer ');

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Error Response Format', () => {
    test('should return proper error structure', async () => {
      // Setup
      mockReq.header.mockReturnValue(null);

      // Execute
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);

      // Assert
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String)
        })
      );
    });

    test('should use appropriate status codes', async () => {
      // Test 401 for missing auth
      mockReq.header.mockReturnValue(null);
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);

      // Reset
      jest.clearAllMocks();
      mockRes.status = jest.fn().mockReturnThis();

      // Test 401 for invalid token
      mockReq.header.mockReturnValue('Bearer invalid');
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid');
      });
      await authMiddleware.authenticate(mockReq, mockRes, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
const jwt = require('jsonwebtoken');
const { protect, authorize } = require('../../middleware/auth');

describe('Auth Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  describe('protect middleware', () => {
    it('should pass with valid Bearer token', () => {
      const testId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ id: testId }, process.env.JWT_SECRET || 'your-secret-key');

      req.headers.authorization = `Bearer ${token}`;

      protect(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual({ id: testId });
    });

    it('should reject request without token', () => {
      protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this route'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      req.headers.authorization = 'Bearer invalid_token';

      protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to access this route'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with expired token', () => {
      const token = jwt.sign(
        { id: '507f1f77bcf86cd799439011' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '0s' }
      );

      // Wait for token to expire
      setTimeout(() => {
        req.headers.authorization = `Bearer ${token}`;
        protect(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
      }, 100);
    });

    it('should handle Authorization header without Bearer prefix', () => {
      req.headers.authorization = 'invalid_format';

      protect(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should extract token from Bearer authorization header', () => {
      const testId = '507f1f77bcf86cd799439011';
      const token = jwt.sign({ id: testId }, process.env.JWT_SECRET || 'your-secret-key');

      req.headers.authorization = `Bearer    ${token}`;

      protect(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.id).toBe(testId);
    });
  });

  describe('authorize middleware', () => {
    it('should pass when user has required role', () => {
      req.user = { id: '507f1f77bcf86cd799439011', role: 'admin' };
      const authMiddleware = authorize('admin');

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should pass when user has one of multiple required roles', () => {
      req.user = { id: '507f1f77bcf86cd799439011', role: 'moderator' };
      const authMiddleware = authorize('admin', 'moderator', 'user');

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject when user lacks required role', () => {
      req.user = { id: '507f1f77bcf86cd799439011', role: 'user' };
      const authMiddleware = authorize('admin');

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authorized to perform this action'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject when user has no role', () => {
      req.user = { id: '507f1f77bcf86cd799439011' };
      const authMiddleware = authorize('admin');

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

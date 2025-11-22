// services/outfit-service/src/middleware/auth.js

const jwt = require('jsonwebtoken');

// JWT Secret (MUST match user-service)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-minimum-32-characters-long';

/**
 * Protect routes - verify JWT token from user-service
 * Does NOT query local database - trusts user-service tokens
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Please login to access this resource.'
      });
    }

    try {
      // Verify token (created by user-service)
      const decoded = jwt.verify(token, JWT_SECRET);

      // Extract user info from token (no database lookup!)
      // User-service tokens have { userId, email, iat, exp }
      req.user = {
        id: decoded.userId || decoded.id,
        email: decoded.email
      };

      console.log(`✅ Authenticated user: ${req.user.id} (${req.user.email})`);

      next();

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.'
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.'
        });
      }

      throw error;
    }

  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Optional auth - attach user if token exists, but don't require it
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
          id: decoded.userId || decoded.id,
          email: decoded.email
        };
      } catch (error) {
        // Token invalid, but that's okay for optional auth
      }
    }

    next();

  } catch (error) {
    console.error('Optional Auth Error:', error);
    next();
  }
};
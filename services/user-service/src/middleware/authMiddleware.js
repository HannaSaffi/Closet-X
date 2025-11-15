// services/user-service/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required. Please provide a valid token.' 
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-change-this');
    
    // Find user with this token
    const user = await User.findOne({
      _id: decoded.userId,
      'authTokens.token': token
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token. Please login again.' 
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        error: 'Account is deactivated' 
      });
    }
    
    // Attach user and token to request
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token format' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        error: 'Token has expired. Please login again.' 
      });
    }
    
    res.status(401).json({ 
      success: false,
      error: 'Authentication failed' 
    });
  }
};

// Optional: Admin role check
exports.requireAdmin = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      error: 'Admin access required' 
    });
  }
  next();
};
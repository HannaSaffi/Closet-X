// services/user-service/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required. Please provide a valid token.' 
      });
    }
    
    // Check Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid Authorization header format. Expected: Bearer <token>' 
      });
    }
    
    const token = authHeader.replace('Bearer ', '').trim();
    
    // Check if token is empty after Bearer
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid Authorization header format. Expected: Bearer <token>' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-change-this');
    
    // Find user by ID from token
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication failed' 
      });
    }
    
    // Attach user and token to request
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    // All JWT errors return the same message
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

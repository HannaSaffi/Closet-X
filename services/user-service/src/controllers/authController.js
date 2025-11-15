// services/user-service/src/controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { email, password, name, username } = req.body;
    
    // Validation
    if (!email || !password || !name || !username) {
      return res.status(400).json({ 
        success: false,
        error: 'All fields are required' 
      });
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'User with this email or username already exists' 
      });
    }
    
    // Create user
    const user = new User({ email, password, name, username });
    await user.save();
    
    // Generate token
    const token = user.generateAuthToken();
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Email and password are required' 
      });
    }
    
    // Find user - support email or username login
    const user = await User.findOne({ 
      $or: [{ email }, { username: email }] 
    }).select('+password');
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }
    
    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        error: 'Account is deactivated' 
      });
    }
    
    // Generate token
    const token = user.generateAuthToken();
    user.lastLogin = new Date();
    await user.save();
    
    res.json({
      success: true,
      message: 'Login successful',
      user: user.toJSON(),
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

exports.logout = async (req, res) => {
  try {
    // Remove current token from user's authTokens array
    req.user.authTokens = req.user.authTokens.filter(
      tokenObj => tokenObj.token !== req.token
    );
    await req.user.save();
    
    res.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    res.json({ 
      success: true, 
      user: req.user.toJSON() 
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = ['name', 'profileImage', 'preferences'];
    const actualUpdates = Object.keys(updates);
    
    const isValidOperation = actualUpdates.every(update => 
      allowedUpdates.includes(update)
    );
    
    if (!isValidOperation) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid updates' 
      });
    }
    
    actualUpdates.forEach(update => req.user[update] = updates[update]);
    await req.user.save();
    
    res.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: req.user.toJSON() 
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};
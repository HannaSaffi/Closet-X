// services/outfit-service/src/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

/**
 * Public Routes (no authentication required)
 */

// Register new user
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

/**
 * Protected Routes (authentication required)
 */

// Get current user profile
router.get('/me', protect, authController.getMe);

// Update user profile
router.put('/profile', protect, authController.updateProfile);

// Change password
router.put('/password', protect, authController.changePassword);

// Logout
router.post('/logout', protect, authController.logout);

// Verify token
router.get('/verify', protect, authController.verifyToken);

module.exports = router;
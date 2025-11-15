// services/outfit-service/src/routes/dailyOutfitRoutes.js

const express = require('express');
const router = express.Router();
const dailyOutfitController = require('../controllers/dailyOutfitController');
const { protect } = require('../middleware/auth');

/**
 * All routes require authentication
 */

// Main endpoint: "What Should I Wear Today"
// GET /api/daily-outfit?city=New York&includeAI=true
router.get('/', protect, dailyOutfitController.getDailyOutfit);

// Get weekly outfit plan
// GET /api/daily-outfit/weekly?city=New York
router.get('/weekly', protect, dailyOutfitController.getWeeklyOutfits);

// Save outfit as favorite
// POST /api/daily-outfit/save
router.post('/save', protect, dailyOutfitController.saveFavoriteOutfit);

module.exports = router;
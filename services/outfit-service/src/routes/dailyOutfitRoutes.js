// services/outfit-service/src/routes/dailyOutfitRoutes.js

const express = require('express');
const router = express.Router();
const dailyOutfitController = require('../controllers/dailyOutfitController');
const eventOutfitController = require('../controllers/eventOutfitController');
const travelPackingController = require('../controllers/travelPackingController');
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

// Event-based outfit planner
// POST /api/daily-outfit/event
router.post('/event', protect, eventOutfitController.getEventOutfit);

// Travel packing assistant
// POST /api/daily-outfit/travel-plan
router.post('/travel-plan', protect, travelPackingController.getTravelPackingPlan);

module.exports = router;

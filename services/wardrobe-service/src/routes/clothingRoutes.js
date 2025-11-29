const express = require('express');
const router = express.Router();
const clothingController = require('../controllers/clothingController');
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const cors = require('cors');

const upload = multer({ storage: multer.memoryStorage() });

// Specific CORS config for image routes - allow all origins without credentials
const imageCorsOptions = {
  origin: '*',
  methods: ['GET', 'OPTIONS'],
  credentials: false
};

// Apply CORS to image routes
router.options('/image/:fileId', cors(imageCorsOptions));
router.get('/image/:fileId', cors(imageCorsOptions), clothingController.getImage);

router.use(authenticateToken);

router.get('/', clothingController.getAllClothingItems);
router.get('/stats', clothingController.getWardrobeStats);
router.get('/analytics', analyticsController.getWardrobeAnalytics);
router.get('/:id', clothingController.getClothingItemById);
router.post('/', upload.single('image'), clothingController.createClothingItem);
router.put('/:id', clothingController.updateClothingItem);
router.delete('/:id', clothingController.deleteClothingItem);
router.post('/:id/worn', clothingController.markAsWorn);

module.exports = router;

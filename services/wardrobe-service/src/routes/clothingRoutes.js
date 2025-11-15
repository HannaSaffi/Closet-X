const express = require('express');
const router = express.Router();
const clothingController = require('../controllers/clothingController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/image/:fileId', clothingController.getImage);

router.use(authenticateToken);

router.get('/', clothingController.getAllClothingItems);
router.get('/stats', clothingController.getWardrobeStats);
router.get('/:id', clothingController.getClothingItemById);
router.post('/', upload.single('image'), clothingController.createClothingItem);
router.put('/:id', clothingController.updateClothingItem);
router.delete('/:id', clothingController.deleteClothingItem);
router.post('/:id/worn', clothingController.markAsWorn);

module.exports = router;

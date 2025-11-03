// services/wardrobe-service/src/controllers/clothingController.js
// Controller with RabbitMQ integration

const Clothing = require('../models/Clothing');
const messageQueue = require('../services/messageQueue');

/**
 * Upload new clothing item
 * POST /api/clothing
 */
exports.uploadClothing = async (req, res) => {
  try {
    const { imageURL, category, color, brand, size } = req.body;
    const userId = req.user.id;

    // Create clothing item
    const clothing = new Clothing({
      userId,
      imageURL,
      category,
      color,
      brand,
      size,
      aiMetadata: {
        processed: false // Will be processed by worker
      }
    });

    await clothing.save();

    // Publish to RabbitMQ for async processing
    await messageQueue.publishClothingUpload(clothing);

    res.status(201).json({
      success: true,
      message: 'Clothing item uploaded successfully. AI analysis in progress...',
      data: clothing,
      processing: true
    });
  } catch (error) {
    console.error('Upload clothing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload clothing',
      error: error.message
    });
  }
};

/**
 * Get clothing item by ID
 * GET /api/clothing/:id
 */
exports.getClothing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const clothing = await Clothing.findOne({ _id: id, userId });

    if (!clothing) {
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found'
      });
    }

    res.json({
      success: true,
      data: clothing,
      aiProcessed: clothing.aiMetadata?.processed || false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get clothing item',
      error: error.message
    });
  }
};

/**
 * Get all clothing items for user
 * GET /api/clothing
 */
exports.getAllClothing = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, color, season, processed } = req.query;

    // Build filter
    const filter = { userId, isActive: true };
    
    if (category) filter.category = category;
    if (color) filter['color.primary'] = color;
    if (season) filter.season = season;
    if (processed !== undefined) {
      filter['aiMetadata.processed'] = processed === 'true';
    }

    const clothing = await Clothing.find(filter)
      .sort({ createdAt: -1 });

    // Count processing vs processed
    const stats = {
      total: clothing.length,
      processed: clothing.filter(c => c.aiMetadata?.processed).length,
      processing: clothing.filter(c => !c.aiMetadata?.processed).length
    };

    res.json({
      success: true,
      data: clothing,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get clothing items',
      error: error.message
    });
  }
};

/**
 * Update clothing item
 * PUT /api/clothing/:id
 */
exports.updateClothing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updates = req.body;

    const clothing = await Clothing.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!clothing) {
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found'
      });
    }

    res.json({
      success: true,
      message: 'Clothing item updated',
      data: clothing
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update clothing item',
      error: error.message
    });
  }
};

/**
 * Delete clothing item
 * DELETE /api/clothing/:id
 */
exports.deleteClothing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const clothing = await Clothing.findOneAndUpdate(
      { _id: id, userId },
      { isActive: false },
      { new: true }
    );

    if (!clothing) {
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found'
      });
    }

    res.json({
      success: true,
      message: 'Clothing item deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete clothing item',
      error: error.message
    });
  }
};

/**
 * Reprocess clothing item with AI
 * POST /api/clothing/:id/reprocess
 */
exports.reprocessClothing = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const clothing = await Clothing.findOne({ _id: id, userId });

    if (!clothing) {
      return res.status(404).json({
        success: false,
        message: 'Clothing item not found'
      });
    }

    // Reset AI metadata
    clothing.aiMetadata = {
      processed: false
    };
    await clothing.save();

    // Republish for processing
    await messageQueue.publishClothingUpload(clothing);

    res.json({
      success: true,
      message: 'Clothing item queued for reprocessing',
      processing: true
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reprocess clothing item',
      error: error.message
    });
  }
};
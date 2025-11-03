// services/outfit-service/src/controllers/ollamaController.js
// Controller for Ollama-powered AI features

const ollamaService = require('../services/ollamaService');
const messageQueue = require('../../wardrobe-service/src/services/messageQueue');
const Clothing = require('../../wardrobe-service/src/models/Clothing');
const User = require('../../user-service/src/models/User');

/**
 * Get fashion advice from Ollama
 * POST /api/ollama/advice
 */
exports.getFashionAdvice = async (req, res) => {
  try {
    const { query, occasion, useAsync = false } = req.body;
    const userId = req.user.id;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Query is required'
      });
    }

    if (useAsync) {
      // Async: Publish to queue and return immediately
      await messageQueue.publishFashionAdvice(userId, query, { occasion });
      
      return res.json({
        success: true,
        message: 'Fashion advice request queued. Check back in a moment.',
        async: true
      });
    } else {
      // Sync: Wait for response (with timeout)
      const user = await User.findById(userId).select('preferences');
      const wardrobe = await Clothing.find({ userId, isActive: true })
        .select('category subcategory color')
        .limit(50)
        .lean();

      const context = {
        wardrobe,
        preferences: user?.preferences || {},
        occasion: occasion || 'casual'
      };

      const advice = await ollamaService.getFashionAdvice(query, context);

      res.json({
        success: true,
        data: advice
      });
    }
  } catch (error) {
    console.error('Fashion advice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get fashion advice',
      error: error.message
    });
  }
};

/**
 * Get outfit description from Ollama
 * POST /api/ollama/describe-outfit
 */
exports.describeOutfit = async (req, res) => {
  try {
    const { clothingIds } = req.body;
    const userId = req.user.id;

    if (!clothingIds || !Array.isArray(clothingIds)) {
      return res.status(400).json({
        success: false,
        message: 'Clothing IDs array is required'
      });
    }

    // Get clothing items
    const items = await Clothing.find({
      _id: { $in: clothingIds },
      userId
    });

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No clothing items found'
      });
    }

    const description = await ollamaService.describeOutfit(items);

    res.json({
      success: true,
      data: {
        items: items.map(i => ({
          id: i._id,
          category: i.category,
          color: i.color.primary
        })),
        description
      }
    });
  } catch (error) {
    console.error('Describe outfit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to describe outfit',
      error: error.message
    });
  }
};

/**
 * Get styling tips for a clothing item
 * GET /api/ollama/styling-tips/:id
 */
exports.getStylingTips = async (req, res) => {
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

    const tips = await ollamaService.getStylingTips(clothing);

    res.json({
      success: true,
      data: {
        clothing: {
          id: clothing._id,
          category: clothing.category,
          subcategory: clothing.subcategory,
          color: clothing.color.primary
        },
        tips
      }
    });
  } catch (error) {
    console.error('Styling tips error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get styling tips',
      error: error.message
    });
  }
};

/**
 * Compare two outfits
 * POST /api/ollama/compare-outfits
 */
exports.compareOutfits = async (req, res) => {
  try {
    const { outfit1Ids, outfit2Ids, occasion = 'casual' } = req.body;
    const userId = req.user.id;

    if (!outfit1Ids || !outfit2Ids) {
      return res.status(400).json({
        success: false,
        message: 'Both outfit arrays are required'
      });
    }

    // Get items for both outfits
    const outfit1Items = await Clothing.find({
      _id: { $in: outfit1Ids },
      userId
    });

    const outfit2Items = await Clothing.find({
      _id: { $in: outfit2Ids },
      userId
    });

    const comparison = await ollamaService.compareOutfits(
      { items: outfit1Items },
      { items: outfit2Items },
      occasion
    );

    res.json({
      success: true,
      data: {
        outfit1: outfit1Items.map(i => ({ id: i._id, category: i.category, color: i.color.primary })),
        outfit2: outfit2Items.map(i => ({ id: i._id, category: i.category, color: i.color.primary })),
        comparison,
        occasion
      }
    });
  } catch (error) {
    console.error('Compare outfits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare outfits',
      error: error.message
    });
  }
};

/**
 * Analyze entire wardrobe
 * GET /api/ollama/wardrobe-insights
 */
exports.getWardrobeInsights = async (req, res) => {
  try {
    const userId = req.user.id;

    const clothing = await Clothing.find({ userId, isActive: true })
      .select('category subcategory color brand wearCount')
      .lean();

    if (clothing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No clothing items found in wardrobe'
      });
    }

    const insights = await ollamaService.analyzeWardrobe(clothing);

    res.json({
      success: true,
      data: {
        totalItems: clothing.length,
        insights
      }
    });
  } catch (error) {
    console.error('Wardrobe insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze wardrobe',
      error: error.message
    });
  }
};

/**
 * Check Ollama service health
 * GET /api/ollama/health
 */
exports.checkOllamaHealth = async (req, res) => {
  try {
    const health = await ollamaService.healthCheck();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Ollama service unavailable',
      error: error.message
    });
  }
};
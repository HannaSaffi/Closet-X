// services/wardrobe-service/src/controllers/analyticsController.js

const mongoose = require('mongoose');
const ClothingItem = require('../models/ClothingItem');

/**
 * Get comprehensive wardrobe analytics
 * GET /api/analytics/wardrobe
 */
exports.getWardrobeAnalytics = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.userId);

    // Get most worn items
    const mostWorn = await ClothingItem.find({ userId })
      .sort({ wearCount: -1 })
      .limit(10)
      .lean();

    // Get least worn items (excluding never worn)
    const leastWorn = await ClothingItem.find({ userId, wearCount: { $gt: 0 } })
      .sort({ wearCount: 1 })
      .limit(10)
      .lean();

    // Get never worn items
    const neverWorn = await ClothingItem.find({ userId, wearCount: 0 })
      .sort({ createdAt: -1 })
      .lean();

    // Category breakdown with more details
    const categoryStats = await ClothingItem.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalValue: { $sum: '$price' },
          avgWearCount: { $avg: '$wearCount' },
          totalWears: { $sum: '$wearCount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Color usage frequencies
    const colorStats = await ClothingItem.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: '$color.primary',
          count: { $sum: 1 },
          totalWears: { $sum: '$wearCount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Season distribution
    const seasonStats = await ClothingItem.aggregate([
      { $match: { userId } },
      { $unwind: '$season' },
      {
        $group: {
          _id: '$season',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Brand statistics
    const brandStats = await ClothingItem.aggregate([
      { $match: { userId, brand: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$brand',
          count: { $sum: 1 },
          totalValue: { $sum: '$price' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Calculate overall stats
    const totalItems = await ClothingItem.countDocuments({ userId });
    const totalValue = await ClothingItem.aggregate([
      { $match: { userId, price: { $exists: true } } },
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);

    const avgWearCount = await ClothingItem.aggregate([
      { $match: { userId } },
      { $group: { _id: null, avg: { $avg: '$wearCount' } } }
    ]);

    // Cost per wear analysis
    const costPerWearItems = await ClothingItem.find({
      userId,
      price: { $exists: true, $gt: 0 },
      wearCount: { $gt: 0 }
    })
      .lean()
      .then(items =>
        items.map(item => ({
          ...item,
          costPerWear: (item.price / item.wearCount).toFixed(2)
        }))
        .sort((a, b) => a.costPerWear - b.costPerWear)
        .slice(0, 10)
      );

    // Usage trends over time (last worn distribution)
    const recentlyWorn = await ClothingItem.countDocuments({
      userId,
      lastWorn: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    const notWornRecently = await ClothingItem.countDocuments({
      userId,
      lastWorn: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalItems,
          totalValue: totalValue[0]?.total || 0,
          averageWearCount: avgWearCount[0]?.avg?.toFixed(1) || 0,
          recentlyWorn,
          notWornRecently,
          neverWornCount: neverWorn.length
        },
        mostWornItems: mostWorn.map(item => ({
          id: item._id,
          name: `${item.color.primary} ${item.subcategory || item.category}`,
          category: item.category,
          wearCount: item.wearCount,
          imageURL: item.imageURL,
          lastWorn: item.lastWorn
        })),
        leastWornItems: leastWorn.map(item => ({
          id: item._id,
          name: `${item.color.primary} ${item.subcategory || item.category}`,
          category: item.category,
          wearCount: item.wearCount,
          imageURL: item.imageURL,
          recommendation: 'Consider wearing more often or donating'
        })),
        neverWornItems: neverWorn.slice(0, 10).map(item => ({
          id: item._id,
          name: `${item.color.primary} ${item.subcategory || item.category}`,
          category: item.category,
          daysSinceAdded: Math.floor((Date.now() - new Date(item.createdAt)) / (1000 * 60 * 60 * 24)),
          imageURL: item.imageURL,
          recommendation: 'Still has tags? Consider returning or donating'
        })),
        byCategory: categoryStats.map(cat => ({
          category: cat._id,
          count: cat.count,
          totalValue: cat.totalValue || 0,
          averageWearCount: cat.avgWearCount?.toFixed(1) || 0,
          totalWears: cat.totalWears,
          percentage: ((cat.count / totalItems) * 100).toFixed(1)
        })),
        byColor: colorStats.map(color => ({
          color: color._id,
          count: color.count,
          totalWears: color.totalWears,
          percentage: ((color.count / totalItems) * 100).toFixed(1)
        })),
        bySeason: seasonStats.map(season => ({
          season: season._id,
          count: season.count
        })),
        byBrand: brandStats.map(brand => ({
          brand: brand._id,
          count: brand.count,
          totalValue: brand.totalValue || 0
        })),
        costPerWear: costPerWearItems.map(item => ({
          id: item._id,
          name: `${item.color.primary} ${item.subcategory || item.category}`,
          price: item.price,
          wearCount: item.wearCount,
          costPerWear: item.costPerWear,
          imageURL: item.imageURL
        })),
        insights: generateInsights({
          totalItems,
          neverWornCount: neverWorn.length,
          categoryStats,
          colorStats,
          avgWearCount: avgWearCount[0]?.avg || 0
        })
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
};

/**
 * Generate insights based on analytics data
 */
function generateInsights(data) {
  const insights = [];

  // Never worn insights
  if (data.neverWornCount > data.totalItems * 0.2) {
    insights.push({
      type: 'warning',
      category: 'usage',
      message: `${data.neverWornCount} items (${((data.neverWornCount / data.totalItems) * 100).toFixed(0)}%) have never been worn`,
      suggestion: 'Consider donating items you haven\'t worn in 6+ months'
    });
  }

  // Category distribution
  const topCategory = data.categoryStats[0];
  if (topCategory && topCategory.count > data.totalItems * 0.4) {
    insights.push({
      type: 'info',
      category: 'balance',
      message: `${topCategory._id} makes up ${((topCategory.count / data.totalItems) * 100).toFixed(0)}% of your wardrobe`,
      suggestion: 'Consider diversifying your wardrobe with other categories'
    });
  }

  // Color diversity
  if (data.colorStats.length < 5) {
    insights.push({
      type: 'tip',
      category: 'variety',
      message: 'Limited color palette in your wardrobe',
      suggestion: 'Adding more colors can increase outfit combinations'
    });
  }

  // High wear count items
  if (data.avgWearCount > 5) {
    insights.push({
      type: 'success',
      category: 'sustainability',
      message: 'Great job! You\'re getting good use out of your wardrobe',
      suggestion: 'Keep focusing on versatile, well-worn pieces'
    });
  }

  // Color recommendations
  const topColors = data.colorStats.slice(0, 3).map(c => c._id);
  if (topColors.length > 0) {
    insights.push({
      type: 'tip',
      category: 'style',
      message: `Your favorite colors: ${topColors.join(', ')}`,
      suggestion: 'Consider these colors when shopping for new items'
    });
  }

  return insights;
}

module.exports = exports;

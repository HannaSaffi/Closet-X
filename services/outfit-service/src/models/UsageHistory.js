// services/outfit-service/src/models/UsageHistory.js
const mongoose = require('mongoose');

const usageHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  clothingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clothing',
    index: true
  },
  outfitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Outfit'
  },
  wornDate: {
    type: Date,
    required: [true, 'Worn date is required'],
    default: Date.now,
    index: true
  },
  weatherOnDay: {
    condition: {
      type: String,
      enum: ['sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'hot', 'cold', 'mild']
    },
    temperature: {
      value: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'fahrenheit'
      }
    },
    humidity: Number,
    windSpeed: Number,
    precipitation: {
      type: String,
      enum: ['none', 'light', 'moderate', 'heavy']
    }
  },
  occasion: {
    type: String,
    enum: ['casual', 'formal', 'work', 'athletic', 'party', 'beach', 'outdoor', 'date', 'travel', 'other'],
    lowercase: true
  },
  location: {
    type: String,
    trim: true
  },
  rating: {
    comfort: {
      type: Number,
      min: 1,
      max: 5
    },
    style: {
      type: Number,
      min: 1,
      max: 5
    },
    appropriateness: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  feedback: {
    tooHot: Boolean,
    tooCold: Boolean,
    uncomfortable: Boolean,
    receivedCompliments: Boolean,
    feltConfident: Boolean,
    wouldWearAgain: {
      type: Boolean,
      default: true
    }
  },
  photos: [{
    url: String,
    caption: String
  }],
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Compound indexes for analytics queries
usageHistorySchema.index({ userId: 1, wornDate: -1 });
usageHistorySchema.index({ clothingId: 1, wornDate: -1 });
usageHistorySchema.index({ userId: 1, occasion: 1 });
usageHistorySchema.index({ userId: 1, 'weatherOnDay.condition': 1 });

// Static method to get usage statistics for a user
usageHistorySchema.statics.getUserStats = async function(userId, startDate, endDate) {
  const matchStage = {
    userId: mongoose.Types.ObjectId(userId),
    wornDate: {
      $gte: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
      $lte: endDate || new Date()
    }
  };
  
  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$userId',
        totalWears: { $sum: 1 },
        uniqueItems: { $addToSet: '$clothingId' },
        occasionBreakdown: {
          $push: '$occasion'
        },
        averageComfort: { $avg: '$rating.comfort' },
        averageStyle: { $avg: '$rating.style' }
      }
    },
    {
      $project: {
        totalWears: 1,
        uniqueItemsCount: { $size: '$uniqueItems' },
        occasionBreakdown: 1,
        averageComfort: { $round: ['$averageComfort', 2] },
        averageStyle: { $round: ['$averageStyle', 2] }
      }
    }
  ]);
};

// Static method to get most worn items
usageHistorySchema.statics.getMostWornItems = async function(userId, limit = 10) {
  return await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$clothingId',
        wearCount: { $sum: 1 },
        lastWorn: { $max: '$wornDate' },
        averageRating: {
          $avg: {
            $avg: ['$rating.comfort', '$rating.style', '$rating.appropriateness']
          }
        }
      }
    },
    { $sort: { wearCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'clothings',
        localField: '_id',
        foreignField: '_id',
        as: 'clothingDetails'
      }
    },
    { $unwind: '$clothingDetails' }
  ]);
};

// Static method to get weather-based insights
usageHistorySchema.statics.getWeatherInsights = async function(userId) {
  return await this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$weatherOnDay.condition',
        count: { $sum: 1 },
        avgComfort: { $avg: '$rating.comfort' },
        commonOccasions: { $push: '$occasion' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to identify sell candidates
usageHistorySchema.statics.identifySellCandidates = async function(userId, daysThreshold = 180) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
  
  const Clothing = mongoose.model('Clothing');
  const allClothing = await Clothing.find({ userId, isActive: true }).select('_id');
  const clothingIds = allClothing.map(item => item._id);
  
  // Find items worn in the last threshold period
  const recentlyWorn = await this.distinct('clothingId', {
    userId,
    wornDate: { $gte: thresholdDate }
  });
  
  // Items not worn recently
  const rarelyWorn = clothingIds.filter(
    id => !recentlyWorn.some(wornId => wornId.equals(id))
  );
  
  // Get full details of rarely worn items
  return await Clothing.find({
    _id: { $in: rarelyWorn },
    wearCount: { $lt: 3 }
  }).populate('userId', 'name email');
};

// Method to calculate overall satisfaction score
usageHistorySchema.methods.calculateSatisfactionScore = function() {
  if (!this.rating) return 0;
  
  const { comfort, style, appropriateness } = this.rating;
  const ratingsSum = (comfort || 0) + (style || 0) + (appropriateness || 0);
  const ratingsCount = [comfort, style, appropriateness].filter(r => r).length;
  
  if (ratingsCount === 0) return 0;
  
  let score = (ratingsSum / ratingsCount) * 20; // Convert to 100-point scale
  
  // Adjust based on feedback
  if (this.feedback) {
    if (this.feedback.receivedCompliments) score += 10;
    if (this.feedback.feltConfident) score += 10;
    if (this.feedback.uncomfortable) score -= 15;
    if (!this.feedback.wouldWearAgain) score -= 20;
  }
  
  return Math.max(0, Math.min(100, score));
};

module.exports = mongoose.model('UsageHistory', usageHistorySchema);
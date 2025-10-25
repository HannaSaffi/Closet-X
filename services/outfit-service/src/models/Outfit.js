// models/Outfit.js
const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  outfitName: {
    type: String,
    required: [true, 'Outfit name is required'],
    trim: true,
    maxlength: 100
  },
  clothingItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clothing',
    required: true
  }],
  occasion: {
    type: String,
    required: true,
    enum: ['casual', 'formal', 'work', 'athletic', 'party', 'beach', 'outdoor', 'date', 'travel'],
    lowercase: true
  },
  weatherCondition: {
    condition: {
      type: String,
      enum: ['sunny', 'cloudy', 'rainy', 'snowy', 'windy', 'hot', 'cold', 'mild']
    },
    temperature: {
      min: Number,
      max: Number,
      unit: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'fahrenheit'
      }
    },
    precipitation: {
      type: String,
      enum: ['none', 'light', 'moderate', 'heavy']
    }
  },
  season: {
    type: String,
    enum: ['spring', 'summer', 'fall', 'winter', 'all-season'],
    lowercase: true
  },
  generatedTime: {
    type: Date,
    default: Date.now
  },
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  timesWorn: {
    type: Number,
    default: 0,
    min: 0
  },
  lastWorn: {
    type: Date
  },
  fashionRating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  userRating: {
    type: Number,
    min: 1,
    max: 5
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  colorPalette: [{
    type: String
  }],
  styleProfile: {
    type: String,
    enum: ['casual', 'formal', 'sporty', 'bohemian', 'minimalist', 'trendy', 'classic', 'eclectic']
  },
  notes: {
    type: String,
    maxlength: 500
  },
  imageURL: {
    type: String // Optional: generated outfit preview image
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common queries
outfitSchema.index({ userId: 1, occasion: 1 });
outfitSchema.index({ userId: 1, season: 1 });
outfitSchema.index({ userId: 1, isFavorite: 1 });
outfitSchema.index({ userId: 1, timesWorn: -1 });
outfitSchema.index({ 'weatherCondition.condition': 1 });

// Virtual to calculate days since last worn
outfitSchema.virtual('daysSinceLastWorn').get(function() {
  if (!this.lastWorn) return null;
  const diffTime = Date.now() - this.lastWorn.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual to check if outfit is still valid (all items exist and active)
outfitSchema.virtual('isValid').get(function() {
  return this.clothingItems.length >= 2; // Minimum 2 items for an outfit
});

// Method to record when outfit is worn
outfitSchema.methods.recordWear = async function() {
  this.timesWorn += 1;
  this.lastWorn = new Date();
  
  // Also update wear count for each clothing item
  const Clothing = mongoose.model('Clothing');
  await Clothing.updateMany(
    { _id: { $in: this.clothingItems } },
    { 
      $inc: { wearCount: 1 },
      $set: { lastWorn: new Date() }
    }
  );
  
  return await this.save();
};

// Method to calculate outfit compatibility score
outfitSchema.methods.calculateCompatibilityScore = function() {
  // This would use AI logic to score outfit coherence
  // Placeholder implementation
  let score = 5;
  
  // Check if colors complement each other
  const uniqueColors = new Set(this.colorPalette);
  if (uniqueColors.size <= 3) score += 2; // Good color harmony
  
  // Check if items match the occasion
  if (this.occasion && this.styleProfile) score += 1;
  
  // User feedback
  if (this.userRating) score = (score + this.userRating) / 2;
  
  this.fashionRating = Math.min(score, 10);
  return this.fashionRating;
};

// Static method to find outfits by weather
outfitSchema.statics.findByWeather = function(userId, temperature, condition) {
  const query = {
    userId,
    'weatherCondition.temperature.min': { $lte: temperature },
    'weatherCondition.temperature.max': { $gte: temperature }
  };
  
  if (condition) {
    query['weatherCondition.condition'] = condition;
  }
  
  return this.find(query).populate('clothingItems');
};

// Static method to get popular outfits
outfitSchema.statics.getPopularOutfits = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ timesWorn: -1, fashionRating: -1 })
    .limit(limit)
    .populate('clothingItems');
};

// Pre-save middleware to populate color palette from clothing items
outfitSchema.pre('save', async function(next) {
  if (this.isModified('clothingItems')) {
    try {
      const Clothing = mongoose.model('Clothing');
      const items = await Clothing.find({ _id: { $in: this.clothingItems } });
      
      const colors = items
        .map(item => item.color.primary)
        .filter(color => color);
      
      this.colorPalette = [...new Set(colors)];
      
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Pre-remove middleware to clean up usage history
outfitSchema.pre('remove', async function(next) {
  try {
    await mongoose.model('UsageHistory').deleteMany({ outfitId: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Outfit', outfitSchema);
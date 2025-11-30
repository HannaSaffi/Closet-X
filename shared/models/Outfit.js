// shared/models/Outfit.js
/**
 * Shared Outfit Model for Workers
 * 
 * This is a simplified version of the Outfit model used by workers
 * for reading and writing outfit data to MongoDB.
 * 
 * The authoritative model lives in services/outfit-service/src/models/Outfit.js
 */

const mongoose = require('mongoose');

const outfitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  outfitName: {
    type: String,
    required: true,
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
    default: 0
  },
  lastWorn: Date,
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
    lowercase: true
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
  imageURL: String
}, {
  timestamps: true
});

// Indexes for worker queries
outfitSchema.index({ userId: 1, occasion: 1 });
outfitSchema.index({ userId: 1, season: 1 });
outfitSchema.index({ 'weatherCondition.condition': 1 });

module.exports = mongoose.model('Outfit', outfitSchema);
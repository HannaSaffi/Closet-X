// shared/models/Clothing.js
/**
 * Shared Clothing Model for Workers
 * 
 * This is a simplified, read-only version of the Clothing model
 * used by workers for querying clothing data from MongoDB.
 * 
 * The authoritative model lives in services/wardrobe-service/src/models/Clothing.js
 */

const mongoose = require('mongoose');

const clothingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  imageURL: {
    type: String,
    required: true
  },
  thumbnailURL: String,
  category: {
    type: String,
    required: true,
    enum: ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'],
    lowercase: true
  },
  subcategory: {
    type: String,
    lowercase: true
  },
  color: {
    primary: {
      type: String,
      required: true,
      lowercase: true
    },
    secondary: [{
      type: String,
      lowercase: true
    }],
    hex: String
  },
  fabric: {
    type: String,
    lowercase: true,
    enum: ['cotton', 'polyester', 'wool', 'silk', 'denim', 'leather', 'linen', 'synthetic', 'mixed', 'other']
  },
  season: [{
    type: String,
    enum: ['spring', 'summer', 'fall', 'winter', 'all-season'],
    lowercase: true
  }],
  brand: String,
  size: String,
  purchaseDate: Date,
  purchasePrice: Number,
  dateUploaded: {
    type: Date,
    default: Date.now
  },
  wearCount: {
    type: Number,
    default: 0
  },
  lastWorn: Date,
  tags: [{
    type: String,
    lowercase: true
  }],
  occasion: [{
    type: String,
    enum: ['casual', 'formal', 'work', 'athletic', 'party', 'beach', 'outdoor'],
    lowercase: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  aiMetadata: {
    processed: Boolean,
    confidence: Number,
    detectedCategories: [{
      category: String,
      confidence: Number
    }],
    dominantColors: [String],
    pattern: {
      type: String,
      enum: ['solid', 'striped', 'checkered', 'floral', 'geometric', 'abstract', 'other']
    },
    style: [{
      type: String,
      enum: ['casual', 'formal', 'sporty', 'vintage', 'modern', 'bohemian']
    }]
  },
  notes: String
}, {
  timestamps: true
});

// Indexes for worker queries
clothingSchema.index({ userId: 1, category: 1 });
clothingSchema.index({ userId: 1, isActive: 1 });
clothingSchema.index({ 'color.primary': 1, season: 1 });

module.exports = mongoose.model('Clothing', clothingSchema);
// shared/models/Clothing.js
const mongoose = require('mongoose');

const clothingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  imageURL: {
    type: String,
    required: [true, 'Image URL is required']
  },
  thumbnailURL: {
    type: String
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'],
    lowercase: true
  },
  subcategory: {
    type: String,
    lowercase: true,
    // Dynamic subcategories based on category
    validate: {
      validator: function(value) {
        const subcategories = {
          tops: ['t-shirt', 'blouse', 'sweater', 'tank-top', 'shirt', 'hoodie'],
          bottoms: ['jeans', 'pants', 'shorts', 'skirt', 'leggings'],
          dresses: ['casual-dress', 'formal-dress', 'maxi-dress', 'midi-dress', 'mini-dress'],
          outerwear: ['jacket', 'coat', 'blazer', 'cardigan', 'raincoat', 'vest'],
          shoes: ['sneakers', 'boots', 'sandals', 'heels', 'flats', 'loafers'],
          accessories: ['hat', 'scarf', 'belt', 'bag', 'jewelry', 'sunglasses']
        };
        return subcategories[this.category]?.includes(value);
      },
      message: 'Invalid subcategory for the selected category'
    }
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
    hex: String // For visual filtering
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
  brand: {
    type: String,
    trim: true,
    maxlength: 50
  },
  size: {
    type: String,
    trim: true
  },
  purchaseDate: {
    type: Date
  },
  purchasePrice: {
    type: Number,
    min: 0
  },
  dateUploaded: {
    type: Date,
    default: Date.now
  },
  wearCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastWorn: {
    type: Date
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
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
    processed: {
      type: Boolean,
      default: false
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100
    },
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
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for common queries
clothingSchema.index({ userId: 1, category: 1 });
clothingSchema.index({ userId: 1, wearCount: -1 });
clothingSchema.index({ userId: 1, lastWorn: -1 });
clothingSchema.index({ userId: 1, isActive: 1 });
clothingSchema.index({ 'color.primary': 1, season: 1 });

// Virtual for usage history
clothingSchema.virtual('usageHistory', {
  ref: 'UsageHistory',
  localField: '_id',
  foreignField: 'clothingId'
});

// Virtual to calculate days since last worn
clothingSchema.virtual('daysSinceLastWorn').get(function() {
  if (!this.lastWorn) return null;
  const diffTime = Date.now() - this.lastWorn.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual to determine if item should be suggested for sale
clothingSchema.virtual('suggestForSale').get(function() {
  const daysSinceLastWorn = this.daysSinceLastWorn;
  const lowWearCount = this.wearCount < 3;
  const notWornRecently = daysSinceLastWorn > 180; // 6 months
  
  return lowWearCount && notWornRecently;
});

// Method to increment wear count
clothingSchema.methods.recordWear = async function() {
  this.wearCount += 1;
  this.lastWorn = new Date();
  return await this.save();
};

// Static method to get clothing by season
clothingSchema.statics.findBySeason = function(userId, season) {
  return this.find({
    userId,
    season: season,
    isActive: true
  });
};

// Static method to get rarely worn items
clothingSchema.statics.getRarelyWorn = function(userId, daysThreshold = 180) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysThreshold);
  
  return this.find({
    userId,
    isActive: true,
    $or: [
      { lastWorn: { $lt: dateThreshold } },
      { lastWorn: null, dateUploaded: { $lt: dateThreshold } }
    ],
    wearCount: { $lt: 5 }
  });
};

// Pre-remove middleware to clean up related data
clothingSchema.pre('remove', async function(next) {
  try {
    // Remove from outfits
    await mongoose.model('Outfit').updateMany(
      { clothingItems: this._id },
      { $pull: { clothingItems: this._id } }
    );
    
    // Remove usage history
    await mongoose.model('UsageHistory').deleteMany({ clothingId: this._id });
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Clothing', clothingSchema);
const mongoose = require('mongoose');

const clothingItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: String,
  imageId: String,
  thumbnailId: String,
  processedImageId: String,
  processedImageUrl: String,
  hasBackgroundRemoved: { type: Boolean, default: false },
  category: {
    type: String,
    required: true,
    enum: ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'other'],
    index: true
  },
  subcategory: String,
  color: {
    primary: String,
    secondary: [String]
  },
  brand: String,
  season: {
    type: [String],
    enum: ['spring', 'summer', 'fall', 'winter', 'all-season'],
    default: ['all-season']
  },
  fabric: String,
  tags: [String],
  wearCount: { type: Number, default: 0 },
  lastWorn: Date,
  purchaseDate: Date,
  price: Number,
  size: String,
  isActive: { type: Boolean, default: true },
  aiAnalysis: {
    category: String,
    colors: [String],
    style: String,
    occasion: [String],
    confidence: Number,
    analyzedAt: Date
  },
  metadata: {
    uploadedFrom: String,
    imageSize: Number,
    imageDimensions: { width: Number, height: Number }
  }
}, { timestamps: true });

clothingItemSchema.index({ userId: 1, category: 1 });
clothingItemSchema.index({ userId: 1, isActive: 1 });
clothingItemSchema.index({ userId: 1, lastWorn: -1 });

module.exports = mongoose.model('ClothingItem', clothingItemSchema);

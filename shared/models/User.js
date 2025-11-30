// shared/models/User.js
/**
 * Shared User Model for Workers
 * 
 * Minimal read-only version for workers to query user data.
 * The authoritative model lives in services/user-service/src/models/User.js
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true
  },
  profileImage: String,
  preferences: {
    style: {
      type: String,
      enum: ['casual', 'formal', 'sporty', 'bohemian', 'minimalist', 'trendy', 'classic']
    },
    favoriteColors: [String],
    preferredBrands: [String],
    budgetRange: {
      min: Number,
      max: Number
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
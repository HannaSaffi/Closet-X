// services/user-service/src/models/Follow.js
// Model for follow relationships (user following system)
// Only active when FEATURE_SOCIAL_ENABLED=true

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const followSchema = new Schema({
  // User who is following
  followerId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  
  // User being followed
  followingId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  
  // Timestamp when follow relationship was created
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'follows'
});

// Compound index to prevent duplicate follows
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

// Index for efficient queries
followSchema.index({ followerId: 1, createdAt: -1 }); // Get who user follows
followSchema.index({ followingId: 1, createdAt: -1 }); // Get user's followers

// Validation: Prevent self-follow
followSchema.pre('save', function(next) {
  if (this.followerId.equals(this.followingId)) {
    const error = new Error('Users cannot follow themselves');
    error.name = 'ValidationError';
    return next(error);
  }
  next();
});

// Static method: Check if user A follows user B
followSchema.statics.isFollowing = async function(followerId, followingId) {
  const follow = await this.findOne({ followerId, followingId });
  return !!follow;
};

// Static method: Get follower count
followSchema.statics.getFollowerCount = async function(userId) {
  return await this.countDocuments({ followingId: userId });
};

// Static method: Get following count
followSchema.statics.getFollowingCount = async function(userId) {
  return await this.countDocuments({ followerId: userId });
};

// Static method: Get followers list
followSchema.statics.getFollowers = async function(userId, limit = 50, skip = 0) {
  return await this.find({ followingId: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .select('followerId createdAt')
    .lean();
};

// Static method: Get following list
followSchema.statics.getFollowing = async function(userId, limit = 50, skip = 0) {
  return await this.find({ followerId: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .select('followingId createdAt')
    .lean();
};

module.exports = mongoose.model('Follow', followSchema);

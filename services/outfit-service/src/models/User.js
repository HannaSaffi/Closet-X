// services/outfit-service/src/models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Info
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password in queries by default
  },
  
  // User Profile
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  
  // User Preferences
  preferences: {
    defaultCity: {
      type: String,
      default: 'New York'
    },
    style: {
      type: String,
      enum: ['casual', 'formal', 'sporty', 'vintage', 'modern', 'bohemian'],
      default: 'casual'
    },
    favoriteColors: [{
      type: String
    }],
    occasionPreferences: {
      type: Map,
      of: String
    }
  },
  
  // User Stats
  outfitsGenerated: {
    type: Number,
    default: 0
  },
  
  lastLogin: {
    type: Date,
    default: Date.now
  },
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    
    next();
  } catch (error) {
    next(error);
  }
});

// Update updatedAt timestamp
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// ============================================================================
// METHODS
// ============================================================================

/**
 * Compare password for login
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Get public profile (exclude sensitive data)
 */
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: `${this.firstName} ${this.lastName}`,
    preferences: this.preferences,
    outfitsGenerated: this.outfitsGenerated,
    createdAt: this.createdAt
  };
};

/**
 * Update last login timestamp
 */
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = Date.now();
  return this.save();
};

/**
 * Increment outfits generated counter
 */
userSchema.methods.incrementOutfits = async function() {
  this.outfitsGenerated += 1;
  return this.save();
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Find user by email
 */
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Find user by credentials (for login)
 */
userSchema.statics.findByCredentials = async function(email, password) {
  // Find user with password field
  const user = await this.findOne({ email: email.toLowerCase() }).select('+password');
  
  if (!user) {
    throw new Error('Invalid credentials');
  }
  
  // Check if account is active
  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }
  
  // Compare password
  const isPasswordMatch = await user.comparePassword(password);
  
  if (!isPasswordMatch) {
    throw new Error('Invalid credentials');
  }
  
  return user;
};

// ============================================================================
// INDEXES
// ============================================================================

// Index for faster email lookups
userSchema.index({ email: 1 });

// Index for active users
userSchema.index({ isActive: 1 });

// Index for created date
userSchema.index({ createdAt: -1 });

// ============================================================================
// VIRTUAL FIELDS
// ============================================================================

// Full name virtual
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Outfit count category
userSchema.virtual('userLevel').get(function() {
  if (this.outfitsGenerated < 10) return 'beginner';
  if (this.outfitsGenerated < 50) return 'intermediate';
  if (this.outfitsGenerated < 200) return 'advanced';
  return 'expert';
});

// ============================================================================
// EXPORT
// ============================================================================

module.exports = mongoose.model('User', userSchema);
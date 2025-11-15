// services/user-service/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },

  username: {
  type: String,
  required: [true, 'Username is required'],
  unique: true,
  lowercase: true,
  trim: true,
  minlength: [3, 'Username must be at least 3 characters'],
  maxlength: [20, 'Username cannot exceed 20 characters'],
  match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
},

  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  profileImage: {
    type: String,
    default: 'https://default-avatar-url.com/default.png'
  },
  preferences: {
    style: {
      type: String,
      enum: ['casual', 'formal', 'sporty', 'bohemian', 'minimalist', 'trendy', 'classic'],
      default: 'casual'
    },
    favoriteColors: [{
      type: String,
      trim: true
    }],
    weatherPreferences: {
      coldTolerance: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      rainPreference: {
        type: String,
        enum: ['avoid', 'neutral', 'enjoy'],
        default: 'neutral'
      }
    },
    sizes: {
      top: String,
      bottom: String,
      shoes: String
    }
  },
  authTokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800 // 7 days in seconds
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ username: 1 });

// Virtual for user's clothing items
userSchema.virtual('clothingItems', {
  ref: 'Clothing',
  localField: '_id',
  foreignField: 'userId'
});

// Virtual for user's outfits
userSchema.virtual('outfits', {
  ref: 'Outfit',
  localField: '_id',
  foreignField: 'userId'
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate auth token
userSchema.methods.generateAuthToken = function() {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { userId: this._id, email: this.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  this.authTokens.push({ token });
  return token;
};

// Method to remove sensitive data
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.authTokens;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);
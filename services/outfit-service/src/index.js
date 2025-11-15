// services/outfit-service/src/index.js
/**
 * Outfit Service - Main Entry Point
 * 
 * Features:
 * - User Authentication (Login/Register)
 * - Daily Outfit Recommendations (Weather + AI)
 * - Outfit Generation
 * - Color & Style Matching
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3002;

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(morgan('dev')); // Logging

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/outfit-service';

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch((error) => console.error('❌ MongoDB connection error:', error));

// ============================================================================
// ROUTES
// ============================================================================

// Import routes
const authRoutes = require('./routes/authRoutes');
const dailyOutfitRoutes = require('./routes/dailyOutfitRoutes');
//const aiRoutes = require('./routes/aiRoutes'); // Your existing AI routes
const outfitRoutes = require('./routes/outfitRoutes'); // Your existing outfit routes

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'outfit-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/auth', authRoutes);                    // Authentication routes
app.use('/api/daily-outfit', dailyOutfitRoutes);     // Daily outfit recommendations
app.use('/api/ai', aiRoutes);                        // AI-related routes (existing)
app.use('/api/outfits', outfitRoutes);               // Outfit CRUD routes (existing)

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Closet-X Outfit Service',
    version: '2.0.0',
    features: [
      'User Authentication',
      'Daily Outfit Recommendations',
      'Weather Integration',
      'AI Fashion Advice',
      'Outfit Generation',
      'Color & Style Matching'
    ],
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/profile'
      },
      dailyOutfit: {
        today: 'GET /api/daily-outfit',
        weekly: 'GET /api/daily-outfit/weekly',
        save: 'POST /api/daily-outfit/save'
      },
      ai: {
        analyzeImage: 'POST /api/ai/analyze',
        fashionAdvice: 'POST /api/ai/fashion-advice',
        status: 'GET /api/ai/status'
      }
    }
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Starting Outfit Service...');
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Port: ${PORT}`);
  console.log(`✅ Outfit Service listening on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth/*`);
  console.log(`👔 Daily outfit: http://localhost:${PORT}/api/daily-outfit`);
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️  Received ${signal}, starting graceful shutdown...`);
  
  // Close MongoDB connection
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
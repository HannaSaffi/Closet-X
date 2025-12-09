// services/outfit-service/src/index.js
/**
 * Outfit Service - Main Entry Point
 * 
 * Features:
 * - Daily Outfit Recommendations (Weather + AI)
 * - Outfit Generation
 * - Color & Style Matching
 * - Uses User Service for authentication
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import routes
const dailyOutfitRoutes = require('./routes/dailyOutfitRoutes');

const app = express();
const PORT = process.env.PORT || 3003;
const swagger = require('./config/swagger');

// Middleware
app.use(cors());
app.use(express.json());
// Swagger API Documentation
app.use('/api-docs', swagger.serve, swagger.setup);
console.log('📚 Swagger UI available at http://localhost:3002/api-docs');

// Health check
app.get('/health', async (req, res) => {
  const health = {
    service: 'outfit-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  res.json(health);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Closet-X Outfit Service',
    version: '2.0.0',
    status: 'running',
    authentication: 'Uses User Service tokens (centralized auth)',
    endpoints: {
      'GET /health': 'Health check',
      'GET /api/daily-outfit': 'Daily outfit recommendation (requires user-service token)',
      'GET /api/daily-outfit/weekly': 'Weekly outfit plan',
      'POST /api/daily-outfit/save': 'Save favorite outfit'
    }
  });
});

// Mount routes
app.use('/api/daily-outfit', dailyOutfitRoutes);

// Connect to MongoDB and start server
async function start() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://outfit_service:service_password_123@mongodb-service.kates-closetx.svc.cluster.local:27017/closetx_outfits?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');
    console.log('🔐 Authentication: Using User Service tokens (no local users)');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Outfit Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

start();

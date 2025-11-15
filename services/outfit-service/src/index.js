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
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

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
    version: '1.0.0',
    status: 'running'
  });
});

// Connect to MongoDB and start server
async function start() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/closetx_outfits';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Outfit Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

start();
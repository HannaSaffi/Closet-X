// services/outfit-service/src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Import routes
const authRoutes = require('./routes/authRoutes');
const dailyOutfitRoutes = require('./routes/dailyOutfitRoutes');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/outfits', dailyOutfitRoutes);

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

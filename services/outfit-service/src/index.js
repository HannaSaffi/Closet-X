const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
require('dotenv').config();

const Outfit = require('./models/Outfit');
const UsageHistory = require('./models/UsageHistory');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Initialize cache (TTL: 10 minutes)
const cache = new NodeCache({ stdTTL: 600 });

// Environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb://outfit_service:service_password_123@closetx-mongodb:27017/closetx_outfits';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@closetx-rabbitmq:5672';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Global connection state
let rabbitMQConnection = null;
let rabbitMQChannel = null;
let isShuttingDown = false;
let aiServiceStatus = { available: false, lastCheck: null };

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(express.json({ limit: '10mb' })); // JSON body parser with larger limit for images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for AI service
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ============================================================================
// HEALTH CHECK ENDPOINTS
// ============================================================================

/**
 * Basic health check - always returns 200 if service is running
 * Used by load balancers for basic availability
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'outfit-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Readiness probe - checks if service is ready to accept traffic
 * Verifies database, message queue, and AI service connections
 * Used by Kubernetes readiness probes
 */
app.get('/ready', async (req, res) => {
  const checks = {
    service: 'outfit-service',
    timestamp: new Date().toISOString(),
    ready: true,
    checks: {}
  };

  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    checks.checks.database = {
      status: dbState === 1 ? 'connected' : 'disconnected',
      state: dbState,
      ready: dbState === 1
    };

    if (dbState !== 1) {
      checks.ready = false;
    }

    // Check RabbitMQ connection
    if (rabbitMQChannel && rabbitMQConnection) {
      checks.checks.messageQueue = {
        status: 'connected',
        ready: true
      };
    } else {
      checks.checks.messageQueue = {
        status: 'disconnected',
        ready: false
      };
      checks.ready = false;
    }

    // Check cache
    const cacheStats = cache.getStats();
    checks.checks.cache = {
      status: 'operational',
      keys: cacheStats.keys,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      ready: true
    };

    // Check AI services (non-blocking)
    checks.checks.aiServices = {
      status: aiServiceStatus.available ? 'available' : 'degraded',
      lastCheck: aiServiceStatus.lastCheck,
      ready: true // AI service is not critical for basic operation
    };

    // Check if shutting down
    if (isShuttingDown) {
      checks.ready = false;
      checks.checks.shutdown = {
        status: 'shutting down',
        ready: false
      };
    }

    const statusCode = checks.ready ? 200 : 503;
    res.status(statusCode).json(checks);

  } catch (error) {
    res.status(503).json({
      service: 'outfit-service',
      ready: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness probe - checks if service is alive and not deadlocked
 * Used by Kubernetes liveness probes to restart unhealthy pods
 */
app.get('/live', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({
      status: 'shutting down',
      service: 'outfit-service',
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    status: 'alive',
    service: 'outfit-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
    },
    cache: cache.getStats()
  });
});

/**
 * Metrics endpoint for monitoring
 */
app.get('/metrics', (req, res) => {
  const cacheStats = cache.getStats();
  
  res.json({
    service: 'outfit-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cache: {
      keys: cacheStats.keys,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0
    },
    database: {
      state: mongoose.connection.readyState,
      name: mongoose.connection.name
    }
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Closet-X Outfit Service',
    version: '1.0.0',
    status: 'running',
    features: [
      'AI-powered outfit generation',
      'Weather-based recommendations',
      'Color matching algorithms',
      'Style compatibility analysis',
      'Usage analytics'
    ],
    endpoints: {
      health: '/health',
      ready: '/ready',
      live: '/live',
      metrics: '/metrics',
      api: '/api/*'
    }
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Outfit service is working!',
    timestamp: new Date().toISOString(),
    aiAvailable: aiServiceStatus.available,
    cacheEnabled: true
  });
});

// Get all outfits (with caching)
app.get('/api/outfits', async (req, res) => {
  try {
    const { userId, limit = 20, page = 1 } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    // Check cache first
    const cacheKey = `outfits:${userId}:${limit}:${page}`;
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json({
        success: true,
        cached: true,
        ...cached
      });
    }

    // Query database
    const skip = (page - 1) * limit;
    const outfits = await Outfit.find({ userId })
      .populate('clothingItems')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Outfit.countDocuments({ userId });

    const response = {
      count: outfits.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: outfits
    };

    // Cache the result
    cache.set(cacheKey, response);

    res.json({
      success: true,
      cached: false,
      ...response
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get outfit by ID
app.get('/api/outfits/:id', async (req, res) => {
  try {
    const outfit = await Outfit.findById(req.params.id)
      .populate('clothingItems');
    
    if (!outfit) {
      return res.status(404).json({
        success: false,
        error: 'Outfit not found'
      });
    }

    res.json({
      success: true,
      data: outfit
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get usage analytics
app.get('/api/analytics/usage', async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await UsageHistory.getUserStats(userId, start, end);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get most worn items
app.get('/api/analytics/most-worn', async (req, res) => {
  try {
    const { userId, limit = 10 } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const items = await UsageHistory.getMostWornItems(userId, parseInt(limit));

    res.json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Cache management endpoint
app.post('/api/cache/clear', (req, res) => {
  const { key } = req.body;
  
  if (key) {
    cache.del(key);
    res.json({
      success: true,
      message: `Cache key '${key}' cleared`
    });
  } else {
    cache.flushAll();
    res.json({
      success: true,
      message: 'All cache cleared'
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// STARTUP AND CONNECTIONS
// ============================================================================

async function connectMongoDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB');
    
    // Handle MongoDB connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}

async function connectRabbitMQ() {
  try {
    rabbitMQConnection = await amqp.connect(RABBITMQ_URL);
    console.log('✅ Connected to RabbitMQ');
    
    rabbitMQChannel = await rabbitMQConnection.createChannel();
    
    // Setup queues
    await rabbitMQChannel.assertQueue('outfit_events', { durable: true });
    await rabbitMQChannel.assertQueue('outfit_queue', { durable: true });
    await rabbitMQChannel.assertQueue('ai_analysis_queue', { durable: true });
    
    // Consumer for outfit generation requests
    rabbitMQChannel.consume('outfit_queue', async (msg) => {
      if (msg) {
        try {
          console.log('📨 Received outfit generation request');
          const data = JSON.parse(msg.content.toString());
          // Process outfit generation
          // ... outfit generation logic here ...
          rabbitMQChannel.ack(msg);
        } catch (error) {
          console.error('❌ Error processing message:', error);
          rabbitMQChannel.nack(msg, false, true); // Requeue on error
        }
      }
    });
    
    // Handle RabbitMQ connection events
    rabbitMQConnection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err);
    });
    
    rabbitMQConnection.on('close', () => {
      console.warn('⚠️  RabbitMQ connection closed');
      if (!isShuttingDown) {
        setTimeout(connectRabbitMQ, 5000);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error);
    console.log('⏳ Will retry RabbitMQ connection in 5 seconds...');
    setTimeout(connectRabbitMQ, 5000);
  }
}

// Check AI service availability periodically
function checkAIServices() {
  try {
    // Check if Ollama or other AI services are available
    // This is a placeholder - implement actual health check
    aiServiceStatus = {
      available: true,
      lastCheck: new Date().toISOString()
    };
  } catch (error) {
    aiServiceStatus = {
      available: false,
      lastCheck: new Date().toISOString()
    };
  }
}

async function start() {
  try {
    console.log('🚀 Starting Outfit Service...');
    console.log(`📝 Environment: ${NODE_ENV}`);
    console.log(`🔌 Port: ${PORT}`);
    
    // Connect to databases
    await connectMongoDB();
    await connectRabbitMQ();
    
    // Check AI services periodically
    checkAIServices();
    setInterval(checkAIServices, 60000); // Every minute
    
    // Start Express server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Outfit Service listening on port ${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`✔️  Ready check: http://localhost:${PORT}/ready`);
      console.log(`💚 Live check: http://localhost:${PORT}/live`);
      console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
    });
    
    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n⚠️  Received ${signal}, starting graceful shutdown...`);
      isShuttingDown = true;
      
      // Stop accepting new connections
      server.close(() => {
        console.log('✅ HTTP server closed');
      });
      
      // Close RabbitMQ
      try {
        if (rabbitMQChannel) {
          await rabbitMQChannel.close();
          console.log('✅ RabbitMQ channel closed');
        }
        if (rabbitMQConnection) {
          await rabbitMQConnection.close();
          console.log('✅ RabbitMQ connection closed');
        }
      } catch (error) {
        console.error('❌ Error closing RabbitMQ:', error);
      }
      
      // Close MongoDB
      try {
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
      } catch (error) {
        console.error('❌ Error closing MongoDB:', error);
      }
      
      // Clear cache
      cache.flushAll();
      console.log('✅ Cache cleared');
      
      console.log('👋 Shutdown complete');
      process.exit(0);
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start service:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the service
start();

module.exports = app; // Export for testing
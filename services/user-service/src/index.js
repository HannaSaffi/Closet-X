// services/user-service/src/index.js
const express = require('express');
const mongoose = require('mongoose');
const amqp = require('amqplib');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const swagger = require('./config/swagger');
require('dotenv').config();

const User = require('./models/User');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Environment variables
const MONGO_URI = process.env.MONGO_URI || 'mongodb://user_service:service_password_123@closetx-mongodb:27017/closetx_users';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@closetx-rabbitmq:5672';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Global connection state
let rabbitMQConnection = null;
let rabbitMQChannel = null;
let isShuttingDown = false;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS
app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);

// Swagger API Documentation
app.use('/api-docs', swagger.serve, swagger.setup);
console.log('📚 Swagger UI available at http://localhost:3001/api-docs');

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
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
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Readiness probe - checks if service is ready to accept traffic
 * Verifies database and message queue connections
 * Used by Kubernetes readiness probes
 */
app.get('/ready', async (req, res) => {
  const checks = {
    service: 'user-service',
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
      service: 'user-service',
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
      service: 'user-service',
      timestamp: new Date().toISOString()
    });
  }

  res.status(200).json({
    status: 'alive',
    service: 'user-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB'
    }
  });
});

// ============================================================================
// API ROUTES
// ============================================================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Closet-X User Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      ready: '/ready',
      live: '/live',
      api: '/api/*'
    }
  });
});

// Test endpoint to verify service is working
app.get('/api/test', (req, res) => {
  res.json({
    message: 'User service is working!',
    timestamp: new Date().toISOString()
  });
});

// User endpoints placeholder
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password -authTokens').limit(10);
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -authTokens');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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
    await rabbitMQChannel.assertQueue('user_events', { durable: true });
    await rabbitMQChannel.assertQueue('user_queue', { durable: true });
    
    // Consumer example
    rabbitMQChannel.consume('user_queue', (msg) => {
      if (msg) {
        console.log('📨 Received message:', msg.content.toString());
        // Process message here
        rabbitMQChannel.ack(msg);
      }
    });
    
    // Handle RabbitMQ connection events
    rabbitMQConnection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err);
    });
    
    rabbitMQConnection.on('close', () => {
      console.warn('⚠️  RabbitMQ connection closed');
      if (!isShuttingDown) {
        // Attempt to reconnect
        setTimeout(connectRabbitMQ, 5000);
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error);
    console.log('⏳ Will retry RabbitMQ connection in 5 seconds...');
    setTimeout(connectRabbitMQ, 5000);
  }
}

async function start() {
  try {
    console.log('🚀 Starting User Service...');
    console.log(`📝 Environment: ${NODE_ENV}`);
    console.log(`🔌 Port: ${PORT}`);
    
    // Connect to databases
    await connectMongoDB();
    await connectRabbitMQ();
    
    // Start Express server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ User Service listening on port ${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`✔️  Ready check: http://localhost:${PORT}/ready`);
      console.log(`💚 Live check: http://localhost:${PORT}/live`);
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
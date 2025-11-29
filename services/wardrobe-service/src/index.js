require("dotenv").config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectDatabase } = require('./config/database');
const { connectRabbitMQ } = require('./services/messageQueue');
const clothingRoutes = require('./routes/clothingRoutes');
const healthRoutes = require('./routes/healthRoutes');
const swagger = require('./config/swagger');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined'));

app.use('/health', healthRoutes);
app.use('/api/wardrobe', clothingRoutes);

// Swagger API Documentation
app.use('/api-docs', swagger.serve, swagger.setup);
console.log('📚 Swagger UI available at http://localhost:3003/api-docs');

app.get('/', (req, res) => {
  res.json({
    service: 'Closet-X Wardrobe Service',
    version: '1.0.0',
    status: 'running',
    storage: 'MongoDB GridFS',
    endpoints: {
      health: '/health',
      wardrobe: '/api/wardrobe',
      images: '/api/wardrobe/image/:fileId'
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

async function startServer() {
  try {
    await connectDatabase();
    console.log('✅ Database connected');

    if (process.env.RABBITMQ_URL) {
      await connectRabbitMQ();
      console.log('✅ RabbitMQ connected');
    } else {
      console.warn('⚠️  RabbitMQ URL not configured');
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log('='.repeat(70));
      console.log(`🚀 Wardrobe Service running on port ${PORT}`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🖼️  Images stored in MongoDB GridFS`);
      console.log('='.repeat(70));
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

startServer();
module.exports = app;
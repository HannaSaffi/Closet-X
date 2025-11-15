// workers/fashion-advice/src/worker.js
// RabbitMQ consumer for fashion advice using Ollama GPU

const mongoose = require('mongoose');
require('dotenv').config();

const { RabbitMQConnection, QUEUES, consumeQueue, setupRabbitMQ } = require('../../../shared/config/rabbitmq');
const ollamaService = require('../../../../shared/services/ollamaService');
const Clothing = require('../../../../shared/models/Clothing');
const User = require('../../../../services/user-service/src/models/User');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Process fashion advice request
async function processFashionAdvice(message, rawMessage) {
  const { userId, query, responseQueue } = message;
  
  console.log(`💬 Processing fashion advice for user ${userId}`);
  console.log(`📝 Query: ${query}`);
  
  try {
    // Get user info
    const user = await User.findById(userId).select('preferences');
    
    // Get user's wardrobe
    const wardrobe = await Clothing.find({ userId, isActive: true })
      .select('category subcategory color brand')
      .limit(50) // Limit for context
      .lean();
    
    // Build context
    const context = {
      wardrobe,
      preferences: user?.preferences || {},
      occasion: message.occasion || 'casual'
    };
    
    // Get advice from Ollama
    const advice = await ollamaService.getFashionAdvice(query, context);
    
    console.log(`✅ Generated fashion advice`);
    
    // If response queue provided, send result back
    if (responseQueue && rawMessage.properties.replyTo) {
      const channel = await rabbitMQ.getChannel();
      await channel.sendToQueue(
        rawMessage.properties.replyTo,
        Buffer.from(JSON.stringify(advice)),
        {
          correlationId: rawMessage.properties.correlationId
        }
      );
    }
    
    return advice;
  } catch (error) {
    console.error(`❌ Error processing fashion advice:`, error);
    throw error;
  }
}

// Main worker function
async function startWorker() {
  console.log('🎨 Starting Fashion Advice Worker...');
  
  try {
    // Connect to database
    await connectDB();
    
    // Connect to RabbitMQ
    global.rabbitMQ = new RabbitMQConnection();
    const channel = await rabbitMQ.connect();
    
    // Setup queues
    const { setupRabbitMQ } = require('../../../shared/config/rabbitmq');
    await setupRabbitMQ(channel);
    
    // Check Ollama availability
    const ollamaHealth = await ollamaService.healthCheck();
    console.log('🤖 Ollama status:', ollamaHealth.status);
    
    if (ollamaHealth.status !== 'healthy') {
      console.warn('⚠️  Ollama not available! Worker will fail.');
    }
    
    // Start consuming messages
    await consumeQueue(channel, QUEUES.FASHION_ADVICE, processFashionAdvice);
    
    console.log('✅ Worker is ready and listening for messages');
    console.log(`👂 Queue: ${QUEUES.FASHION_ADVICE}`);
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down worker...');
      await rabbitMQ.close();
      await mongoose.connection.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

// Start the worker
startWorker();
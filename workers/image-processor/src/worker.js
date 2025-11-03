// workers/image-processor/src/worker.js
// RabbitMQ consumer for image processing tasks

const mongoose = require('mongoose');
require('dotenv').config();

const { RabbitMQConnection, QUEUES, consumeQueue, setupRabbitMQ } = require('../shared/config/rabbitmq');
const ollamaService = require('./services/ollamaService');
//const aiService = require('./services/aiService'); // Google Vision/Clarifai
const Clothing = require('./models/Clothing');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Process image upload message
async function processImageUpload(message, rawMessage) {
  const { clothingId, imageUrl, userId, useOllama = true } = message;
  
  console.log(`🖼️  Processing image for clothing ID: ${clothingId}`);
  
  try {
    // Find clothing item
    const clothing = await Clothing.findById(clothingId);
    if (!clothing) {
      throw new Error(`Clothing item ${clothingId} not found`);
    }

    let analysis;

    // Try Ollama first (GPU-powered, free)
    if (useOllama) {
      try {
        console.log('Using Ollama for image analysis...');
        analysis = await ollamaService.analyzeClothingImage(imageUrl);
        console.log('✅ Ollama analysis complete');
      } catch (ollamaError) {
        console.warn('Ollama failed, falling back to Google Vision:', ollamaError.message);
        analysis = await aiService.analyzeClothingImage(imageUrl);
      }
    } else {
      // Use Google Vision/Clarifai directly
      console.log('Using Google Vision for image analysis...');
      analysis = await aiService.analyzeClothingImage(imageUrl);
    }

    // Update clothing item with AI analysis
    clothing.category = analysis.category || clothing.category;
    clothing.color = analysis.colors || clothing.color;
    clothing.aiMetadata = {
      processed: true,
      confidence: analysis.confidence,
      dominantColors: analysis.colors?.dominantColors || [],
      pattern: analysis.pattern,
      style: analysis.style,
      provider: analysis.provider
    };

    // Update occasions and seasons if detected
    if (analysis.occasions) {
      clothing.occasion = analysis.occasions;
    }
    if (analysis.season) {
      clothing.season = analysis.season;
    }

    await clothing.save();
    
    console.log(`✅ Updated clothing item ${clothingId} with AI metadata`);
    
    return {
      success: true,
      clothingId,
      analysis
    };
  } catch (error) {
    console.error(`❌ Error processing image ${clothingId}:`, error);
    throw error;
  }
}

// Main worker function
async function startWorker() {
  console.log('🚀 Starting Image Processing Worker...');
  
  try {
    // Connect to database
    await connectDB();
    
    // Connect to RabbitMQ
    const rabbitMQ = new RabbitMQConnection();
    const channel = await rabbitMQ.connect();
    
    // Setup queues
    await setupRabbitMQ(channel);
    
    // Check Ollama availability
    const ollamaHealth = await ollamaService.healthCheck();
    console.log('🤖 Ollama status:', ollamaHealth.status);
    if (ollamaHealth.status === 'healthy') {
      console.log('📦 Available Ollama models:', ollamaHealth.models.join(', '));
    }
    
    // Start consuming messages
    await consumeQueue(channel, QUEUES.IMAGE_PROCESSING, processImageUpload);
    
    console.log('✅ Worker is ready and listening for messages');
    console.log(`👂 Queue: ${QUEUES.IMAGE_PROCESSING}`);
    
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
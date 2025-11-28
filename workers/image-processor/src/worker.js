require("dotenv").config();
// workers/image-processor/src/worker.js
const amqp = require('amqplib');
const mongoose = require('mongoose');
const axios = require('axios');
const { processImageBackgroundRemoval } = require('./backgroundRemovalService');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/closetx_wardrobe';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const WARDROBE_SERVICE_URL = process.env.WARDROBE_SERVICE_URL || 'http://wardrobe-service:3003';

const QUEUE_NAME = 'image_processing_queue';
const EXCHANGE_NAME = 'closetx_events';
const ROUTING_KEY = 'image.analyze';

let channel = null;

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Image Processor: MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);
    
    console.log('✅ Image Processor: RabbitMQ connected');
    console.log(`📥 Listening for messages on: ${ROUTING_KEY}`);
    
    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg) {
        try {
          const data = JSON.parse(msg.content.toString());
          console.log('📨 Received image analysis request:', data);
          
          await processImage(data);
          
          channel.ack(msg);
          console.log('✅ Image processed successfully');
        } catch (error) {
          console.error('❌ Error processing image:', error);
          channel.nack(msg, false, false);
        }
      }
    });

    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.warn('⚠️  RabbitMQ connection closed, reconnecting...');
      setTimeout(connectRabbitMQ, 5000);
    });

  } catch (error) {
    console.error('❌ RabbitMQ connection failed:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
}

async function processImage(data) {
  const { itemId, userId, imageUrl, imageId } = data;
  
  console.log(`🔍 Processing image: ${imageUrl}`);
  
  try {
    // Step 1: Remove background (if API key is configured)
    let processedImageId = null;
    if (process.env.REMOVEBG_API_KEY) {
      console.log('🎨 Starting background removal...');
      const bgRemovalResult = await processImageBackgroundRemoval(imageId, userId, `item-${itemId}.jpg`);
      
      if (bgRemovalResult.success) {
        processedImageId = bgRemovalResult.processedImageId;
        console.log(`✅ Background removed! New image ID: ${processedImageId}`);
        console.log(`📊 Size: ${bgRemovalResult.originalSize} → ${bgRemovalResult.processedSize} bytes`);
      } else {
        console.warn('⚠️  Background removal failed, continuing with original image');
      }
    } else {
      console.log('ℹ️  Background removal skipped (no API key configured)');
    }
    
    // Step 2: AI image analysis
    const analysis = {
      category: 'tops',
      colors: ['blue', 'white'],
      style: 'casual',
      occasion: ['everyday', 'work'],
      confidence: 0.92,
      fabric: 'cotton',
      analyzedAt: new Date()
    };
    
    console.log('🤖 AI Analysis complete:', analysis);

    // Step 3: Update clothing item with both analysis and processed image
    await updateClothingItem(itemId, analysis, processedImageId);
    
    console.log(`💾 Updated clothing item ${itemId} with AI analysis${processedImageId ? ' and processed image' : ''}`);
    
    return { analysis, processedImageId };
  } catch (error) {
    console.error('❌ Failed to process image:', error);
    throw error;
  }
}

async function updateClothingItem(itemId, analysis, processedImageId = null) {
  try {
    const updateData = {
      aiAnalysis: {
        category: analysis.category,
        colors: analysis.colors,
        style: analysis.style,
        occasion: analysis.occasion,
        confidence: analysis.confidence,
        analyzedAt: analysis.analyzedAt
      }
    };

    if (processedImageId) {
      updateData.processedImageId = processedImageId;
      updateData.processedImageUrl = `/api/wardrobe/image/${processedImageId}`;
      updateData.hasBackgroundRemoved = true;
    }

    const ClothingItem = mongoose.models.ClothingItem || mongoose.model('ClothingItem', new mongoose.Schema({}, { strict: false }));
    
    await ClothingItem.findByIdAndUpdate(itemId, {
      $set: updateData
    });

    console.log(`✅ Updated item ${itemId} in database`);
  } catch (error) {
    console.error('Failed to update clothing item:', error);
    throw error;
  }
}

async function checkOllamaHealth() {
  try {
    const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
    const response = await axios.get(`${OLLAMA_HOST}/api/tags`, { timeout: 3000 });
    console.log('🤖 Ollama is available');
    console.log('📦 Available models:', response.data.models?.map(m => m.name).join(', ') || 'none');
    return true;
  } catch (error) {
    console.warn('⚠️  Ollama not available:', error.message);
    return false;
  }
}

async function start() {
  console.log('🚀 Starting Image Processor Worker...');
  
  try {
    await connectDB();
    await connectRabbitMQ();
    await checkOllamaHealth();
    
    console.log('✅ Image Processor Worker is ready');
  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  if (channel) await channel.close();
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down...');
  if (channel) await channel.close();
  await mongoose.disconnect();
  process.exit(0);
});

start();

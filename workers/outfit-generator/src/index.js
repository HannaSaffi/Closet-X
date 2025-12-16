// workers/outfit-generator/src/index.js
/**
 * Outfit Generator Worker
 * 
 * This worker consumes messages from RabbitMQ to generate outfit combinations
 * based on user's clothing items, preferences, weather, and occasion.
 * 
 * Features:
 * - Color harmony matching
 * - Style compatibility analysis
 * - Weather-appropriate suggestions
 * - Occasion-based filtering
 * - AI-powered recommendations
 */

const mongoose = require('mongoose');
const amqp = require('amqplib');
const winston = require('winston');
require('dotenv').config();

// MongoDB Models (assuming shared models)
const Clothing = require('../shared/models/Clothing');
const Outfit = require('../shared/models/Outfit');

// Configuration
const MONGO_URI = process.env.MONGO_URI || 'mongodb://closetx-mongodb:27017/closetx';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq.rabbitmq:5672';
const QUEUE_NAME = 'outfit_generation_queue';
const MAX_RETRIES = 3;

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// ============================================================================
// COLOR MATCHING ALGORITHMS
// ============================================================================

/**
 * Color harmony rules based on color theory
 */
const COLOR_HARMONIES = {
  complementary: {
    red: ['green', 'teal', 'mint'],
    blue: ['orange', 'coral', 'peach'],
    yellow: ['purple', 'violet', 'lavender'],
    green: ['red', 'pink', 'magenta'],
    orange: ['blue', 'navy', 'teal'],
    purple: ['yellow', 'gold', 'lime']
  },
  analogous: {
    red: ['orange', 'pink', 'burgundy'],
    blue: ['purple', 'teal', 'navy'],
    yellow: ['orange', 'lime', 'gold'],
    green: ['teal', 'lime', 'olive'],
    orange: ['red', 'yellow', 'coral'],
    purple: ['blue', 'pink', 'magenta']
  },
  neutral: {
    any: ['white', 'black', 'gray', 'beige', 'cream', 'tan', 'brown']
  }
};

/**
 * Calculate color compatibility score
 */
function calculateColorMatch(color1, color2) {
  // Both neutral colors - always compatible
  if (COLOR_HARMONIES.neutral.any.includes(color1) && 
      COLOR_HARMONIES.neutral.any.includes(color2)) {
    return 10;
  }
  
  // One neutral color - compatible with any
  if (COLOR_HARMONIES.neutral.any.includes(color1) || 
      COLOR_HARMONIES.neutral.any.includes(color2)) {
    return 9;
  }
  
  // Check complementary colors
  if (COLOR_HARMONIES.complementary[color1]?.includes(color2)) {
    return 8;
  }
  
  // Check analogous colors
  if (COLOR_HARMONIES.analogous[color1]?.includes(color2)) {
    return 7;
  }
  
  // Same color family
  if (color1 === color2) {
    return 5;
  }
  
  // Default - not recommended
  return 3;
}

/**
 * Check if color palette is harmonious
 */
function isHarmoniousPalette(colors) {
  if (colors.length < 2) return true;
  
  let totalScore = 0;
  let comparisons = 0;
  
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      totalScore += calculateColorMatch(colors[i], colors[j]);
      comparisons++;
    }
  }
  
  const avgScore = totalScore / comparisons;
  return avgScore >= 6; // Threshold for harmonious
}

// ============================================================================
// STYLE MATCHING ALGORITHMS
// ============================================================================

/**
 * Style compatibility matrix
 */
const STYLE_COMPATIBILITY = {
  casual: ['casual', 'sporty', 'bohemian'],
  formal: ['formal', 'classic', 'minimalist'],
  sporty: ['sporty', 'casual', 'athletic'],
  bohemian: ['bohemian', 'casual', 'vintage'],
  minimalist: ['minimalist', 'formal', 'classic'],
  trendy: ['trendy', 'casual', 'modern'],
  classic: ['classic', 'formal', 'minimalist'],
  vintage: ['vintage', 'bohemian', 'classic']
};

/**
 * Calculate style compatibility
 */
function calculateStyleMatch(style1, style2) {
  if (style1 === style2) return 10;
  if (STYLE_COMPATIBILITY[style1]?.includes(style2)) return 8;
  return 4;
}

// ============================================================================
// OCCASION MATCHING
// ============================================================================

const OCCASION_CATEGORIES = {
  casual: ['casual', 'everyday', 'weekend'],
  formal: ['formal', 'business', 'interview', 'professional'],
  work: ['work', 'office', 'business-casual'],
  athletic: ['athletic', 'gym', 'sports', 'workout'],
  party: ['party', 'night-out', 'celebration', 'event'],
  beach: ['beach', 'summer', 'vacation', 'resort'],
  outdoor: ['outdoor', 'hiking', 'camping', 'adventure'],
  date: ['date', 'romantic', 'dinner'],
  travel: ['travel', 'comfortable', 'versatile']
};

/**
 * Filter clothing by occasion
 */
function filterByOccasion(items, occasion) {
  const occasionKeywords = OCCASION_CATEGORIES[occasion] || [occasion];
  
  return items.filter(item => {
    if (!item.occasion || item.occasion.length === 0) return true;
    
    return item.occasion.some(occ => 
      occasionKeywords.includes(occ.toLowerCase())
    );
  });
}

// ============================================================================
// WEATHER MATCHING
// ============================================================================

/**
 * Filter items by weather conditions
 */
function filterByWeather(items, weatherCondition) {
  const { temperature, condition } = weatherCondition;
  
  return items.filter(item => {
    // Check season appropriateness
    let seasonMatch = false;
    
    if (temperature >= 75) {
      seasonMatch = item.season?.includes('summer') || item.season?.includes('all-season');
    } else if (temperature >= 60) {
      seasonMatch = item.season?.includes('spring') || 
                   item.season?.includes('fall') || 
                   item.season?.includes('all-season');
    } else if (temperature >= 40) {
      seasonMatch = item.season?.includes('fall') || 
                   item.season?.includes('winter') || 
                   item.season?.includes('all-season');
    } else {
      seasonMatch = item.season?.includes('winter') || item.season?.includes('all-season');
    }
    
    // Check for rain gear if rainy
    if (condition === 'rainy' && item.category === 'outerwear') {
      return item.subcategory === 'raincoat' || seasonMatch;
    }
    
    return seasonMatch || !item.season || item.season.length === 0;
  });
}

// ============================================================================
// OUTFIT GENERATION LOGIC
// ============================================================================

/**
 * Generate outfit combinations
 */
async function generateOutfits(userId, options = {}) {
  const {
    occasion = 'casual',
    weatherCondition = null,
    maxOutfits = 5,
    preferredColors = [],
    preferredStyle = null
  } = options;

  logger.info(`Generating outfits for user ${userId}`, { occasion, weatherCondition });

  // Fetch user's active clothing items
  let items = await Clothing.find({ 
    userId, 
    isActive: true 
  }).lean();

  if (items.length < 3) {
    throw new Error('Not enough clothing items to generate outfits');
  }

  // Apply filters
  items = filterByOccasion(items, occasion);
  
  if (weatherCondition) {
    items = filterByWeather(items, weatherCondition);
  }

  // Categorize items
  const itemsByCategory = {};
  items.forEach(item => {
    if (!itemsByCategory[item.category]) {
      itemsByCategory[item.category] = [];
    }
    itemsByCategory[item.category].push(item);
  });

  // Generate outfit combinations
  const outfits = [];
  const tops = itemsByCategory.tops || [];
  const bottoms = itemsByCategory.bottoms || [];
  const dresses = itemsByCategory.dresses || [];
  const outerwear = itemsByCategory.outerwear || [];
  const shoes = itemsByCategory.shoes || [];

  // Generate dress-based outfits
  for (const dress of dresses.slice(0, Math.ceil(maxOutfits / 2))) {
    const outfit = [dress._id];
    
    // Add shoes
    if (shoes.length > 0) {
      const shoe = shoes[Math.floor(Math.random() * shoes.length)];
      outfit.push(shoe._id);
    }
    
    // Add outerwear if cold
    if (weatherCondition && weatherCondition.temperature < 60 && outerwear.length > 0) {
      const jacket = outerwear[Math.floor(Math.random() * outerwear.length)];
      outfit.push(jacket._id);
    }
    
    const colors = [dress, ...items.filter(i => outfit.includes(i._id))]
      .map(i => i.color.primary);
    
    if (isHarmoniousPalette(colors)) {
      outfits.push({
        clothingItems: outfit,
        colors: colors,
        score: 8
      });
    }
  }

  // Generate top + bottom outfits
  let attempts = 0;
  const maxAttempts = Math.min(tops.length * bottoms.length, 50);
  
  while (outfits.length < maxOutfits && attempts < maxAttempts) {
    attempts++;
    
    const top = tops[Math.floor(Math.random() * tops.length)];
    const bottom = bottoms[Math.floor(Math.random() * bottoms.length)];
    
    if (!top || !bottom) continue;
    
    // Check color compatibility
    const colorScore = calculateColorMatch(
      top.color.primary,
      bottom.color.primary
    );
    
    if (colorScore < 6) continue; // Skip bad color matches
    
    // Check style compatibility
    const topStyle = top.aiMetadata?.style?.[0] || 'casual';
    const bottomStyle = bottom.aiMetadata?.style?.[0] || 'casual';
    const styleScore = calculateStyleMatch(topStyle, bottomStyle);
    
    if (styleScore < 6) continue; // Skip bad style matches
    
    const outfit = [top._id, bottom._id];
    const colors = [top.color.primary, bottom.color.primary];
    
    // Add shoes
    if (shoes.length > 0) {
      const compatibleShoes = shoes.filter(shoe => {
        const shoeColor = shoe.color.primary;
        return calculateColorMatch(shoeColor, top.color.primary) >= 6 ||
               calculateColorMatch(shoeColor, bottom.color.primary) >= 6 ||
               COLOR_HARMONIES.neutral.any.includes(shoeColor);
      });
      
      if (compatibleShoes.length > 0) {
        const shoe = compatibleShoes[Math.floor(Math.random() * compatibleShoes.length)];
        outfit.push(shoe._id);
        colors.push(shoe.color.primary);
      }
    }
    
    // Add outerwear if appropriate
    if (weatherCondition && weatherCondition.temperature < 65 && outerwear.length > 0) {
      const compatibleJackets = outerwear.filter(jacket => {
        const jacketColor = jacket.color.primary;
        return COLOR_HARMONIES.neutral.any.includes(jacketColor) ||
               calculateColorMatch(jacketColor, top.color.primary) >= 7;
      });
      
      if (compatibleJackets.length > 0) {
        const jacket = compatibleJackets[Math.floor(Math.random() * compatibleJackets.length)];
        outfit.push(jacket._id);
        colors.push(jacket.color.primary);
      }
    }
    
    // Check if palette is harmonious
    if (isHarmoniousPalette(colors)) {
      const avgScore = (colorScore + styleScore) / 2;
      
      outfits.push({
        clothingItems: outfit,
        colors: colors,
        score: avgScore
      });
    }
  }

  // Sort by score and return top outfits
  outfits.sort((a, b) => b.score - a.score);
  return outfits.slice(0, maxOutfits);
}

/**
 * Save generated outfit to database
 */
async function saveOutfit(userId, outfitData, options) {
  const outfit = new Outfit({
    userId,
    outfitName: options.outfitName || `${options.occasion} Outfit`,
    clothingItems: outfitData.clothingItems,
    occasion: options.occasion,
    weatherCondition: options.weatherCondition,
    season: determineSeason(options.weatherCondition),
    isAIGenerated: true,
    fashionRating: outfitData.score,
    colorPalette: outfitData.colors,
    tags: [options.occasion, 'ai-generated']
  });

  await outfit.save();
  logger.info(`Saved outfit ${outfit._id} for user ${userId}`);
  
  return outfit;
}

/**
 * Determine season from weather
 */
function determineSeason(weatherCondition) {
  if (!weatherCondition) return 'all-season';
  
  const { temperature } = weatherCondition;
  
  if (temperature >= 75) return 'summer';
  if (temperature >= 60) return 'spring';
  if (temperature >= 40) return 'fall';
  return 'winter';
}

// ============================================================================
// WORKER IMPLEMENTATION
// ============================================================================

class OutfitGeneratorWorker {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isShuttingDown = false;
  }

  async connectMongoDB() {
    try {
      await mongoose.connect(MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      logger.info('✅ Connected to MongoDB');
    } catch (error) {
      logger.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async connectRabbitMQ() {
    try {
      this.connection = await amqp.connect(RABBITMQ_URL);
      logger.info('✅ Connected to RabbitMQ');
      
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(QUEUE_NAME, { durable: true });
      await this.channel.prefetch(1); // Process one message at a time
      
      logger.info(`✅ Listening on queue: ${QUEUE_NAME}`);
      
      // Handle connection events
      this.connection.on('error', (err) => {
        logger.error('❌ RabbitMQ connection error:', err);
      });
      
      this.connection.on('close', () => {
        if (!this.isShuttingDown) {
          logger.warn('⚠️  RabbitMQ connection closed, reconnecting...');
          setTimeout(() => this.connectRabbitMQ(), 5000);
        }
      });
    } catch (error) {
      logger.error('❌ RabbitMQ connection error:', error);
      setTimeout(() => this.connectRabbitMQ(), 5000);
    }
  }

  async processMessage(msg) {
    let data;
    try {
      data = JSON.parse(msg.content.toString());
      logger.info('📨 Processing outfit generation request', { 
        userId: data.userId, 
        occasion: data.occasion 
      });
      
      // Generate outfits
      const outfits = await generateOutfits(data.userId, {
        occasion: data.occasion,
        weatherCondition: data.weatherCondition,
        maxOutfits: data.maxOutfits || 5,
        preferredColors: data.preferredColors,
        preferredStyle: data.preferredStyle
      });
      
      // Save outfits to database
      const savedOutfits = [];
      for (const outfitData of outfits) {
        const saved = await saveOutfit(data.userId, outfitData, {
          occasion: data.occasion,
          weatherCondition: data.weatherCondition,
          outfitName: data.outfitName
        });
        savedOutfits.push(saved);
      }
      
      logger.info(`✅ Generated ${savedOutfits.length} outfits for user ${data.userId}`);
      
      // Acknowledge message
      this.channel.ack(msg);
      
      // Publish success event
      if (data.callbackQueue) {
        this.channel.sendToQueue(
          data.callbackQueue,
          Buffer.from(JSON.stringify({
            success: true,
            outfits: savedOutfits,
            count: savedOutfits.length
          })),
          { correlationId: data.correlationId }
        );
      }
      
    } catch (error) {
      logger.error('❌ Error processing message:', error);
      
      // Check retry count
      const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
      
      if (retryCount <= MAX_RETRIES) {
        logger.info(`⏳ Retrying message (attempt ${retryCount}/${MAX_RETRIES})`);
        
        // Re-queue with incremented retry count
        this.channel.sendToQueue(
          QUEUE_NAME,
          msg.content,
          {
            headers: {
              'x-retry-count': retryCount
            },
            persistent: true
          }
        );
      } else {
        logger.error(`❌ Max retries reached for message, sending to DLQ`);
        
        // Send to dead letter queue
        this.channel.sendToQueue(
          `${QUEUE_NAME}_dlq`,
          msg.content,
          { persistent: true }
        );
      }
      
      // Acknowledge original message
      this.channel.ack(msg);
      
      // Send error callback
      if (data?.callbackQueue) {
        this.channel.sendToQueue(
          data.callbackQueue,
          Buffer.from(JSON.stringify({
            success: false,
            error: error.message
          })),
          { correlationId: data.correlationId }
        );
      }
    }
  }

  async start() {
    try {
      logger.info('🚀 Starting Outfit Generator Worker...');
      
      await this.connectMongoDB();
      await this.connectRabbitMQ();
      
      // Start consuming messages
      this.channel.consume(QUEUE_NAME, (msg) => {
        if (msg) {
          this.processMessage(msg);
        }
      });
      
      logger.info('✅ Outfit Generator Worker is running');
      
    } catch (error) {
      logger.error('❌ Failed to start worker:', error);
      process.exit(1);
    }
  }

  async shutdown() {
    logger.info('⚠️  Shutting down worker...');
    this.isShuttingDown = true;
    
    try {
      if (this.channel) {
        await this.channel.close();
        logger.info('✅ RabbitMQ channel closed');
      }
      
      if (this.connection) {
        await this.connection.close();
        logger.info('✅ RabbitMQ connection closed');
      }
      
      await mongoose.connection.close();
      logger.info('✅ MongoDB connection closed');
      
      logger.info('👋 Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// ============================================================================
// START WORKER
// ============================================================================

const worker = new OutfitGeneratorWorker();

// Handle shutdown signals
process.on('SIGTERM', () => worker.shutdown());
process.on('SIGINT', () => worker.shutdown());

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  worker.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection:', { reason, promise });
  worker.shutdown();
});

// Start the worker
worker.start();

module.exports = { generateOutfits, calculateColorMatch, calculateStyleMatch };

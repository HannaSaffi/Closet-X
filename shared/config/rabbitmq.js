// shared/config/rabbitmq.js
// RabbitMQ connection and channel management

const amqp = require('amqplib');

class RabbitMQConnection {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.reconnectTimeout = 5000; // 5 seconds
    this.maxRetries = 10;
    this.retryCount = 0;
  }

  /**
   * Connect to RabbitMQ
   */
  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://closetx:closetx123@closetx-rabbitmq:5672';
      
      console.log('🐰 Connecting to RabbitMQ...');
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // Handle connection events
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
        this.handleReconnect();
      });

      this.connection.on('close', () => {
        console.log('RabbitMQ connection closed');
        this.handleReconnect();
      });

      console.log('✅ Connected to RabbitMQ');
      this.retryCount = 0;

      // Set prefetch to handle one message at a time per worker
      await this.channel.prefetch(1);

      return this.channel;
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error.message);
      this.handleReconnect();
      throw error;
    }
  }

  /**
   * Handle reconnection logic
   */
  async handleReconnect() {
    if (this.retryCount >= this.maxRetries) {
      console.error('Max reconnection attempts reached');
      process.exit(1);
    }

    this.retryCount++;
    console.log(`Attempting to reconnect... (${this.retryCount}/${this.maxRetries})`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, this.reconnectTimeout);
  }

  /**
   * Get channel (create if not exists)
   */
  async getChannel() {
    if (!this.channel) {
      await this.connect();
    }
    return this.channel;
  }

  /**
   * Close connection
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log('RabbitMQ connection closed gracefully');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
}

// Queue names
const QUEUES = {
  IMAGE_PROCESSING: 'image-processing',
  OUTFIT_GENERATION: 'outfit-generation',
  AI_ANALYSIS: 'ai-analysis',
  NOTIFICATIONS: 'notifications',
  FASHION_ADVICE: 'fashion-advice'
};

// Exchange names
const EXCHANGES = {
  CLOTHING_EVENTS: 'clothing-events',
  OUTFIT_EVENTS: 'outfit-events',
  USER_EVENTS: 'user-events'
};

// Routing keys
const ROUTING_KEYS = {
  CLOTHING_UPLOADED: 'clothing.uploaded',
  CLOTHING_UPDATED: 'clothing.updated',
  CLOTHING_DELETED: 'clothing.deleted',
  OUTFIT_CREATED: 'outfit.created',
  OUTFIT_WORN: 'outfit.worn',
  USER_REGISTERED: 'user.registered'
};

/**
 * Setup RabbitMQ queues and exchanges
 */
async function setupRabbitMQ(channel) {
  try {
    // Assert exchanges
    await channel.assertExchange(EXCHANGES.CLOTHING_EVENTS, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.OUTFIT_EVENTS, 'topic', { durable: true });
    await channel.assertExchange(EXCHANGES.USER_EVENTS, 'topic', { durable: true });

    // Assert queues
    await channel.assertQueue(QUEUES.IMAGE_PROCESSING, {
      durable: true,
      arguments: {
        'x-message-ttl': 600000, // 10 minutes
        'x-max-length': 10000
      }
    });

    await channel.assertQueue(QUEUES.OUTFIT_GENERATION, {
      durable: true,
      arguments: {
        'x-message-ttl': 300000, // 5 minutes
        'x-max-length': 5000
      }
    });

    await channel.assertQueue(QUEUES.AI_ANALYSIS, {
      durable: true,
      arguments: {
        'x-message-ttl': 600000, // 10 minutes
        'x-max-length': 10000
      }
    });

    await channel.assertQueue(QUEUES.NOTIFICATIONS, {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 hours
        'x-max-length': 50000
      }
    });

    await channel.assertQueue(QUEUES.FASHION_ADVICE, {
      durable: true,
      arguments: {
        'x-message-ttl': 300000, // 5 minutes
        'x-max-length': 1000
      }
    });

    // Bind queues to exchanges
    await channel.bindQueue(
      QUEUES.IMAGE_PROCESSING,
      EXCHANGES.CLOTHING_EVENTS,
      ROUTING_KEYS.CLOTHING_UPLOADED
    );

    await channel.bindQueue(
      QUEUES.AI_ANALYSIS,
      EXCHANGES.CLOTHING_EVENTS,
      ROUTING_KEYS.CLOTHING_UPLOADED
    );

    await channel.bindQueue(
      QUEUES.OUTFIT_GENERATION,
      EXCHANGES.OUTFIT_EVENTS,
      ROUTING_KEYS.OUTFIT_CREATED
    );

    console.log('✅ RabbitMQ queues and exchanges set up successfully');
  } catch (error) {
    console.error('Failed to setup RabbitMQ:', error);
    throw error;
  }
}

/**
 * Publish message to queue
 */
async function publishToQueue(channel, queue, message, options = {}) {
  try {
    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    return channel.sendToQueue(queue, messageBuffer, {
      persistent: true,
      timestamp: Date.now(),
      ...options
    });
  } catch (error) {
    console.error(`Failed to publish to queue ${queue}:`, error);
    throw error;
  }
}

/**
 * Publish message to exchange
 */
async function publishToExchange(channel, exchange, routingKey, message, options = {}) {
  try {
    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    return channel.publish(exchange, routingKey, messageBuffer, {
      persistent: true,
      timestamp: Date.now(),
      contentType: 'application/json',
      ...options
    });
  } catch (error) {
    console.error(`Failed to publish to exchange ${exchange}:`, error);
    throw error;
  }
}

/**
 * Consume messages from queue
 */
async function consumeQueue(channel, queue, handler, options = {}) {
  try {
    await channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          console.log(`📨 Received message from ${queue}:`, content);
          
          // Process message
          await handler(content, msg);
          
          // Acknowledge message
          channel.ack(msg);
          console.log(`✅ Message processed successfully`);
        } catch (error) {
          console.error(`Error processing message:`, error);
          
          // Reject and requeue if not already retried
          const requeue = !msg.fields.redelivered;
          channel.nack(msg, false, requeue);
          
          if (!requeue) {
            console.error('Message rejected permanently (max retries reached)');
          }
        }
      }
    }, {
      noAck: false,
      ...options
    });
    
    console.log(`👂 Listening for messages on queue: ${queue}`);
  } catch (error) {
    console.error(`Failed to consume from queue ${queue}:`, error);
    throw error;
  }
}

module.exports = {
  RabbitMQConnection,
  QUEUES,
  EXCHANGES,
  ROUTING_KEYS,
  setupRabbitMQ,
  publishToQueue,
  publishToExchange,
  consumeQueue
};
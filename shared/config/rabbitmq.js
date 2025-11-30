// shared/config/rabbitmq.js
/**
 * Shared RabbitMQ Configuration
 * 
 * Simple RabbitMQ utilities for workers
 */

const amqp = require('amqplib');

// Queue names
const QUEUES = {
  FASHION_ADVICE: 'fashion_advice_queue',
  OUTFIT_GENERATION: 'outfit_generation_queue',
  IMAGE_PROCESSING: 'image_processing_queue'
};

class RabbitMQConnection {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect(url) {
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      
      console.log('✅ Connected to RabbitMQ');
      
      // Handle connection errors
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
      });
      
      this.connection.on('close', () => {
        console.log('RabbitMQ connection closed');
      });
      
      return this.channel;
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async assertQueue(queueName, options = {}) {
    if (!this.channel) {
      throw new Error('Channel not initialized. Call connect() first.');
    }
    
    const defaultOptions = {
      durable: true,
      ...options
    };
    
    await this.channel.assertQueue(queueName, defaultOptions);
  }

  async close() {
    try {
      if (this.channel) await this.channel.close();
      if (this.connection) await this.connection.close();
      console.log('RabbitMQ connection closed');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }
}

/**
 * Setup RabbitMQ queues
 */
async function setupRabbitMQ(channel) {
  try {
    // Assert all queues
    await channel.assertQueue(QUEUES.FASHION_ADVICE, { durable: true });
    await channel.assertQueue(QUEUES.OUTFIT_GENERATION, { durable: true });
    await channel.assertQueue(QUEUES.IMAGE_PROCESSING, { durable: true });
    
    console.log('✅ RabbitMQ queues setup complete');
  } catch (error) {
    console.error('Error setting up RabbitMQ queues:', error);
    throw error;
  }
}

/**
 * Consume messages from a queue
 */
async function consumeQueue(channel, queueName, callback) {
  try {
    await channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content, msg);
          channel.ack(msg);
        } catch (error) {
          console.error(`Error processing message from ${queueName}:`, error);
          // Reject and requeue the message
          channel.nack(msg, false, true);
        }
      }
    });
    
    console.log(`👂 Listening to queue: ${queueName}`);
  } catch (error) {
    console.error(`Error consuming queue ${queueName}:`, error);
    throw error;
  }
}

module.exports = {
  RabbitMQConnection,
  QUEUES,
  setupRabbitMQ,
  consumeQueue
};
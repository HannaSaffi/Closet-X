// services/wardrobe-service/src/services/messageQueue.js
// Service to publish messages to RabbitMQ from API endpoints

const { 
  RabbitMQConnection, 
  QUEUES, 
  EXCHANGES, 
  ROUTING_KEYS,
  publishToQueue,
  publishToExchange 
} = require('../../../../shared/config/rabbitmq');

class MessageQueueService {
  constructor() {
    this.rabbitMQ = null;
    this.channel = null;
  }

  /**
   * Initialize RabbitMQ connection
   */
  async init() {
    if (!this.channel) {
      this.rabbitMQ = new RabbitMQConnection();
      this.channel = await this.rabbitMQ.connect();
      
      const { setupRabbitMQ } = require('../../../../shared/config/rabbitmq');
      await setupRabbitMQ(this.channel);
    }
    return this.channel;
  }

  /**
   * Get channel (initialize if needed)
   */
  async getChannel() {
    if (!this.channel) {
      await this.init();
    }
    return this.channel;
  }

  /**
   * Publish clothing upload event
   */
  async publishClothingUpload(clothingData) {
    try {
      const channel = await this.getChannel();
      
      const message = {
        clothingId: clothingData._id.toString(),
        userId: clothingData.userId.toString(),
        imageUrl: clothingData.imageURL,
        category: clothingData.category,
        timestamp: new Date(),
        useOllama: true // Prefer Ollama for processing
      };

      // Publish to queue for immediate processing
      await publishToQueue(channel, QUEUES.IMAGE_PROCESSING, message);
      
      // Publish event to exchange for other subscribers
      await publishToExchange(
        channel,
        EXCHANGES.CLOTHING_EVENTS,
        ROUTING_KEYS.CLOTHING_UPLOADED,
        message
      );
      
      console.log(`📤 Published clothing upload event: ${clothingData._id}`);
      return true;
    } catch (error) {
      console.error('Failed to publish clothing upload:', error);
      return false;
    }
  }

  /**
   * Publish outfit generation request
   */
  async publishOutfitGeneration(userId, options = {}) {
    try {
      const channel = await this.getChannel();
      
      const message = {
        userId: userId.toString(),
        occasion: options.occasion || 'casual',
        weather: options.weather,
        maxSuggestions: options.maxSuggestions || 5,
        timestamp: new Date()
      };

      await publishToQueue(channel, QUEUES.OUTFIT_GENERATION, message);
      
      console.log(`📤 Published outfit generation request for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to publish outfit generation:', error);
      return false;
    }
  }

  /**
   * Publish fashion advice request (using Ollama)
   */
  async publishFashionAdvice(userId, query, options = {}) {
    try {
      const channel = await this.getChannel();
      
      const message = {
        userId: userId.toString(),
        query,
        occasion: options.occasion,
        timestamp: new Date(),
        responseQueue: options.responseQueue
      };

      await publishToQueue(channel, QUEUES.FASHION_ADVICE, message);
      
      console.log(`📤 Published fashion advice request for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to publish fashion advice:', error);
      return false;
    }
  }

  /**
   * Request fashion advice with response (RPC pattern)
   */
  async requestFashionAdviceWithResponse(userId, query, timeout = 30000) {
    try {
      const channel = await this.getChannel();
      
      // Create temporary response queue
      const responseQueue = await channel.assertQueue('', { exclusive: true });
      const correlationId = this.generateUuid();
      
      // Promise to wait for response
      const responsePromise = new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Fashion advice request timed out'));
        }, timeout);

        channel.consume(responseQueue.queue, (msg) => {
          if (msg.properties.correlationId === correlationId) {
            clearTimeout(timeoutId);
            resolve(JSON.parse(msg.content.toString()));
            channel.ack(msg);
          }
        }, { noAck: false });
      });

      // Send request
      const message = {
        userId: userId.toString(),
        query,
        timestamp: new Date()
      };

      await channel.sendToQueue(
        QUEUES.FASHION_ADVICE,
        Buffer.from(JSON.stringify(message)),
        {
          replyTo: responseQueue.queue,
          correlationId,
          persistent: true
        }
      );

      // Wait for response
      const response = await responsePromise;
      return response;
    } catch (error) {
      console.error('Failed to request fashion advice:', error);
      throw error;
    }
  }

  /**
   * Publish AI analysis request
   */
  async publishAIAnalysis(data) {
    try {
      const channel = await this.getChannel();
      
      const message = {
        type: data.type, // 'image', 'outfit', 'wardrobe'
        data: data.payload,
        userId: data.userId?.toString(),
        timestamp: new Date()
      };

      await publishToQueue(channel, QUEUES.AI_ANALYSIS, message);
      
      console.log(`📤 Published AI analysis request`);
      return true;
    } catch (error) {
      console.error('Failed to publish AI analysis:', error);
      return false;
    }
  }

  /**
   * Publish notification
   */
  async publishNotification(userId, notification) {
    try {
      const channel = await this.getChannel();
      
      const message = {
        userId: userId.toString(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        timestamp: new Date()
      };

      await publishToQueue(channel, QUEUES.NOTIFICATIONS, message);
      
      console.log(`📤 Published notification for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to publish notification:', error);
      return false;
    }
  }

  /**
   * Generate UUID for correlation
   */
  generateUuid() {
    return Math.random().toString() +
           Math.random().toString() +
           Math.random().toString();
  }

  /**
   * Close connection
   */
  async close() {
    if (this.rabbitMQ) {
      await this.rabbitMQ.close();
    }
  }
}

// Export singleton instance
module.exports = new MessageQueueService();
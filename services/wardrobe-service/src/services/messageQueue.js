const amqp = require('amqplib');

let connection = null;
let channel = null;

const EXCHANGE_NAME = 'closetx_events';
const QUEUES = {
  IMAGE_PROCESSING: 'image_processing_queue',
  OUTFIT_GENERATION: 'outfit_generation_queue',
  FASHION_ADVICE: 'fashion_advice_queue'
};

exports.connectRabbitMQ = async () => {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();

    // Setup exchange
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

    // Setup queues
    await channel.assertQueue(QUEUES.IMAGE_PROCESSING, { durable: true });
    await channel.assertQueue(QUEUES.OUTFIT_GENERATION, { durable: true });
    await channel.assertQueue(QUEUES.FASHION_ADVICE, { durable: true });

    console.log('✅ RabbitMQ connected and queues set up');

    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err);
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      console.warn('⚠️  RabbitMQ connection closed');
      connection = null;
      channel = null;
    });

    return { connection, channel };
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
};

exports.publishMessage = async (routingKey, message) => {
  try {
    if (!channel) {
      console.warn('RabbitMQ channel not available, skipping message');
      return false;
    }

    const content = Buffer.from(JSON.stringify(message));
    
    channel.publish(EXCHANGE_NAME, routingKey, content, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now()
    });

    console.log(`📤 Published message to ${routingKey}`);
    return true;
  } catch (error) {
    console.error('Failed to publish message:', error);
    return false;
  }
};

exports.publishToQueue = async (queueName, message) => {
  try {
    if (!channel) {
      console.warn('RabbitMQ channel not available, skipping message');
      return false;
    }

    const content = Buffer.from(JSON.stringify(message));
    
    channel.sendToQueue(queueName, content, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now()
    });

    console.log(`📤 Published message to queue: ${queueName}`);
    return true;
  } catch (error) {
    console.error('Failed to publish to queue:', error);
    return false;
  }
};

exports.QUEUES = QUEUES;
exports.EXCHANGE_NAME = EXCHANGE_NAME;
const mongoose = require('mongoose');
const amqp = require('amqplib');
const User = require('./models/User');

require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://user_service:service_password_123@closetx-mongodb:27017/closetx_users';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@closetx-rabbitmq:5672';

async function start() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Connect to RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    console.log('✅ Connected to RabbitMQ');

    // Example queue for user-related events
    await channel.assertQueue('user_queue');
    channel.consume('user_queue', msg => {
      console.log('Received message:', msg.content.toString());
      channel.ack(msg);
    });

    console.log('🚀 User service is running...');
  } catch (err) {
    console.error('❌ Error starting service:', err);
    process.exit(1);
  }
}

start();

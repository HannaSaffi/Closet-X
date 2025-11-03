// src/index.js
const mongoose = require('mongoose');
const amqp = require('amqplib');
require('dotenv').config();
const Clothing = require('./models/Clothing');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://wardrobe_service:service_password_123@mongodb:27017/closetx_wardrobe';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

async function start() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Connect to RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    console.log('✅ Connected to RabbitMQ');

    // Example queue for wardrobe events
    await channel.assertQueue('wardrobe_queue');
    channel.consume('wardrobe_queue', msg => {
      console.log('Received message:', msg.content.toString());
      channel.ack(msg);
    });

    console.log('🚀 Wardrobe service is running...');
  } catch (err) {
    console.error('❌ Error starting service:', err);
    process.exit(1);
  }
}

start();

const mongoose = require('mongoose');
const amqp = require('amqplib');
const Outfit = require('./models/Outfit');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://outfit_service:service_password_123@mongodb:27017/closetx_outfits';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
const PORT = process.env.PORT || 3003;

async function start() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Connect to RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    console.log('✅ Connected to RabbitMQ');

    // Example queue for outfit-related events
    await channel.assertQueue('outfit_queue');
    channel.consume('outfit_queue', msg => {
      console.log('Received message:', msg.content.toString());
      channel.ack(msg);
    });

    // Start HTTP server for health checks or API
    const express = require('express');
    const app = express();
    app.get('/health', (req, res) => res.sendStatus(200));
    app.listen(PORT, () => console.log(`🚀 Outfit service running on port ${PORT}`));
    
  } catch (err) {
    console.error('❌ Error starting service:', err);
    process.exit(1);
  }
}

start();

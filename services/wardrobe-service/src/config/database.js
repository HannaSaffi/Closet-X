// services/wardrobe-service/src/config/database.js
const mongoose = require('mongoose');

let isConnected = false;

const connectDatabase = async () => {
  if (isConnected) {
    console.log('📦 Using existing database connection');
    return;
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/closetx_wardrobe';

  try {
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4
    });

    isConnected = true;
    console.log('✅ MongoDB connected successfully');
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
      isConnected = false;
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
};

module.exports = { connectDatabase };
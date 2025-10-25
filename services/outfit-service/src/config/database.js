// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useCreateIndex: true, // Deprecated in Mongoose 6+
      // useFindAndModify: false // Deprecated in Mongoose 6+
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Database health check
const checkDatabaseHealth = async () => {
  try {
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.ping();
    return { status: 'healthy', response: result };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

// Get database statistics
const getDatabaseStats = async () => {
  try {
    const stats = await mongoose.connection.db.stats();
    return {
      database: mongoose.connection.name,
      collections: stats.collections,
      dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
      objects: stats.objects
    };
  } catch (error) {
    throw new Error(`Failed to get database stats: ${error.message}`);
  }
};

module.exports
const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

exports.connectDB = async () => {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Mongo connected');
};

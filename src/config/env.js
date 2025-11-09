require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 4000,
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/closetx',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret'
};

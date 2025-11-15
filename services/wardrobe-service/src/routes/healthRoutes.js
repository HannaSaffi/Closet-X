const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
  const health = {
    service: 'wardrobe-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: { database: 'unknown', memory: 'unknown' }
  };

  try {
    health.checks.database = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    if (health.checks.database === 'disconnected') health.status = 'unhealthy';

    const mem = process.memoryUsage();
    health.checks.memory = {
      heapUsed: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    res.status(503).json(health);
  }
});

module.exports = router;

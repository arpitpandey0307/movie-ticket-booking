import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import logger from './lib/logger';
import prisma from './lib/prisma';
import redis from './lib/redis';

const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected');

    // Try to connect to Redis (optional)
    try {
      await redis.connect();
      await redis.ping();
      logger.info('Redis connected');
    } catch (redisError) {
      logger.warn('Redis not available - continuing without caching');
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  try {
    await redis.quit();
  } catch (e) {
    // Redis might not be connected
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  try {
    await redis.quit();
  } catch (e) {
    // Redis might not be connected
  }
  process.exit(0);
});

startServer();

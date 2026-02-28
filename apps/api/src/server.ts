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

    // Test Redis connection (optional for now)
    try {
      await redis.ping();
      logger.info('Redis connected');
    } catch (redisError) {
      logger.warn('Redis connection failed - continuing without Redis');
      logger.warn({ redisError }, 'Redis error details');
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
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  await redis.quit();
  process.exit(0);
});

startServer();

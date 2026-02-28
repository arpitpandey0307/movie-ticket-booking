import Redis from 'ioredis';
import logger from './logger';

const redisClientSingleton = () => {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      // Stop retrying after first attempt
      if (times > 1) {
        return null;
      }
      return 100;
    },
    lazyConnect: true, // Don't connect immediately
    enableOfflineQueue: false, // Don't queue commands when offline
  });

  client.on('error', (err) => {
    logger.warn({ err }, 'Redis connection error - Redis features disabled');
  });

  client.on('connect', () => {
    logger.info('Redis connected');
  });

  return client;
};

declare global {
  var redis: undefined | ReturnType<typeof redisClientSingleton>;
}

const redis = globalThis.redis ?? redisClientSingleton();

export default redis;

if (process.env.NODE_ENV !== 'production') globalThis.redis = redis;

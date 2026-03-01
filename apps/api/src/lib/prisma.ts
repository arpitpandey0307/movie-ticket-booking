import { PrismaClient } from '@prisma/client';
import logger from './logger';

// ENTERPRISE: Ensure DATABASE_URL has SSL for production (Railway requirement)
function getDatabaseUrl(): string {
  let dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Add SSL parameter if not present and in production
  if (process.env.NODE_ENV === 'production') {
    if (!dbUrl.includes('sslmode=') && !dbUrl.includes('ssl=')) {
      const separator = dbUrl.includes('?') ? '&' : '?';
      dbUrl = `${dbUrl}${separator}sslmode=require`;
      logger.info('Added SSL mode to DATABASE_URL for production');
    }
  }

  return dbUrl;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
    ],
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug({ query: e.query, duration: e.duration }, 'Database query');
  });
}

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

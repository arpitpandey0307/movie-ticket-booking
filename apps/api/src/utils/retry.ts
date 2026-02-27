import logger from '../lib/logger';

/**
 * ENTERPRISE: Retry wrapper for SERIALIZABLE transaction conflicts
 * 
 * Only retries true serialization errors, not business logic failures.
 * Implements exponential backoff to reduce contention.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: { operation: string; userId?: string; metadata?: any },
  maxAttempts = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      // CRITICAL: Only retry true serialization conflicts and deadlocks
      const isSerializationError =
        error.code === 'P2034' || // Prisma serialization error
        error.code === '40001' || // PostgreSQL serialization failure
        error.code === '40P01'; // PostgreSQL deadlock detected

      // CRITICAL: Never retry business logic errors
      const isBusinessError =
        error.message?.includes('Seat locked') ||
        error.message?.includes('Seat booked') ||
        error.message?.includes('Lock expired') ||
        error.message?.includes('already booked') ||
        error.message?.includes('not found') ||
        error.message?.includes('ownership') ||
        error.message?.includes('Rate limit');

      if (isBusinessError) {
        throw error; // Fail fast on business logic
      }

      if (isSerializationError && attempt < maxAttempts) {
        const backoffMs = 10 * Math.pow(2, attempt - 1);

        // ENTERPRISE: Log retry for observability
        logger.warn(
          {
            attempt,
            maxAttempts,
            backoffMs,
            operation: context.operation,
            userId: context.userId,
            metadata: context.metadata,
            errorCode: error.code,
          },
          'Serialization conflict - retrying with backoff'
        );

        await sleep(backoffMs);
        continue;
      }

      // Not a serialization error or max attempts reached
      if (isSerializationError) {
        // Max attempts exhausted
        logger.error(
          {
            maxAttempts,
            operation: context.operation,
            userId: context.userId,
            metadata: context.metadata,
          },
          'Max retry attempts exhausted - serialization conflict persists'
        );
        throw new Error(
          'Service temporarily unavailable due to high contention. Please retry in a moment.'
        );
      }

      throw error;
    }
  }

  throw new Error('Max retry attempts exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

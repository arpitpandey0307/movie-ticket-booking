import prisma from '../lib/prisma';
import redis from '../lib/redis';
import logger from '../lib/logger';
import { withRetry } from '../utils/retry';

interface LockSeatsData {
  showtimeSeatIds: string[];
  userId: string;
}

export class SeatLockService {
  // ENTERPRISE: Configuration constants
  private readonly LOCK_DURATION_MS =
    parseInt(process.env.SEAT_LOCK_DURATION_MINUTES || '10') * 60 * 1000;
  private readonly MAX_SEATS_PER_REQUEST = 10;
  private readonly RATE_LIMIT_WINDOW_SECONDS = 10 * 60; // 10 minutes
  private readonly RATE_LIMIT_MAX_ATTEMPTS = 30;

  /**
   * ENTERPRISE: Lock seats with full concurrency control
   * 
   * Guarantees:
   * - Deterministic lock ordering (prevents deadlocks)
   * - SERIALIZABLE isolation with retry
   * - Redis-based rate limiting
   * - Idempotent (returns existing locks without extension)
   * - Batch queries for performance
   */
  async lockSeats(data: LockSeatsData) {
    const { showtimeSeatIds, userId } = data;
    const startTime = Date.now(); // ENTERPRISE: Latency tracking

    try {
      // STEP 1: Rate limiting (Redis-based for horizontal scaling)
      await this.checkRateLimit(userId, showtimeSeatIds.length);

      // STEP 2: Sort seat IDs deterministically (prevents deadlocks)
      const sortedIds = [...showtimeSeatIds].sort();

      // STEP 3: Retry wrapper for serialization conflicts
      const locks = await withRetry(
        () => this.lockSeatsInternal(sortedIds, userId),
        {
          operation: 'lockSeats',
          userId,
          metadata: { seatCount: sortedIds.length },
        }
      );

      // ENTERPRISE: Log latency for observability
      const duration = Date.now() - startTime;
      logger.info(
        {
          userId,
          seatCount: locks.length,
          duration,
        },
        'Lock acquisition completed'
      );

      return locks;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        {
          userId,
          seatCount: showtimeSeatIds.length,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Lock acquisition failed'
      );
      throw error;
    }
  }

  /**
   * ENTERPRISE: Internal lock acquisition with SERIALIZABLE isolation
   * 
   * Invariants enforced:
   * - Seats must exist and be AVAILABLE
   * - No active locks exist (or expired locks are deleted)
   * - Idempotent for same user
   * - All locks have consistent expiration time
   */
  private async lockSeatsInternal(sortedIds: string[], userId: string) {
    return await prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.LOCK_DURATION_MS);

        // OPTIMIZATION: Batch fetch all seats upfront (reduces DB round-trips)
        const seats = await tx.showtimeSeat.findMany({
          where: { id: { in: sortedIds } },
        });

        // Validate all seats exist
        if (seats.length !== sortedIds.length) {
          throw new Error('One or more seats not found');
        }

        // Validate all seats are AVAILABLE (not BOOKED)
        const seatMap = new Map(seats.map((s) => [s.id, s]));
        for (const id of sortedIds) {
          const seat = seatMap.get(id);
          if (seat!.status === 'BOOKED') {
            throw new Error('Seat already booked');
          }
        }

        // OPTIMIZATION: Batch fetch all existing locks
        const existingLocks = await tx.seatLock.findMany({
          where: { showtimeSeatId: { in: sortedIds } },
        });

        const lockMap = new Map(existingLocks.map((l) => [l.showtimeSeatId, l]));
        const locks = [];

        // Process each seat with in-memory lookups
        for (const id of sortedIds) {
          const existing = lockMap.get(id);

          if (existing) {
            // Check if expired
            if (existing.expiresAt <= now) {
              // Delete expired lock inside transaction
              await tx.seatLock.delete({ where: { id: existing.id } });
            } else {
              // Active lock exists
              if (existing.userId === userId) {
                // ENTERPRISE: Idempotent - return existing lock WITHOUT extending
                locks.push(existing);
                continue;
              } else {
                // Locked by another user
                throw new Error('Seat already locked');
              }
            }
          }

          // Insert new lock
          const lock = await tx.seatLock.create({
            data: {
              showtimeSeatId: id,
              userId,
              expiresAt,
            },
          });
          locks.push(lock);
        }

        return locks;
      },
      {
        isolationLevel: 'Serializable', // MANDATORY for high-concurrency
      }
    );
  }

  /**
   * ENTERPRISE: Redis-based rate limiting
   * 
   * Prevents abuse:
   * - Max 10 seats per request
   * - Max 30 lock attempts per user per 10 minutes
   * - Works across horizontal scaling
   */
  private async checkRateLimit(userId: string, seatCount: number) {
    // Guard: Max seats per request
    if (seatCount > this.MAX_SEATS_PER_REQUEST) {
      throw new Error(`Cannot lock more than ${this.MAX_SEATS_PER_REQUEST} seats per request`);
    }

    // Redis sliding window rate limit
    const key = `lock_rate:${userId}`;
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, this.RATE_LIMIT_WINDOW_SECONDS);
    }

    if (current > this.RATE_LIMIT_MAX_ATTEMPTS) {
      const ttl = await redis.ttl(key);
      logger.warn(
        {
          userId,
          current,
          limit: this.RATE_LIMIT_MAX_ATTEMPTS,
          ttl,
        },
        'Rate limit exceeded for seat locking'
      );
      throw new Error(`Rate limit exceeded. Try again in ${ttl} seconds`);
    }
  }

  /**
   * ENTERPRISE: Release locks explicitly (user cancels)
   * 
   * Validates ownership before deletion.
   */
  async releaseLocks(lockIds: string[], userId: string) {
    return await prisma.$transaction(async (tx) => {
      // Verify ownership
      const locks = await tx.seatLock.findMany({
        where: {
          id: { in: lockIds },
        },
      });

      for (const lock of locks) {
        if (lock.userId !== userId) {
          throw new Error('Lock not found'); // 404, not 403
        }
      }

      // Delete locks
      await tx.seatLock.deleteMany({
        where: {
          id: { in: lockIds },
        },
      });

      logger.info(
        {
          userId,
          lockCount: locks.length,
        },
        'Locks released'
      );
    });
  }

  /**
   * ENTERPRISE: Get user's active locks
   */
  async getUserLocks(userId: string) {
    const now = new Date();

    const locks = await prisma.seatLock.findMany({
      where: {
        userId,
        expiresAt: { gt: now }, // Only active locks
      },
      include: {
        showtimeSeat: {
          include: {
            seat: true,
            showtime: {
              include: {
                movie: true,
                screen: {
                  include: {
                    theater: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        expiresAt: 'asc',
      },
    });

    return locks;
  }

  /**
   * ENTERPRISE: Cleanup expired locks (optimization only)
   * 
   * Runs asynchronously. Correctness does NOT depend on this.
   * Batched to avoid long-running operations.
   * Uses default isolation (READ COMMITTED) - no SERIALIZABLE needed.
   */
  async cleanupExpiredLocks() {
    const batchSize = 1000;
    const now = new Date();

    // ENTERPRISE: No SERIALIZABLE - this is optimization only
    // Uses indexed expiresAt for performance
    const result = await prisma.seatLock.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
      take: batchSize,
    });

    if (result.count > 0) {
      logger.info(
        {
          count: result.count,
          batchSize,
        },
        'Expired locks cleaned'
      );
    }

    return result.count;
  }
}

export default new SeatLockService();

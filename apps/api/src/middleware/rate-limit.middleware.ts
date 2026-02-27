import { Request, Response, NextFunction } from 'express';
import redis from '../lib/redis';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  keyPrefix?: string;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix = 'ratelimit' } = options;
  const windowSeconds = Math.ceil(windowMs / 1000);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Use IP address as identifier
      const identifier = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `${keyPrefix}:${identifier}`;

      // Increment counter
      const current = await redis.incr(key);

      // Set expiry on first request
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      // Check if limit exceeded
      if (current > max) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
          },
        });
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));

      next();
    } catch (error) {
      // If Redis fails, allow the request (fail open)
      next();
    }
  };
}

// Predefined rate limiters
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  keyPrefix: 'auth',
});

export const bookingRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per 5 minutes
  keyPrefix: 'booking',
});

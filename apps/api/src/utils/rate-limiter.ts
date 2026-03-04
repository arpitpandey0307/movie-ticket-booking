import redis from '../lib/redis';
import { OTP_CONFIG } from '../services/otp.service';

/**
 * Rate limiter for OTP generation
 * Limits to 3 OTP requests per hour per email
 */
export async function checkOTPGenerationRateLimit(
  email: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `otp:ratelimit:generation:${email}`;
  const limit = OTP_CONFIG.RATE_LIMIT_PER_HOUR;
  const windowSeconds = 3600; // 1 hour

  try {
    // Check if Redis is connected
    if (redis.status !== 'ready') {
      // If Redis is not available, allow the request (fail open)
      return { allowed: true };
    }

    // Get current count
    const current = await redis.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= limit) {
      // Get TTL to tell user when they can retry
      const ttl = await redis.ttl(key);
      return {
        allowed: false,
        retryAfter: ttl > 0 ? ttl : windowSeconds,
      };
    }

    // Increment counter
    if (count === 0) {
      // First request in window, set with expiry
      await redis.setex(key, windowSeconds, '1');
    } else {
      // Increment existing counter
      await redis.incr(key);
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - allow the request if Redis fails
    return { allowed: true };
  }
}

/**
 * Rate limiter for OTP verification attempts
 * This is handled in the database (attempts field in EmailVerification)
 * but we can add an additional Redis-based check for extra protection
 */
export async function checkOTPVerificationRateLimit(
  userId: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const key = `otp:ratelimit:verification:${userId}`;
  const limit = OTP_CONFIG.MAX_ATTEMPTS;
  const windowSeconds = OTP_CONFIG.LOCKOUT_MINUTES * 60;

  try {
    // Check if Redis is connected
    if (redis.status !== 'ready') {
      // If Redis is not available, rely on database checks
      return { allowed: true };
    }

    // Get current count
    const current = await redis.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= limit) {
      // Get TTL
      const ttl = await redis.ttl(key);
      return {
        allowed: false,
        retryAfter: ttl > 0 ? ttl : windowSeconds,
      };
    }

    // Increment counter
    if (count === 0) {
      // First attempt in window
      await redis.setex(key, windowSeconds, '1');
    } else {
      // Increment existing counter
      await redis.incr(key);
    }

    return { allowed: true };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Fail open - rely on database checks
    return { allowed: true };
  }
}

/**
 * Reset rate limit counters for a user
 * Used after successful verification
 */
export async function resetOTPRateLimits(
  userId: string,
  email: string
): Promise<void> {
  try {
    if (redis.status !== 'ready') {
      return;
    }

    const verificationKey = `otp:ratelimit:verification:${userId}`;
    const generationKey = `otp:ratelimit:generation:${email}`;

    await Promise.all([redis.del(verificationKey), redis.del(generationKey)]);
  } catch (error) {
    console.error('Failed to reset rate limits:', error);
    // Non-critical, just log the error
  }
}

/**
 * Check if an account is locked (Redis-based check)
 * This complements the database-based lock check
 */
export async function checkAccountLockRedis(
  userId: string
): Promise<{ locked: boolean; unlockAt?: Date }> {
  const key = `account:lock:${userId}`;

  try {
    if (redis.status !== 'ready') {
      return { locked: false };
    }

    const ttl = await redis.ttl(key);
    if (ttl > 0) {
      const unlockAt = new Date(Date.now() + ttl * 1000);
      return { locked: true, unlockAt };
    }

    return { locked: false };
  } catch (error) {
    console.error('Account lock check failed:', error);
    return { locked: false };
  }
}

/**
 * Lock an account in Redis
 */
export async function lockAccountRedis(
  userId: string,
  durationMinutes: number
): Promise<void> {
  const key = `account:lock:${userId}`;
  const durationSeconds = durationMinutes * 60;

  try {
    if (redis.status !== 'ready') {
      return;
    }

    await redis.setex(key, durationSeconds, '1');
  } catch (error) {
    console.error('Failed to lock account in Redis:', error);
    // Non-critical, database lock will still work
  }
}

/**
 * Unlock an account in Redis
 */
export async function unlockAccountRedis(userId: string): Promise<void> {
  const key = `account:lock:${userId}`;

  try {
    if (redis.status !== 'ready') {
      return;
    }

    await redis.del(key);
  } catch (error) {
    console.error('Failed to unlock account in Redis:', error);
  }
}

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { VerificationType } from '@repo/shared-types';

// OTP Configuration
export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 10,
  MAX_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 15,
  RATE_LIMIT_PER_HOUR: 3,
};

/**
 * Generate a 6-digit random OTP
 * Uses crypto.randomInt for cryptographically secure random numbers
 */
export function generateOTP(): string {
  const min = 100000; // Minimum 6-digit number
  const max = 999999; // Maximum 6-digit number
  const otp = crypto.randomInt(min, max + 1);
  return otp.toString();
}

/**
 * Hash an OTP using bcrypt
 * @param otp - The plain text OTP to hash
 * @returns Promise<string> - The hashed OTP
 */
export async function hashOTP(otp: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(otp, saltRounds);
}

/**
 * Verify an OTP against its hash using constant-time comparison
 * @param otp - The plain text OTP to verify
 * @param hash - The hashed OTP to compare against
 * @returns Promise<boolean> - True if OTP matches, false otherwise
 */
export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

/**
 * Create a new email verification record with OTP
 * @param userId - The user ID to create verification for
 * @param type - The type of verification (SIGNUP, LOGIN, PASSWORD_RESET)
 * @returns Promise with the created verification record (without otpHash)
 */
export async function createVerification(
  userId: string,
  type: VerificationType
): Promise<{ id: string; otp: string; expiresAt: Date }> {
  // Generate OTP
  const otp = generateOTP();
  const otpHash = await hashOTP(otp);

  // Calculate expiration time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_CONFIG.EXPIRY_MINUTES);

  // Invalidate any existing unverified OTPs for this user and type
  await prisma.emailVerification.updateMany({
    where: {
      userId,
      type,
      verified: false,
    },
    data: {
      verified: true, // Mark as verified to invalidate
    },
  });

  // Create new verification record
  const verification = await prisma.emailVerification.create({
    data: {
      userId,
      otpHash,
      type,
      expiresAt,
    },
  });

  return {
    id: verification.id,
    otp, // Return plain OTP for sending via email
    expiresAt: verification.expiresAt,
  };
}

/**
 * Validate an OTP for a user
 * Checks expiration, attempt count, and verifies the OTP
 * @param userId - The user ID
 * @param otp - The plain text OTP to validate
 * @param type - The verification type
 * @returns Promise<{ valid: boolean; error?: string; attemptsRemaining?: number }>
 */
export async function validateOTP(
  userId: string,
  otp: string,
  type: VerificationType
): Promise<{ valid: boolean; error?: string; attemptsRemaining?: number }> {
  // Find the most recent unverified verification for this user and type
  const verification = await prisma.emailVerification.findFirst({
    where: {
      userId,
      type,
      verified: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (!verification) {
    return {
      valid: false,
      error: 'No verification request found. Please request a new OTP.',
    };
  }

  // Check if expired
  if (new Date() > verification.expiresAt) {
    return {
      valid: false,
      error: 'OTP has expired. Please request a new one.',
    };
  }

  // Check if max attempts exceeded
  if (verification.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
    // Lock the account
    await prisma.user.update({
      where: { id: userId },
      data: {
        accountLockedUntil: new Date(
          Date.now() + OTP_CONFIG.LOCKOUT_MINUTES * 60 * 1000
        ),
      },
    });

    return {
      valid: false,
      error: `Maximum attempts exceeded. Account locked for ${OTP_CONFIG.LOCKOUT_MINUTES} minutes.`,
    };
  }

  // Increment attempt counter
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: {
      attempts: verification.attempts + 1,
    },
  });

  // Verify the OTP
  const isValid = await verifyOTP(otp, verification.otpHash);

  if (!isValid) {
    const attemptsRemaining =
      OTP_CONFIG.MAX_ATTEMPTS - (verification.attempts + 1);
    return {
      valid: false,
      error: 'Invalid OTP. Please try again.',
      attemptsRemaining: Math.max(0, attemptsRemaining),
    };
  }

  // Mark as verified
  await prisma.emailVerification.update({
    where: { id: verification.id },
    data: {
      verified: true,
    },
  });

  return { valid: true };
}

/**
 * Invalidate all OTPs for a user
 * @param userId - The user ID
 * @param type - Optional: specific verification type to invalidate
 */
export async function invalidateOTPs(
  userId: string,
  type?: VerificationType
): Promise<void> {
  const where: any = {
    userId,
    verified: false,
  };

  if (type) {
    where.type = type;
  }

  await prisma.emailVerification.updateMany({
    where,
    data: {
      verified: true,
    },
  });
}

/**
 * Cleanup expired OTPs
 * Should be run as a background job
 * Deletes verification records older than 24 hours
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const result = await prisma.emailVerification.deleteMany({
    where: {
      createdAt: {
        lt: twentyFourHoursAgo,
      },
    },
  });

  return result.count;
}

/**
 * Check if user account is locked
 * @param userId - The user ID to check
 * @returns Promise<{ locked: boolean; unlockAt?: Date }>
 */
export async function checkAccountLock(
  userId: string
): Promise<{ locked: boolean; unlockAt?: Date }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountLockedUntil: true },
  });

  if (!user || !user.accountLockedUntil) {
    return { locked: false };
  }

  const now = new Date();
  if (now < user.accountLockedUntil) {
    return {
      locked: true,
      unlockAt: user.accountLockedUntil,
    };
  }

  // Lock has expired, clear it
  await prisma.user.update({
    where: { id: userId },
    data: { accountLockedUntil: null },
  });

  return { locked: false };
}

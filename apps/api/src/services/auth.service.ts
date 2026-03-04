import prisma from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { Role } from '@prisma/client';
import { VerificationType } from '@repo/shared-types';
import {
  createVerification,
  validateOTP,
  invalidateOTPs,
  checkAccountLock,
} from './otp.service';
import {
  sendOTPEmail,
  sendAccountLockedEmail,
  sendPasswordResetSuccessEmail,
} from './email.service';
import {
  checkOTPGenerationRateLimit,
  resetOTPRateLimits,
} from '../utils/rate-limiter';

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: Role;
}

interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  /**
   * Signup with OTP verification
   * Creates an unverified user and sends OTP
   */
  async signupWithOTP(data: SignupData) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Check rate limit
    const rateLimit = await checkOTPGenerationRateLimit(data.email);
    if (!rateLimit.allowed) {
      throw new Error(
        `Too many OTP requests. Please try again in ${Math.ceil(rateLimit.retryAfter! / 60)} minutes.`
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create unverified user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        emailVerified: false, // User starts unverified
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    // Generate and send OTP
    const verification = await createVerification(user.id, 'SIGNUP');
    await sendOTPEmail(
      user.email,
      verification.otp,
      'SIGNUP',
      user.firstName
    );

    return {
      userId: user.id,
      email: user.email,
      message: 'Verification code sent to your email',
    };
  }

  /**
   * Verify signup OTP and activate account
   */
  async verifySignupOTP(userId: string, otp: string) {
    // Check if account is locked
    const lockStatus = await checkAccountLock(userId);
    if (lockStatus.locked) {
      throw new Error(
        `Account is locked until ${lockStatus.unlockAt?.toLocaleString()}. Please try again later.`
      );
    }

    // Validate OTP
    const result = await validateOTP(userId, otp, 'SIGNUP');

    if (!result.valid) {
      if (result.attemptsRemaining !== undefined) {
        throw new Error(
          `${result.error} (${result.attemptsRemaining} attempts remaining)`
        );
      }
      throw new Error(result.error || 'Invalid OTP');
    }

    // Mark user as verified
    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Reset rate limits
    await resetOTPRateLimits(userId, user.email);

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  async signup(data: SignupData) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  async login(data: LoginData) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      // Send OTP for verification
      return this.loginWithOTP(user.id, user.email, user.firstName);
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token, requiresOTP: false };
  }

  /**
   * Login with OTP for unverified users
   * Internal method called by login
   */
  private async loginWithOTP(userId: string, email: string, firstName: string) {
    // Check rate limit
    const rateLimit = await checkOTPGenerationRateLimit(email);
    if (!rateLimit.allowed) {
      throw new Error(
        `Too many OTP requests. Please try again in ${Math.ceil(rateLimit.retryAfter! / 60)} minutes.`
      );
    }

    // Check if account is locked
    const lockStatus = await checkAccountLock(userId);
    if (lockStatus.locked) {
      throw new Error(
        `Account is locked until ${lockStatus.unlockAt?.toLocaleString()}. Please try again later.`
      );
    }

    // Generate and send OTP
    const verification = await createVerification(userId, 'LOGIN');
    await sendOTPEmail(email, verification.otp, 'LOGIN', firstName);

    return {
      requiresOTP: true,
      userId,
      message: 'Please verify your email with the OTP sent to your inbox',
    };
  }

  /**
   * Verify login OTP
   */
  async verifyLoginOTP(userId: string, otp: string) {
    // Check if account is locked
    const lockStatus = await checkAccountLock(userId);
    if (lockStatus.locked) {
      throw new Error(
        `Account is locked until ${lockStatus.unlockAt?.toLocaleString()}. Please try again later.`
      );
    }

    // Validate OTP
    const result = await validateOTP(userId, otp, 'LOGIN');

    if (!result.valid) {
      if (result.attemptsRemaining !== undefined) {
        throw new Error(
          `${result.error} (${result.attemptsRemaining} attempts remaining)`
        );
      }
      throw new Error(result.error || 'Invalid OTP');
    }

    // Mark user as verified
    const user = await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Reset rate limits
    await resetOTPRateLimits(userId, user.email);

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  /**
   * Resend OTP
   */
  async resendOTP(userId: string, type: VerificationType) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check rate limit
    const rateLimit = await checkOTPGenerationRateLimit(user.email);
    if (!rateLimit.allowed) {
      throw new Error(
        `Too many OTP requests. Please try again in ${Math.ceil(rateLimit.retryAfter! / 60)} minutes.`
      );
    }

    // Check if account is locked
    const lockStatus = await checkAccountLock(userId);
    if (lockStatus.locked) {
      throw new Error(
        `Account is locked until ${lockStatus.unlockAt?.toLocaleString()}. Please try again later.`
      );
    }

    // Generate and send new OTP
    const verification = await createVerification(userId, type);
    await sendOTPEmail(user.email, verification.otp, type, user.firstName);

    return {
      message: 'New verification code sent to your email',
      expiresAt: verification.expiresAt,
    };
  }

  /**
   * Request password reset
   * Sends OTP to email if user exists
   */
  async requestPasswordReset(email: string) {
    // Check rate limit
    const rateLimit = await checkOTPGenerationRateLimit(email);
    if (!rateLimit.allowed) {
      // Return generic message to prevent email enumeration
      return {
        message:
          'If an account exists with this email, you will receive a password reset code.',
      };
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
      },
    });

    // Always return success message to prevent email enumeration
    if (!user) {
      return {
        message:
          'If an account exists with this email, you will receive a password reset code.',
      };
    }

    // Check if account is locked
    const lockStatus = await checkAccountLock(user.id);
    if (lockStatus.locked) {
      // Still return generic message
      return {
        message:
          'If an account exists with this email, you will receive a password reset code.',
      };
    }

    // Generate and send OTP
    const verification = await createVerification(user.id, 'PASSWORD_RESET');
    await sendOTPEmail(
      user.email,
      verification.otp,
      'PASSWORD_RESET',
      user.firstName
    );

    return {
      message:
        'If an account exists with this email, you will receive a password reset code.',
    };
  }

  /**
   * Verify password reset OTP
   * Returns a temporary reset token
   */
  async verifyPasswordResetOTP(email: string, otp: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new Error('Invalid verification code');
    }

    // Check if account is locked
    const lockStatus = await checkAccountLock(user.id);
    if (lockStatus.locked) {
      throw new Error(
        `Account is locked until ${lockStatus.unlockAt?.toLocaleString()}. Please try again later.`
      );
    }

    // Validate OTP
    const result = await validateOTP(user.id, otp, 'PASSWORD_RESET');

    if (!result.valid) {
      if (result.attemptsRemaining !== undefined) {
        throw new Error(
          `${result.error} (${result.attemptsRemaining} attempts remaining)`
        );
      }
      throw new Error(result.error || 'Invalid verification code');
    }

    // Generate temporary reset token (valid for 15 minutes)
    const resetToken = generateToken(
      {
        id: user.id,
        userId: user.id,
        email: user.email,
        purpose: 'password_reset',
      },
      '15m'
    );

    return {
      resetToken,
      message: 'Verification successful. You can now reset your password.',
    };
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(resetToken: string, newPassword: string) {
    // Verify reset token
    let decoded: any;
    try {
      const jwt = require('jsonwebtoken');
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);

      if (decoded.purpose !== 'password_reset') {
        throw new Error('Invalid reset token');
      }
    } catch (error) {
      throw new Error('Invalid or expired reset token');
    }

    const userId = decoded.userId;

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and invalidate all OTPs
    const user = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: {
        id: true,
        email: true,
        firstName: true,
      },
    });

    // Invalidate all OTPs for this user
    await invalidateOTPs(userId);

    // Reset rate limits
    await resetOTPRateLimits(userId, user.email);

    // Send confirmation email
    await sendPasswordResetSuccessEmail(user.email, user.firstName);

    return {
      message: 'Password reset successful. You can now log in with your new password.',
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}

export default new AuthService();

import { Router } from 'express';
import authService from '../services/auth.service';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimit } from '../middleware/rate-limit.middleware';
import {
  signupSchema,
  loginSchema,
  verifyOTPSchema,
  resendOTPSchema,
  forgotPasswordSchema,
  verifyResetOTPSchema,
  resetPasswordSchema,
} from '../utils/validators';
import logger from '../lib/logger';

const router = Router();

// POST /api/auth/signup - Create account and send OTP
router.post(
  '/signup',
  authRateLimit,
  validate(signupSchema),
  async (req, res, next) => {
    try {
      const result = await authService.signupWithOTP(req.body);

      logger.info({ userId: result.userId, email: result.email }, 'User signed up, OTP sent');

      res.status(201).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Signup error');
      res.status(400).json({
        success: false,
        error: {
          code: 'SIGNUP_ERROR',
          message: error.message,
        },
      });
    }
  }
);

// POST /api/auth/verify-signup - Verify signup OTP
router.post(
  '/verify-signup',
  authRateLimit,
  validate(verifyOTPSchema),
  async (req, res, next) => {
    try {
      const { userId, otp } = req.body;
      const result = await authService.verifySignupOTP(userId, otp);

      logger.info({ userId: result.user.id }, 'Signup OTP verified');

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Signup verification error');
      res.status(400).json({
        success: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: error.message,
        },
      });
    }
  }
);

// POST /api/auth/login - Login (may require OTP for unverified users)
router.post(
  '/login',
  authRateLimit,
  validate(loginSchema),
  async (req, res, next) => {
    try {
      const result = await authService.login(req.body);

      if (result.requiresOTP) {
        logger.info({ userId: result.userId }, 'Login requires OTP verification');
        res.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        });
      } else {
        logger.info(
          { userId: result.user.id, email: result.user.email },
          'User logged in'
        );
        res.json({
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Login error');
      res.status(401).json({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: error.message,
        },
      });
    }
  }
);

// POST /api/auth/verify-login - Verify login OTP
router.post(
  '/verify-login',
  authRateLimit,
  validate(verifyOTPSchema),
  async (req, res, next) => {
    try {
      const { userId, otp } = req.body;
      const result = await authService.verifyLoginOTP(userId, otp);

      logger.info({ userId: result.user.id }, 'Login OTP verified');

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Login verification error');
      res.status(400).json({
        success: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: error.message,
        },
      });
    }
  }
);

// POST /api/auth/resend-otp - Resend OTP
router.post(
  '/resend-otp',
  authRateLimit,
  validate(resendOTPSchema),
  async (req, res, next) => {
    try {
      const { userId, type } = req.body;
      const result = await authService.resendOTP(userId, type);

      logger.info({ userId, type }, 'OTP resent');

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Resend OTP error');
      res.status(400).json({
        success: false,
        error: {
          code: 'RESEND_ERROR',
          message: error.message,
        },
      });
    }
  }
);

// POST /api/auth/forgot-password - Request password reset
router.post(
  '/forgot-password',
  authRateLimit,
  validate(forgotPasswordSchema),
  async (req, res, next) => {
    try {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);

      logger.info({ email }, 'Password reset requested');

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Password reset request error');
      res.status(400).json({
        success: false,
        error: {
          code: 'PASSWORD_RESET_ERROR',
          message: error.message,
        },
      });
    }
  }
);

// POST /api/auth/verify-reset-otp - Verify password reset OTP
router.post(
  '/verify-reset-otp',
  authRateLimit,
  validate(verifyResetOTPSchema),
  async (req, res, next) => {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyPasswordResetOTP(email, otp);

      logger.info({ email }, 'Password reset OTP verified');

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Password reset verification error');
      res.status(400).json({
        success: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: error.message,
        },
      });
    }
  }
);

// POST /api/auth/reset-password - Reset password with token
router.post(
  '/reset-password',
  authRateLimit,
  validate(resetPasswordSchema),
  async (req, res, next) => {
    try {
      const { resetToken, newPassword } = req.body;
      const result = await authService.resetPassword(resetToken, newPassword);

      logger.info('Password reset successful');

      res.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Password reset error');
      res.status(400).json({
        success: false,
        error: {
          code: 'PASSWORD_RESET_ERROR',
          message: error.message,
        },
      });
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user!.userId);

    res.json({
      success: true,
      data: user,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Get user error');
    res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: error.message,
      },
    });
  }
});

export default router;

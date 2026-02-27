import { Router } from 'express';
import authService from '../services/auth.service';
import { validate } from '../middleware/validation.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimit } from '../middleware/rate-limit.middleware';
import { signupSchema, loginSchema } from '../utils/validators';
import logger from '../lib/logger';

const router = Router();

// POST /api/auth/signup
router.post('/signup', authRateLimit, validate(signupSchema), async (req, res, next) => {
  try {
    const result = await authService.signup(req.body);

    logger.info({ userId: result.user.id, email: result.user.email }, 'User signed up');

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
});

// POST /api/auth/login
router.post('/login', authRateLimit, validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    logger.info({ userId: result.user.id, email: result.user.email }, 'User logged in');

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
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
});

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

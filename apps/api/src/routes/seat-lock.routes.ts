import { Router } from 'express';
import seatLockService from '../services/seat-lock.service';
import { authenticate } from '../middleware/auth.middleware';
import logger from '../lib/logger';

const router = Router();

/**
 * POST /api/seat-locks
 * Lock seats for booking
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { showtimeSeatIds } = req.body;
    const userId = req.user!.id;

    if (!Array.isArray(showtimeSeatIds) || showtimeSeatIds.length === 0) {
      return res.status(400).json({ error: 'showtimeSeatIds must be a non-empty array' });
    }

    const locks = await seatLockService.lockSeats({
      showtimeSeatIds,
      userId,
    });

    res.status(201).json({ locks });
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.user?.id }, 'Lock seats failed');
    next(error);
  }
});

/**
 * GET /api/seat-locks/my-locks
 * Get user's active locks
 */
router.get('/my-locks', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const locks = await seatLockService.getUserLocks(userId);

    res.json({ locks });
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.user?.id }, 'Get user locks failed');
    next(error);
  }
});

/**
 * DELETE /api/seat-locks
 * Release locks explicitly
 */
router.delete('/', authenticate, async (req, res, next) => {
  try {
    const { lockIds } = req.body;
    const userId = req.user!.id;

    if (!Array.isArray(lockIds) || lockIds.length === 0) {
      return res.status(400).json({ error: 'lockIds must be a non-empty array' });
    }

    await seatLockService.releaseLocks(lockIds, userId);

    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.user?.id }, 'Release locks failed');
    next(error);
  }
});

export default router;

import { Router } from 'express';
import bookingService from '../services/booking.service';
import { authenticate } from '../middleware/auth.middleware';
import logger from '../lib/logger';

const router = Router();

/**
 * POST /api/bookings
 * Create booking with locked seats
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { showtimeId, showtimeSeatIds } = req.body;
    const userId = req.user!.id;

    if (!showtimeId) {
      return res.status(400).json({ error: 'showtimeId is required' });
    }

    if (!Array.isArray(showtimeSeatIds) || showtimeSeatIds.length === 0) {
      return res.status(400).json({ error: 'showtimeSeatIds must be a non-empty array' });
    }

    const booking = await bookingService.createBooking({
      userId,
      showtimeId,
      showtimeSeatIds,
    });

    res.status(201).json({ booking });
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.user?.id }, 'Create booking failed');
    next(error);
  }
});

/**
 * GET /api/bookings/:id
 * Get booking by ID
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const booking = await bookingService.getBookingById(id, userId);

    res.json({ booking });
  } catch (error: any) {
    logger.error({ error: error.message, bookingId: req.params.id }, 'Get booking failed');
    next(error);
  }
});

/**
 * GET /api/bookings
 * Get user's bookings
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const bookings = await bookingService.getUserBookings(userId);

    res.json({ bookings });
  } catch (error: any) {
    logger.error({ error: error.message, userId: req.user?.id }, 'Get user bookings failed');
    next(error);
  }
});

/**
 * DELETE /api/bookings/:id
 * Cancel booking
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await bookingService.cancelBooking(id, userId);

    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, bookingId: req.params.id }, 'Cancel booking failed');
    next(error);
  }
});

export default router;

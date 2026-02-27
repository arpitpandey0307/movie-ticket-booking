import { Router } from 'express';
import paymentService from '../services/payment.service';
import { authenticate } from '../middleware/auth.middleware';
import logger from '../lib/logger';

const router = Router();

/**
 * POST /api/payments/create-intent
 * Create Stripe PaymentIntent for booking
 * 
 * CRITICAL: Validates locks before creating payment
 */
router.post('/create-intent', authenticate, async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user!.id;

    if (!bookingId) {
      return res.status(400).json({ error: 'bookingId is required' });
    }

    const result = await paymentService.createPaymentIntent({
      bookingId,
      userId,
    });

    res.json(result);
  } catch (error: any) {
    logger.error(
      {
        error: error.message,
        bookingId: req.body.bookingId,
        userId: req.user?.id,
      },
      'Create payment intent failed'
    );
    next(error);
  }
});

export default router;

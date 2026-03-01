import Stripe from 'stripe';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import stripe from '../lib/stripe';
import { Decimal } from '@prisma/client/runtime/library';

interface CreatePaymentIntentData {
  bookingId: string;
  userId: string;
}

export class PaymentService {
  /**
   * ENTERPRISE: Create Stripe PaymentIntent with lock validation
   * 
   * ARCHITECTURE: Three-phase pattern to avoid external I/O inside DB transactions
   * 
   * Phase 1: Validate (DB Transaction - Fast)
   *   - Fetch booking
   *   - Validate status and locks
   *   - Check idempotency
   * 
   * Phase 2: Create PaymentIntent (External I/O - No DB transaction)
   *   - Call Stripe API
   *   - No DB connection held
   * 
   * Phase 3: Persist (DB Transaction - Fast)
   *   - Store payment record
   *   - Link to booking
   * 
   * CRITICAL: Never perform external API calls inside DB transactions.
   * Violating this causes P2028 errors under connection pooling.
   */
  async createPaymentIntent(data: CreatePaymentIntentData) {
    const { bookingId, userId } = data;

    // Check if Stripe is configured
    if (!stripe) {
      throw new Error('Payment system not configured. Please contact support.');
    }

    // ============================================================
    // PHASE 1: VALIDATION (DB Transaction - Fast)
    // ============================================================
    const validationResult = await prisma.$transaction(async (tx) => {
      // Fetch booking with seats and locks
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          bookingSeats: {
            include: {
              showtimeSeat: {
                include: {
                  seat: true,
                  seatLocks: true,
                },
              },
            },
          },
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
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      if (booking.userId !== userId) {
        throw new Error('Booking not found'); // 404, not 403
      }

      // Validate booking status
      if (booking.status !== 'PENDING') {
        throw new Error(`Cannot create payment for ${booking.status} booking`);
      }

      // CRITICAL - Validate locks still active
      const now = new Date();
      for (const bookingSeat of booking.bookingSeats) {
        const lock = bookingSeat.showtimeSeat.seatLocks[0];

        if (!lock) {
          throw new Error('Lock expired - please re-select seats');
        }

        if (lock.expiresAt <= now) {
          throw new Error('Lock expired - please re-select seats');
        }

        if (lock.userId !== userId) {
          throw new Error('Lock ownership mismatch');
        }
      }

      // Check if payment already exists (idempotency)
      if (booking.paymentId) {
        const existingPayment = await tx.payment.findUnique({
          where: { id: booking.paymentId },
        });

        if (existingPayment) {
          logger.info(
            {
              bookingId,
              paymentId: existingPayment.id,
              stripePaymentIntentId: existingPayment.stripePaymentIntentId,
            },
            'Payment intent already exists (idempotent)'
          );

          return {
            alreadyExists: true,
            paymentIntentId: existingPayment.stripePaymentIntentId,
            // Note: clientSecret would need to be retrieved from Stripe if needed
          };
        }
      }

      // Return validated booking data for Phase 2
      return {
        alreadyExists: false,
        booking,
      };
    });

    // Handle idempotency case
    if (validationResult.alreadyExists) {
      return {
        clientSecret: null, // Would need Stripe API call to retrieve
        paymentIntentId: validationResult.paymentIntentId,
      };
    }

    // Type narrowing: booking is guaranteed to exist here
    if (!validationResult.booking) {
      throw new Error('Validation failed: booking not found');
    }

    const booking = validationResult.booking;

    // ============================================================
    // PHASE 2: CREATE STRIPE PAYMENT INTENT (External I/O - No DB Transaction)
    // ============================================================
    
    // Calculate amount (derived from booking, never from frontend)
    const amountDecimal = new Decimal(booking.totalAmount).mul(100);
    
    // Ensure it's an integer (no fractional cents)
    if (!amountDecimal.isInteger()) {
      throw new Error('Amount must be in whole cents');
    }
    
    const amountInCents = amountDecimal.toNumber();
    
    // Sanity check: amount must be positive and reasonable
    if (amountInCents <= 0 || amountInCents > 999999999) {
      throw new Error('Invalid payment amount');
    }

    // Call Stripe API (no DB transaction open)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        bookingId: booking.id,
        userId: booking.userId,
        bookingCode: booking.bookingCode,
        movieTitle: booking.showtime.movie.title,
        theaterName: booking.showtime.screen.theater.name,
        seatCount: booking.bookingSeats.length.toString(),
      },
      description: `Movie Ticket Booking - ${booking.bookingCode}`,
    });

    // ============================================================
    // PHASE 3: PERSIST PAYMENT RECORD (DB Transaction - Fast)
    // ============================================================
    const payment = await prisma.$transaction(async (tx) => {
      // Store payment record
      const newPayment = await tx.payment.create({
        data: {
          stripePaymentIntentId: paymentIntent.id,
          amount: booking.totalAmount,
          currency: 'usd',
          status: 'PENDING',
        },
      });

      // Link payment to booking
      await tx.booking.update({
        where: { id: bookingId },
        data: { paymentId: newPayment.id },
      });

      return newPayment;
    });

    logger.info(
      {
        bookingId,
        paymentId: payment.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: booking.totalAmount.toString(),
        seatCount: booking.bookingSeats.length,
      },
      'Payment intent created (3-phase pattern)'
    );

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * ENTERPRISE: Handle payment success from webhook
   * 
   * Called by WebhookService after event idempotency check.
   * Updates payment status and triggers booking confirmation.
   */
  async handlePaymentSuccess(stripePaymentIntentId: string) {
    // STEP 1: Update payment status
    const payment = await prisma.payment.update({
      where: { stripePaymentIntentId },
      data: {
        status: 'SUCCEEDED',
      },
      include: {
        booking: true,
      },
    });

    if (!payment.booking) {
      logger.warn(
        {
          stripePaymentIntentId,
          paymentId: payment.id,
        },
        'Payment succeeded but no booking found'
      );
      return { status: 'no_booking' };
    }

    logger.info(
      {
        stripePaymentIntentId,
        paymentId: payment.id,
        bookingId: payment.booking.id,
      },
      'Payment succeeded - confirming booking'
    );

    return {
      status: 'success',
      bookingId: payment.booking.id,
      userId: payment.booking.userId,
    };
  }

  /**
   * ENTERPRISE: Handle payment failure from webhook
   * 
   * Updates payment status. Booking cancellation handled by WebhookService.
   */
  async handlePaymentFailure(stripePaymentIntentId: string) {
    const payment = await prisma.payment.update({
      where: { stripePaymentIntentId },
      data: {
        status: 'FAILED',
      },
      include: {
        booking: true,
      },
    });

    if (!payment.booking) {
      logger.warn(
        {
          stripePaymentIntentId,
          paymentId: payment.id,
        },
        'Payment failed but no booking found'
      );
      return { status: 'no_booking' };
    }

    logger.info(
      {
        stripePaymentIntentId,
        paymentId: payment.id,
        bookingId: payment.booking.id,
      },
      'Payment failed'
    );

    return {
      status: 'failed',
      bookingId: payment.booking.id,
      userId: payment.booking.userId,
    };
  }

  /**
   * ENTERPRISE: Handle payment cancellation from webhook
   */
  async handlePaymentCanceled(stripePaymentIntentId: string) {
    const payment = await prisma.payment.update({
      where: { stripePaymentIntentId },
      data: {
        status: 'CANCELLED',
      },
      include: {
        booking: true,
      },
    });

    if (!payment.booking) {
      logger.warn(
        {
          stripePaymentIntentId,
          paymentId: payment.id,
        },
        'Payment canceled but no booking found'
      );
      return { status: 'no_booking' };
    }

    logger.info(
      {
        stripePaymentIntentId,
        paymentId: payment.id,
        bookingId: payment.booking.id,
      },
      'Payment canceled'
    );

    return {
      status: 'canceled',
      bookingId: payment.booking.id,
      userId: payment.booking.userId,
    };
  }

  /**
   * Get payment by Stripe PaymentIntent ID
   */
  async getPaymentByStripeId(stripePaymentIntentId: string) {
    return await prisma.payment.findUnique({
      where: { stripePaymentIntentId },
      include: {
        booking: true,
      },
    });
  }

  /**
   * ENTERPRISE: Refund payment automatically
   * 
   * Called when booking confirmation fails after payment success.
   * Enforces financial invariant: No SUCCEEDED payment without CONFIRMED booking.
   * 
   * IDEMPOTENT: Guards against double refunds with atomic status transition.
   */
  async refundPayment(stripePaymentIntentId: string, reason: string) {
    // STEP 1: Atomic status transition to REFUNDING (prevents concurrent refunds)
    const updateResult = await prisma.payment.updateMany({
      where: {
        stripePaymentIntentId,
        status: 'SUCCEEDED', // CRITICAL: Only transition from SUCCEEDED
      },
      data: {
        status: 'REFUNDING',
      },
    });

    if (updateResult.count === 0) {
      // Either already refunded/refunding, or not in SUCCEEDED state
      const existingPayment = await prisma.payment.findUnique({
        where: { stripePaymentIntentId },
      });

      if (!existingPayment) {
        throw new Error('Payment not found');
      }

      if (existingPayment.status === 'REFUNDED' || existingPayment.status === 'REFUNDING') {
        logger.info(
          {
            stripePaymentIntentId,
            paymentId: existingPayment.id,
            status: existingPayment.status,
          },
          'Payment already refunded or refunding (idempotent)'
        );
        return { alreadyRefunded: true };
      }

      throw new Error(`Cannot refund payment with status: ${existingPayment.status}`);
    }

    logger.info(
      {
        stripePaymentIntentId,
        reason,
      },
      'Initiating automatic refund'
    );

    try {
      // STEP 2: Create refund in Stripe with idempotency key
      // CRITICAL: Idempotency key prevents duplicate refunds on network retry
      const refund = await stripe.refunds.create(
        {
          payment_intent: stripePaymentIntentId,
          reason: 'requested_by_customer',
        },
        {
          idempotencyKey: `refund_${stripePaymentIntentId}`,
        }
      );

      // STEP 3: Mark as REFUNDED
      await prisma.payment.update({
        where: { stripePaymentIntentId },
        data: {
          status: 'REFUNDED',
        },
      });

      logger.info(
        {
          stripePaymentIntentId,
          refundId: refund.id,
          amount: refund.amount,
        },
        'Refund completed'
      );

      return refund;
    } catch (error) {
      // STEP 4: If Stripe refund fails, revert to SUCCEEDED
      await prisma.payment.update({
        where: { stripePaymentIntentId },
        data: {
          status: 'SUCCEEDED',
        },
      });

      logger.error(
        {
          stripePaymentIntentId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        'Refund failed - reverted status to SUCCEEDED'
      );

      throw error;
    }
  }
}

export default new PaymentService();

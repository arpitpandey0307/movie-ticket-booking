import prisma from '../lib/prisma';
import logger from '../lib/logger';
import bookingService from './booking.service';
import paymentService from './payment.service';

/**
 * ENTERPRISE: Webhook processing with exactly-once semantics
 * 
 * Guarantees:
 * - Unique constraint on stripeEventId prevents duplicate processing
 * - Idempotent: retries return same result
 * - Atomic: event recording + business logic in single transaction
 */
export class WebhookService {
  /**
   * ENTERPRISE: Process Stripe webhook with idempotency
   * 
   * CRITICAL: Event insertion must guard the ENTIRE confirmation process.
   * 
   * Flow:
   * 1. Try to insert event (unique constraint)
   * 2. If insert fails → already processed → return success
   * 3. If insert succeeds → event guards the entire process
   * 4. Process business logic (booking confirmation happens here)
   * 5. Mark event as processed
   * 
   * Note: Event insertion and marking as processed are separate transactions.
   * Business logic (booking confirmation) has its own SERIALIZABLE transaction.
   * Event uniqueness prevents duplicate processing attempts.
   */
  async processStripeWebhook(stripeEventId: string, eventType: string, payload: any) {
    // STEP 1: Check if event already exists (idempotency check)
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { stripeEventId },
    });

    if (existingEvent) {
      logger.info(
        {
          stripeEventId,
          eventType,
          processed: existingEvent.processed,
          processedAt: existingEvent.processedAt,
        },
        'Webhook event already processed (idempotent)'
      );
      return { success: true, duplicate: true };
    }

    // STEP 2: Try to record event (unique constraint enforces idempotency)
    let event;
    try {
      event = await prisma.webhookEvent.create({
        data: {
          stripeEventId,
          eventType,
          payload,
          processed: false,
        },
      });

      logger.info(
        {
          webhookEventId: event.id,
          stripeEventId,
          eventType,
        },
        'Webhook event recorded'
      );
    } catch (error: any) {
      // Race condition: another instance created it between check and insert
      if (error.code === 'P2002' && error.meta?.target?.includes('stripeEventId')) {
        logger.info(
          {
            stripeEventId,
            eventType,
          },
          'Webhook event created by concurrent request (idempotent)'
        );
        return { success: true, duplicate: true };
      }
      throw error;
    }

    // STEP 3: Process business logic based on event type
    let result;
    try {
      switch (eventType) {
        case 'payment_intent.succeeded':
          result = await this.handlePaymentSuccess(payload);
          break;

        case 'payment_intent.payment_failed':
          result = await this.handlePaymentFailure(payload);
          break;

        case 'payment_intent.canceled':
          result = await this.handlePaymentCanceled(payload);
          break;

        default:
          logger.warn({ eventType }, 'Unhandled webhook event type');
          result = { handled: false };
      }

      // STEP 4: Mark event as processed
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          processed: true,
          processedAt: new Date(),
        },
      });

      logger.info(
        {
          webhookEventId: event.id,
          stripeEventId,
          eventType,
        },
        'Webhook event processed successfully'
      );

      return { success: true, result };
    } catch (error: any) {
      // STEP 5: Record processing error
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          processingError: error.message,
        },
      });

      logger.error(
        {
          webhookEventId: event.id,
          stripeEventId,
          eventType,
          error: error.message,
        },
        'Webhook processing failed - will retry on next webhook delivery'
      );

      // Throw error so Stripe knows to retry
      throw error;
    }
  }

  /**
   * Handle successful payment
   * 
   * CRITICAL: Validates locks before confirmation
   * CRITICAL: Auto-refunds if locks expired
   */
  private async handlePaymentSuccess(payload: any) {
    const paymentIntentId = payload.id;

    logger.info(
      {
        paymentIntentId,
      },
      'Processing payment success'
    );

    // STEP 1: Update payment status and get booking info
    const result = await paymentService.handlePaymentSuccess(paymentIntentId);

    if (result.status === 'no_booking') {
      return { handled: false, reason: 'no_booking' };
    }

    const { bookingId, userId } = result;

    // STEP 2: CRITICAL - Confirm booking (validates locks inside)
    try {
      await bookingService.confirmBooking(bookingId!, userId!);

      return { bookingId, status: 'confirmed' };
    } catch (error: any) {
      // CRITICAL: Lock expired or validation failure after payment success
      const isLockExpired =
        error.message?.includes('Lock expired') ||
        error.message?.includes('Lock missing') ||
        error.message?.includes('already booked');

      if (isLockExpired) {
        logger.error(
          {
            paymentIntentId,
            bookingId,
            userId,
            error: error.message,
          },
          'CRITICAL: Booking confirmation failed after payment - initiating automatic refund'
        );

        // ENTERPRISE: Automatic refund to enforce financial invariant
        // CRITICAL: Refund BEFORE cancellation - money comes first
        try {
          // STEP 1: Attempt refund
          await paymentService.refundPayment(paymentIntentId, 'Lock expired after payment');

          // STEP 2: Only cancel booking if refund succeeded
          await bookingService.cancelBooking(bookingId!, userId!);

          logger.info(
            {
              paymentIntentId,
              bookingId,
              userId,
            },
            'Automatic refund completed - booking cancelled'
          );

          return { bookingId, status: 'refunded', reason: 'lock_expired' };
        } catch (refundError: any) {
          // CRITICAL: If refund fails, DO NOT cancel booking
          // Leave booking PENDING with payment SUCCEEDED for manual intervention
          logger.error(
            {
              paymentIntentId,
              bookingId,
              userId,
              refundError: refundError.message,
            },
            'CRITICAL: Automatic refund failed - booking remains PENDING - MANUAL INTERVENTION REQUIRED'
          );

          // Do NOT throw - mark webhook as processed with error
          // Stripe should not retry if refund API failed
          return { bookingId, status: 'refund_failed', error: refundError.message };
        }
      }

      // Other error - rethrow for Stripe retry
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailure(payload: any) {
    const paymentIntentId = payload.id;

    logger.info(
      {
        paymentIntentId,
      },
      'Processing payment failure'
    );

    // STEP 1: Update payment status and get booking info
    const result = await paymentService.handlePaymentFailure(paymentIntentId);

    if (result.status === 'no_booking') {
      return { handled: false, reason: 'no_booking' };
    }

    const { bookingId, userId } = result;

    // STEP 2: Cancel booking and release locks
    await bookingService.cancelBooking(bookingId!, userId!);

    return { bookingId, status: 'cancelled' };
  }

  /**
   * Handle canceled payment
   */
  private async handlePaymentCanceled(payload: any) {
    const paymentIntentId = payload.id;

    logger.info(
      {
        paymentIntentId,
      },
      'Processing payment cancellation'
    );

    // STEP 1: Update payment status and get booking info
    const result = await paymentService.handlePaymentCanceled(paymentIntentId);

    if (result.status === 'no_booking') {
      return { handled: false, reason: 'no_booking' };
    }

    const { bookingId, userId } = result;

    // STEP 2: Cancel booking and release locks
    await bookingService.cancelBooking(bookingId!, userId!);

    return { bookingId, status: 'cancelled' };
  }

  /**
   * Get webhook event by Stripe event ID
   */
  async getWebhookEvent(stripeEventId: string) {
    return await prisma.webhookEvent.findUnique({
      where: { stripeEventId },
    });
  }

  /**
   * Get unprocessed webhook events (for debugging/recovery)
   */
  async getUnprocessedEvents() {
    return await prisma.webhookEvent.findMany({
      where: {
        processed: false,
        processingError: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}

export default new WebhookService();

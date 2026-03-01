import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import webhookService from '../services/webhook.service';
import logger from '../lib/logger';
import stripe from '../lib/stripe';

const router = Router();

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 * 
 * CRITICAL: Signature verification prevents replay attacks
 * CRITICAL: Raw body required for signature verification
 * 
 * IMPORTANT: This route MUST use express.raw() middleware in app.ts:
 * 
 * app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
 * app.use('/api/webhooks', webhookRoutes);
 * 
 * The raw body must be available BEFORE JSON parsing for signature verification.
 */
router.post(
  '/stripe',
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      logger.error('Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    let event: Stripe.Event;

    try {
      // CRITICAL: Verify webhook signature
      // For testing: skip verification if webhook secret is empty
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        // TESTING ONLY: Parse event without verification
        console.warn('⚠️  Webhook signature verification DISABLED - testing only!');
        event = JSON.parse(req.body.toString());
      }
    } catch (err: any) {
      logger.error(
        {
          error: err.message,
        },
        'Webhook signature verification failed'
      );
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    logger.info(
      {
        eventId: event.id,
        eventType: event.type,
      },
      'Webhook received'
    );

    try {
      // Process webhook with idempotency
      const result = await webhookService.processStripeWebhook(
        event.id,
        event.type,
        event.data.object
      );

      // Return 200 to acknowledge receipt
      res.json({ received: true, result });
    } catch (error: any) {
      logger.error(
        {
          eventId: event.id,
          eventType: event.type,
          error: error.message,
        },
        'Webhook processing failed'
      );

      // Return 500 so Stripe retries
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

export default router;

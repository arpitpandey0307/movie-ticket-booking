import Stripe from 'stripe';
import logger from './logger';

// Stripe is optional - payment features won't work without it
let stripe: Stripe | null = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  });
  logger.info('Stripe initialized');
} else {
  logger.warn('STRIPE_SECRET_KEY not set - payment features disabled');
}

export { stripe };
export default stripe;

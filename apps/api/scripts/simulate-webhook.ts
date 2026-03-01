#!/usr/bin/env tsx
/**
 * WEBHOOK SIMULATOR: Direct webhook service testing
 * 
 * Bypasses HTTP/signature verification to test core business logic.
 * Use this when Stripe CLI is not available.
 * 
 * Usage:
 *   npm run simulate-webhook pi_3T65Lx4DHh4sfOH91migLNJy
 */

// CRITICAL: Load environment variables BEFORE any imports
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../.env') });

import { PrismaClient } from '@prisma/client';
import webhookService from '../src/services/webhook.service';

const prisma = new PrismaClient();

async function main() {
  const paymentIntentId = process.argv[2];
  
  if (!paymentIntentId) {
    console.error('❌ Usage: npm run simulate-webhook <payment_intent_id>');
    console.error('Example: npm run simulate-webhook pi_3T65Lx4DHh4sfOH91migLNJy');
    process.exit(1);
  }

  console.log('🔄 WEBHOOK SIMULATOR');
  console.log('='.repeat(80));
  console.log(`Payment Intent: ${paymentIntentId}`);
  console.log('='.repeat(80) + '\n');

  try {
    // Find the payment record
    console.log('📋 Step 1: Finding payment record...');
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      include: {
        booking: {
          include: {
            bookingSeats: {
              include: {
                showtimeSeat: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new Error(`Payment not found for PaymentIntent: ${paymentIntentId}`);
    }

    console.log(`✅ Found payment: ${payment.id}`);
    console.log(`   Booking: ${payment.booking?.bookingCode || 'N/A'}`);
    console.log(`   Current status: ${payment.status}`);
    console.log(`   Booking status: ${payment.booking?.status || 'N/A'}\n`);

    // Simulate the webhook event
    console.log('📋 Step 2: Simulating payment_intent.succeeded event...');
    
    const eventId = `evt_test_${Date.now()}`;
    const eventType = 'payment_intent.succeeded';
    const eventData = {
      id: paymentIntentId,
      object: 'payment_intent',
      amount: payment.amount,
      currency: 'usd',
      status: 'succeeded',
      metadata: {
        bookingId: payment.booking?.id || '',
        userId: payment.booking?.userId || '',
      },
    };

    console.log(`   Event ID: ${eventId}`);
    console.log(`   Event Type: ${eventType}\n`);

    // Process the webhook
    console.log('📋 Step 3: Processing webhook...');
    const result = await webhookService.processStripeWebhook(
      eventId,
      eventType,
      eventData
    );

    console.log(`✅ Webhook processed successfully!`);
    console.log(`   Result: ${JSON.stringify(result, null, 2)}\n`);

    // Verify the results
    console.log('📋 Step 4: Verifying database state...');
    const updatedPayment = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: {
        booking: {
          include: {
            bookingSeats: {
              include: {
                showtimeSeat: true,
              },
            },
          },
        },
      },
    });

    if (!updatedPayment) {
      throw new Error('Payment disappeared!');
    }

    console.log('\n🔍 FINAL STATE:');
    console.log('='.repeat(80));
    console.log(`Payment Status: ${updatedPayment.status}`);
    console.log(`Booking Status: ${updatedPayment.booking?.status || 'N/A'}`);
    console.log(`Booking Code: ${updatedPayment.booking?.bookingCode || 'N/A'}`);
    
    if (updatedPayment.booking) {
      const bookedSeats = updatedPayment.booking.bookingSeats.filter(
        bs => bs.showtimeSeat.status === 'BOOKED'
      );
      console.log(`Seats Booked: ${bookedSeats.length}/${updatedPayment.booking.bookingSeats.length}`);
    }

    // Check for remaining locks
    if (updatedPayment.booking) {
      const seatIds = updatedPayment.booking.bookingSeats.map(bs => bs.showtimeSeatId);
      const remainingLocks = await prisma.seatLock.findMany({
        where: {
          showtimeSeatId: { in: seatIds },
          expiresAt: { gt: new Date() },
        },
      });
      console.log(`Active Locks: ${remainingLocks.length}`);
    }

    console.log('='.repeat(80));

    // Validate expectations
    const expectations = [
      {
        name: 'Payment Status = SUCCEEDED',
        passed: updatedPayment.status === 'SUCCEEDED',
        actual: updatedPayment.status,
        expected: 'SUCCEEDED',
      },
      {
        name: 'Booking Status = CONFIRMED',
        passed: updatedPayment.booking?.status === 'CONFIRMED',
        actual: updatedPayment.booking?.status,
        expected: 'CONFIRMED',
      },
      {
        name: 'All Seats = BOOKED',
        passed: updatedPayment.booking?.bookingSeats.every(
          bs => bs.showtimeSeat.status === 'BOOKED'
        ) || false,
        actual: updatedPayment.booking?.bookingSeats.every(
          bs => bs.showtimeSeat.status === 'BOOKED'
        ),
        expected: true,
      },
    ];

    console.log('\n✅ VALIDATION:');
    console.log('='.repeat(80));
    expectations.forEach(exp => {
      const icon = exp.passed ? '✅' : '❌';
      console.log(`${icon} ${exp.name}: ${exp.actual} ${exp.passed ? '==' : '!='} ${exp.expected}`);
    });
    console.log('='.repeat(80));

    const allPassed = expectations.every(e => e.passed);
    
    if (allPassed) {
      console.log('\n🎉 SUCCESS: Webhook processing validated!');
      console.log('Financial consistency achieved.\n');
      process.exit(0);
    } else {
      console.log('\n❌ FAILURE: Some expectations not met.');
      console.log('System did not converge to financial consistency.\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

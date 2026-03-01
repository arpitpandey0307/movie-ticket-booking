#!/usr/bin/env ts-node
/**
 * FINANCIAL VALIDATION: Controlled Payment Flow Testing
 * 
 * Tests the complete payment flow with real Stripe test API:
 * 1. Create user
 * 2. Lock seats
 * 3. Create booking
 * 4. Create payment intent
 * 5. Simulate payment success
 * 6. Verify webhook processing
 * 7. Validate database state
 * 
 * Exit Codes:
 *   0 → PASS
 *   1 → FAIL
 */

import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from apps/api/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api';

interface TestResult {
  phase: string;
  passed: boolean;
  details: string;
  data?: any;
}

const results: TestResult[] = [];

async function main() {
  console.log('🧪 FINANCIAL VALIDATION: Payment Flow Test');
  console.log('='.repeat(80));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('='.repeat(80) + '\n');

  try {
    // Phase 1: Setup - Create test user
    console.log('📋 Phase 1: Setup');
    console.log('-'.repeat(40));
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'Test123!@#';
    
    console.log(`Creating test user: ${testEmail}`);
    const signupRes = await axios.post(`${API_BASE}/auth/signup`, {
      email: testEmail,
      password: testPassword,
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
    });
    
    const { user, token } = signupRes.data.data;
    console.log(`✅ User created: ${user.id}`);
    results.push({
      phase: 'Setup',
      passed: true,
      details: 'Test user created',
      data: { userId: user.id, email: testEmail },
    });

    // Phase 2: Get available showtime and seats
    console.log('\n📋 Phase 2: Find Available Showtime');
    console.log('-'.repeat(40));
    
    const showtimesRes = await axios.get(`${API_BASE}/showtimes/public`);
    const showtimeGroups = showtimesRes.data;
    
    if (!showtimeGroups || showtimeGroups.length === 0) {
      throw new Error('No showtimes available - run seed script first');
    }
    
    const firstGroup = showtimeGroups[0];
    const showtime = firstGroup.showtimes[0];
    console.log(`✅ Found showtime: ${showtime.id}`);
    
    // Get showtime details with seats
    const showtimeDetailRes = await axios.get(`${API_BASE}/showtimes/${showtime.id}`);
    const showtimeDetail = showtimeDetailRes.data;
    
    // Filter for truly available seats (not locked)
    const now = new Date();
    const availableSeats = showtimeDetail.showtimeSeats
      .filter((s: any) => {
        // Seat must be AVAILABLE
        if (s.status !== 'AVAILABLE') return false;
        
        // Seat must not have active locks
        if (s.seatLocks && s.seatLocks.length > 0) {
          const hasActiveLock = s.seatLocks.some((lock: any) => {
            return new Date(lock.expiresAt) > now;
          });
          if (hasActiveLock) return false;
        }
        
        return true;
      })
      .slice(0, 2);
    
    if (availableSeats.length < 2) {
      throw new Error(`Not enough available seats (found ${availableSeats.length}, need 2). Wait for locks to expire or use different showtime.`);
    }
    
    const seatIds = availableSeats.map((s: any) => s.id);
    console.log(`✅ Found ${availableSeats.length} available seats: ${seatIds.join(', ')}`);
    results.push({
      phase: 'Find Showtime',
      passed: true,
      details: `Found showtime with ${availableSeats.length} available seats`,
      data: { showtimeId: showtime.id, seatIds },
    });

    // Phase 3: Lock seats
    console.log('\n📋 Phase 3: Lock Seats');
    console.log('-'.repeat(40));
    
    const lockRes = await axios.post(
      `${API_BASE}/seat-locks`,
      {
        showtimeSeatIds: seatIds,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    const locks = lockRes.data.locks;
    console.log(`✅ Locked ${locks.length} seats`);
    locks.forEach((lock: any) => {
      console.log(`   - Seat ${lock.showtimeSeatId}: expires ${lock.expiresAt}`);
    });
    results.push({
      phase: 'Lock Seats',
      passed: true,
      details: `Locked ${locks.length} seats`,
      data: { locks },
    });

    // Phase 4: Create booking
    console.log('\n📋 Phase 4: Create Booking');
    console.log('-'.repeat(40));
    
    const bookingRes = await axios.post(
      `${API_BASE}/bookings`,
      {
        showtimeId: showtime.id,
        showtimeSeatIds: seatIds,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    const booking = bookingRes.data.booking;
    console.log(`✅ Booking created: ${booking.bookingCode}`);
    console.log(`   - Status: ${booking.status}`);
    console.log(`   - Total: $${booking.totalAmount / 100}`);
    results.push({
      phase: 'Create Booking',
      passed: true,
      details: `Booking ${booking.bookingCode} created with status ${booking.status}`,
      data: { bookingId: booking.id, bookingCode: booking.bookingCode },
    });

    // Small delay to let transaction complete
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Phase 5: Create payment intent
    console.log('\n📋 Phase 5: Create Payment Intent');
    console.log('-'.repeat(40));
    
    const paymentRes = await axios.post(
      `${API_BASE}/payments/create-intent`,
      { bookingId: booking.id },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    const { clientSecret, paymentIntentId } = paymentRes.data;
    console.log(`✅ Payment intent created: ${paymentIntentId}`);
    console.log(`   - Client secret: ${clientSecret.substring(0, 20)}...`);
    results.push({
      phase: 'Create Payment Intent',
      passed: true,
      details: `Payment intent ${paymentIntentId} created`,
      data: { paymentIntentId, clientSecret },
    });

    // Phase 6: Simulate payment success (using Stripe test card)
    console.log('\n📋 Phase 6: Simulate Payment Success');
    console.log('-'.repeat(40));
    
    console.log('Confirming payment intent with test card 4242...');
    const confirmedPayment = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: 'pm_card_visa', // Stripe test payment method
      return_url: 'http://localhost:3000/booking/success',
    });
    
    console.log(`✅ Payment confirmed: ${confirmedPayment.status}`);
    console.log(`   - Amount: $${confirmedPayment.amount / 100}`);
    console.log(`   - Status: ${confirmedPayment.status}`);
    results.push({
      phase: 'Simulate Payment',
      passed: confirmedPayment.status === 'succeeded',
      details: `Payment ${confirmedPayment.status}`,
      data: { paymentStatus: confirmedPayment.status },
    });

    // Phase 7: Wait for webhook processing
    console.log('\n📋 Phase 7: Wait for Webhook Processing');
    console.log('-'.repeat(40));
    
    console.log('Waiting 5 seconds for webhook to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Phase 8: Verify database state
    console.log('\n📋 Phase 8: Verify Database State');
    console.log('-'.repeat(40));
    
    const dbBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: {
        payment: true,
        bookingSeats: {
          include: {
            showtimeSeat: true,
          },
        },
      },
    });
    
    if (!dbBooking) {
      throw new Error('Booking not found in database');
    }
    
    console.log('\n🔍 Database State:');
    console.log(`   Booking Status: ${dbBooking.status}`);
    console.log(`   Payment Status: ${dbBooking.payment?.status || 'N/A'}`);
    console.log(`   Seats Booked: ${dbBooking.bookingSeats.length}`);
    
    // Verify expectations
    const expectations = [
      {
        name: 'Booking Status = CONFIRMED',
        actual: dbBooking.status,
        expected: 'CONFIRMED',
        passed: dbBooking.status === 'CONFIRMED',
      },
      {
        name: 'Payment Status = SUCCEEDED',
        actual: dbBooking.payment?.status,
        expected: 'SUCCEEDED',
        passed: dbBooking.payment?.status === 'SUCCEEDED',
      },
      {
        name: 'All Seats = BOOKED',
        actual: dbBooking.bookingSeats.every(s => s.showtimeSeat.status === 'BOOKED'),
        expected: true,
        passed: dbBooking.bookingSeats.every(s => s.showtimeSeat.status === 'BOOKED'),
      },
    ];
    
    console.log('\n✅ Expectations:');
    expectations.forEach(exp => {
      const icon = exp.passed ? '✅' : '❌';
      console.log(`   ${icon} ${exp.name}: ${exp.actual} ${exp.passed ? '==' : '!='} ${exp.expected}`);
    });
    
    const allPassed = expectations.every(e => e.passed);
    results.push({
      phase: 'Verify Database',
      passed: allPassed,
      details: allPassed ? 'All expectations met' : 'Some expectations failed',
      data: { expectations, dbBooking: {
        status: dbBooking.status,
        paymentStatus: dbBooking.payment?.status,
        seatCount: dbBooking.bookingSeats.length,
      }},
    });

    // Phase 9: Check for seat locks (should be deleted)
    console.log('\n📋 Phase 9: Verify Locks Deleted');
    console.log('-'.repeat(40));
    
    const remainingLocks = await prisma.seatLock.findMany({
      where: {
        showtimeSeatId: { in: seatIds },
      },
    });
    
    const locksDeleted = remainingLocks.length === 0;
    console.log(`   Remaining locks: ${remainingLocks.length}`);
    console.log(`   ${locksDeleted ? '✅' : '❌'} Locks ${locksDeleted ? 'deleted' : 'still exist'}`);
    results.push({
      phase: 'Verify Locks Deleted',
      passed: locksDeleted,
      details: locksDeleted ? 'All locks deleted' : `${remainingLocks.length} locks remain`,
      data: { remainingLocks: remainingLocks.length },
    });

    // Final Summary
    console.log('\n' + '='.repeat(80));
    console.log('FINANCIAL VALIDATION SUMMARY');
    console.log('='.repeat(80));
    
    const allPhasesPassed = results.every(r => r.passed);
    
    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.phase}: ${result.details}`);
    });
    
    console.log('\n' + '='.repeat(80));
    
    if (allPhasesPassed) {
      console.log('✅ PHASE 1 COMPLETE: Happy path validated');
      console.log('='.repeat(80));
      process.exit(0);
    } else {
      console.log('❌ PHASE 1 FAILED: Financial validation failed');
      console.log('='.repeat(80));
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

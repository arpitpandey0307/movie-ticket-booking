#!/usr/bin/env ts-node
/**
 * ADVERSARIAL DATABASE CORRUPTION SCRIPT
 * 
 * Intentionally injects invariant violations to test verify-invariants.ts
 * 
 * Violations Injected:
 * 1. SUCCEEDED payment without CONFIRMED booking (FIN-001)
 * 2. BOOKED seat without CONFIRMED booking (FIN-004)
 * 3. Multiple active locks on same seat (SEAT-002)
 * 4. Booking referencing seats from different showtimes (BOOK-001)
 * 5. Booking amount mismatch (FIN-006)
 * 
 * Usage:
 *   npm run corrupt-db
 *   npm run verify-invariants -- --verbose
 *   npm run restore-db (to clean up)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧨 ADVERSARIAL DATABASE CORRUPTION');
  console.log('=' .repeat(80));
  console.log('Injecting controlled invariant violations...\n');

  try {
    // Get existing data to work with
    const user = await prisma.user.findFirst();
    const showtime1 = await prisma.showtime.findFirst();
    const showtime2 = await prisma.showtime.findFirst({
      where: { id: { not: showtime1?.id } },
    });
    const seat1 = await prisma.showtimeSeat.findFirst({
      where: { showtimeId: showtime1?.id, status: 'AVAILABLE' },
    });
    const seat2 = await prisma.showtimeSeat.findFirst({
      where: { showtimeId: showtime2?.id, status: 'AVAILABLE' },
    });

    if (!user || !showtime1 || !showtime2 || !seat1 || !seat2) {
      console.log('❌ Insufficient test data. Seed database first.');
      process.exit(1);
    }

    // ========================================================================
    // VIOLATION 1: SUCCEEDED payment without CONFIRMED booking (FIN-001)
    // ========================================================================
    console.log('1️⃣  Injecting: SUCCEEDED payment without CONFIRMED booking');
    
    const orphanPayment = await prisma.payment.create({
      data: {
        stripePaymentIntentId: `pi_corrupt_${Date.now()}_orphan`,
        amount: 2500,
        currency: 'usd',
        status: 'SUCCEEDED',
      },
    });
    
    await prisma.booking.create({
      data: {
        bookingCode: `CORRUPT-ORPHAN-${Date.now()}`,
        userId: user.id,
        showtimeId: showtime1.id,
        totalAmount: 2500,
        status: 'PENDING', // Payment SUCCEEDED but booking still PENDING
        paymentId: orphanPayment.id,
      },
    });
    
    console.log(`   ✓ Created payment ${orphanPayment.id} (SUCCEEDED) with PENDING booking\n`);

    // ========================================================================
    // VIOLATION 2: BOOKED seat without CONFIRMED booking (FIN-004)
    // ========================================================================
    console.log('2️⃣  Injecting: BOOKED seat without CONFIRMED booking');
    
    await prisma.showtimeSeat.update({
      where: { id: seat1.id },
      data: { status: 'BOOKED' },
    });
    
    console.log(`   ✓ Marked seat ${seat1.id} as BOOKED without booking reference\n`);

    // ========================================================================
    // VIOLATION 3: Multiple active locks on same seat (SEAT-002)
    // ========================================================================
    console.log('3️⃣  Injecting: Multiple active locks on same seat');
    
    const targetSeat = await prisma.showtimeSeat.findFirst({
      where: { status: 'AVAILABLE' },
    });
    
    if (targetSeat) {
      const futureExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min future
      
      await prisma.seatLock.create({
        data: {
          showtimeSeatId: targetSeat.id,
          userId: user.id,
          expiresAt: futureExpiry,
        },
      });
      
      await prisma.seatLock.create({
        data: {
          showtimeSeatId: targetSeat.id,
          userId: user.id,
          expiresAt: futureExpiry,
        },
      });
      
      console.log(`   ✓ Created 2 active locks on seat ${targetSeat.id}\n`);
    }

    // ========================================================================
    // VIOLATION 4: Booking referencing seats from different showtimes (BOOK-001)
    // ========================================================================
    console.log('4️⃣  Injecting: Booking with cross-showtime seat references');
    
    const crossPayment = await prisma.payment.create({
      data: {
        stripePaymentIntentId: `pi_corrupt_${Date.now()}_cross`,
        amount: 5000,
        currency: 'usd',
        status: 'SUCCEEDED',
      },
    });
    
    const crossBooking = await prisma.booking.create({
      data: {
        bookingCode: `CORRUPT-CROSS-${Date.now()}`,
        userId: user.id,
        showtimeId: showtime1.id, // References showtime1
        totalAmount: 5000,
        status: 'CONFIRMED',
        paymentId: crossPayment.id,
      },
    });
    
    // Add seat from showtime1
    await prisma.bookingSeat.create({
      data: {
        bookingId: crossBooking.id,
        showtimeSeatId: seat1.id,
        price: 2500,
      },
    });
    
    // Add seat from showtime2 (VIOLATION!)
    await prisma.bookingSeat.create({
      data: {
        bookingId: crossBooking.id,
        showtimeSeatId: seat2.id,
        price: 2500,
      },
    });
    
    console.log(`   ✓ Created booking ${crossBooking.id} with seats from 2 showtimes\n`);

    // ========================================================================
    // VIOLATION 5: Booking amount mismatch (FIN-006)
    // ========================================================================
    console.log('5️⃣  Injecting: Booking amount mismatch');
    
    const mismatchPayment = await prisma.payment.create({
      data: {
        stripePaymentIntentId: `pi_corrupt_${Date.now()}_mismatch`,
        amount: 3000,
        currency: 'usd',
        status: 'SUCCEEDED',
      },
    });
    
    const availableSeat = await prisma.showtimeSeat.findFirst({
      where: { status: 'AVAILABLE', showtimeId: showtime1.id },
    });
    
    if (availableSeat) {
      const mismatchBooking = await prisma.booking.create({
        data: {
          bookingCode: `CORRUPT-MISMATCH-${Date.now()}`,
          userId: user.id,
          showtimeId: showtime1.id,
          totalAmount: 3000, // Says 3000
          status: 'CONFIRMED',
          paymentId: mismatchPayment.id,
        },
      });
      
      await prisma.bookingSeat.create({
        data: {
          bookingId: mismatchBooking.id,
          showtimeSeatId: availableSeat.id,
          price: 2500, // But seat only costs 2500 (500 discrepancy)
        },
      });
      
      console.log(`   ✓ Created booking ${mismatchBooking.id} with 500 amount discrepancy\n`);
    }

    console.log('=' .repeat(80));
    console.log('✅ CORRUPTION COMPLETE');
    console.log('=' .repeat(80));
    console.log('\nInjected 5 controlled violations:');
    console.log('  1. FIN-001: SUCCEEDED payment without CONFIRMED booking');
    console.log('  2. FIN-004: BOOKED seat without CONFIRMED booking');
    console.log('  3. SEAT-002: Multiple active locks on same seat');
    console.log('  4. BOOK-001: Cross-showtime seat references');
    console.log('  5. FIN-006: Booking amount mismatch');
    console.log('\nNext steps:');
    console.log('  npm run verify-invariants -- --verbose');
    console.log('\nExpected: Script should detect all 5 violations and exit code 1\n');

  } catch (error) {
    console.error('❌ Corruption failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

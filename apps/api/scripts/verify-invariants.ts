#!/usr/bin/env ts-node
/**
 * ENTERPRISE: Automated Invariant Verification System
 * 
 * Production-grade safety oracle for transactional booking engine.
 * Verifies financial and operational invariants after chaos scenarios.
 * 
 * Exit Codes:
 *   0 → PASS (all invariants hold)
 *   1 → FAIL (critical financial invariant violated)
 *   2 → WARN (non-critical structural issues)
 *   3 → SCRIPT ERROR
 * 
 * Usage:
 *   npm run verify-invariants
 *   npm run verify-invariants -- --verbose
 *   npm run verify-invariants -- --fast (skip warnings)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type InvariantTier = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type InvariantCategory = 'FINANCIAL' | 'SEAT_LOCK' | 'WEBHOOK' | 'CONSISTENCY';

interface InvariantResult {
  id: string;
  name: string;
  description: string;
  category: InvariantCategory;
  tier: InvariantTier;
  passed: boolean;
  violationCount: number;
  violations?: any[];
  query: string;
  executionTimeMs: number;
}

const VERBOSE = process.argv.includes('--verbose');
const FAST_MODE = process.argv.includes('--fast');

async function main() {
  const startTime = Date.now();
  
  console.log('🔍 ENTERPRISE INVARIANT VERIFICATION SYSTEM');
  console.log('=' .repeat(80));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log('=' .repeat(80) + '\n');

  const results: InvariantResult[] = [];

  // ============================================================================
  // TIER 1 - FINANCIAL SAFETY INVARIANTS (CRITICAL)
  // ============================================================================

  // FIN-001: No SUCCEEDED payment without CONFIRMED booking
  results.push(
    await checkInvariant({
      id: 'FIN-001',
      name: 'Payment Success Without Booking Confirmation',
      description: 'No SUCCEEDED payment without CONFIRMED booking',
      category: 'FINANCIAL',
      tier: 'CRITICAL',
      query: `
        SELECT 
          p.id as payment_id,
          p."stripePaymentIntentId",
          p.status as payment_status,
          b.id as booking_id,
          b.status as booking_status,
          b."bookingCode",
          p."createdAt"
        FROM "Payment" p
        LEFT JOIN "Booking" b ON b."paymentId" = p.id
        WHERE p.status = 'SUCCEEDED'
        AND (b.id IS NULL OR b.status != 'CONFIRMED')
        AND p."createdAt" < NOW() - INTERVAL '5 minutes'
      `,
    })
  );

  // FIN-002: No REFUNDED payment without CANCELLED booking
  results.push(
    await checkInvariant({
      id: 'FIN-002',
      name: 'Payment Refund Without Booking Cancellation',
      description: 'No REFUNDED payment without CANCELLED booking',
      category: 'FINANCIAL',
      tier: 'CRITICAL',
      query: `
        SELECT 
          p.id as payment_id,
          p.status as payment_status,
          b.id as booking_id,
          b.status as booking_status,
          b."bookingCode"
        FROM "Payment" p
        JOIN "Booking" b ON b."paymentId" = p.id
        WHERE p.status = 'REFUNDED'
        AND b.status != 'CANCELLED'
      `,
    })
  );

  // FIN-003: No CONFIRMED booking with any seat not BOOKED (catches orphaned BookingSeat)
  results.push(
    await checkInvariant({
      id: 'FIN-003',
      name: 'Confirmed Booking With Unbooked Seats',
      description: 'No CONFIRMED booking with any seat not BOOKED',
      category: 'FINANCIAL',
      tier: 'CRITICAL',
      query: `
        SELECT 
          b.id as booking_id,
          b."bookingCode",
          b.status as booking_status,
          bs."showtimeSeatId",
          ss.id as showtime_seat_id,
          ss.status as seat_status,
          s."seatNumber",
          s."rowNumber"
        FROM "Booking" b
        JOIN "BookingSeat" bs ON bs."bookingId" = b.id
        LEFT JOIN "ShowtimeSeat" ss ON ss.id = bs."showtimeSeatId"
        LEFT JOIN "Seat" s ON s.id = ss."seatId"
        WHERE b.status = 'CONFIRMED'
        AND (ss.id IS NULL OR ss.status != 'BOOKED')
      `,
    })
  );

  // FIN-004: No BOOKED seat without CONFIRMED booking owning it
  results.push(
    await checkInvariant({
      id: 'FIN-004',
      name: 'Booked Seat Without Confirmed Booking',
      description: 'No BOOKED seat without CONFIRMED booking owning it',
      category: 'FINANCIAL',
      tier: 'CRITICAL',
      query: `
        SELECT 
          ss.id as showtime_seat_id,
          ss.status as seat_status,
          s."seatNumber",
          s."rowNumber",
          bs.id as booking_seat_id,
          b.id as booking_id,
          b.status as booking_status
        FROM "ShowtimeSeat" ss
        JOIN "Seat" s ON s.id = ss."seatId"
        LEFT JOIN "BookingSeat" bs ON bs."showtimeSeatId" = ss.id
        LEFT JOIN "Booking" b ON b.id = bs."bookingId"
        WHERE ss.status = 'BOOKED'
        AND (b.id IS NULL OR b.status != 'CONFIRMED')
      `,
    })
  );

  // FIN-005: No REFUNDING payment stuck for >5 minutes (handles NULL updatedAt)
  results.push(
    await checkInvariant({
      id: 'FIN-005',
      name: 'Stuck Refunding Payments',
      description: 'No REFUNDING payment stuck for >5 minutes',
      category: 'FINANCIAL',
      tier: 'HIGH',
      query: `
        SELECT 
          id,
          "stripePaymentIntentId",
          status,
          "createdAt",
          "updatedAt",
          EXTRACT(EPOCH FROM (NOW() - COALESCE("updatedAt", "createdAt"))) as seconds_stuck
        FROM "Payment"
        WHERE status = 'REFUNDING'
        AND COALESCE("updatedAt", "createdAt") < NOW() - INTERVAL '5 minutes'
      `,
    })
  );

  // FIN-006: Booking amount mismatch with seat prices
  results.push(
    await checkInvariant({
      id: 'FIN-006',
      name: 'Booking Amount Mismatch',
      description: 'Booking totalAmount != sum of BookingSeat prices',
      category: 'FINANCIAL',
      tier: 'CRITICAL',
      query: `
        SELECT 
          b.id as booking_id,
          b."bookingCode",
          b."totalAmount" as booking_total,
          SUM(bs.price) as calculated_total,
          b."totalAmount" - SUM(bs.price) as discrepancy
        FROM "Booking" b
        JOIN "BookingSeat" bs ON bs."bookingId" = b.id
        WHERE b.status IN ('CONFIRMED', 'PENDING')
        GROUP BY b.id, b."bookingCode", b."totalAmount"
        HAVING b."totalAmount" != SUM(bs.price)
      `,
    })
  );

  // FIN-007: No CONFIRMED/PENDING booking with zero seats
  results.push(
    await checkInvariant({
      id: 'FIN-007',
      name: 'Booking With Zero Seats',
      description: 'No CONFIRMED/PENDING booking with zero seats',
      category: 'FINANCIAL',
      tier: 'CRITICAL',
      query: `
        SELECT 
          b.id as booking_id,
          b."bookingCode",
          b.status,
          b."totalAmount",
          COUNT(bs.id) as seat_count
        FROM "Booking" b
        LEFT JOIN "BookingSeat" bs ON bs."bookingId" = b.id
        WHERE b.status IN ('CONFIRMED', 'PENDING')
        GROUP BY b.id, b."bookingCode", b.status, b."totalAmount"
        HAVING COUNT(bs.id) = 0
      `,
    })
  );

  // ============================================================================
  // TIER 2 - SEAT & LOCK INTEGRITY INVARIANTS
  // ============================================================================

  // SEAT-001: No BOOKED seat with active lock
  results.push(
    await checkInvariant({
      id: 'SEAT-001',
      name: 'Booked Seat With Active Lock',
      description: 'No BOOKED seat with active lock',
      category: 'SEAT_LOCK',
      tier: 'CRITICAL',
      query: `
        SELECT 
          ss.id as showtime_seat_id,
          ss.status as seat_status,
          sl.id as lock_id,
          sl."userId",
          sl."expiresAt",
          s."seatNumber",
          s."rowNumber"
        FROM "ShowtimeSeat" ss
        JOIN "SeatLock" sl ON sl."showtimeSeatId" = ss.id
        JOIN "Seat" s ON s.id = ss."seatId"
        WHERE ss.status = 'BOOKED'
        AND sl."expiresAt" > NOW()
      `,
    })
  );

  // SEAT-002: No multiple active locks per seat (filter first, then group)
  results.push(
    await checkInvariant({
      id: 'SEAT-002',
      name: 'Multiple Active Locks Per Seat',
      description: 'No multiple active locks per seat',
      category: 'SEAT_LOCK',
      tier: 'CRITICAL',
      query: `
        SELECT 
          "showtimeSeatId",
          COUNT(*) as lock_count,
          array_agg("userId") as user_ids,
          array_agg("expiresAt") as expiration_times
        FROM "SeatLock"
        WHERE "expiresAt" > NOW()
        GROUP BY "showtimeSeatId"
        HAVING COUNT(*) > 1
      `,
    })
  );

  // LOCK-001: No locks on non-existent seats
  results.push(
    await checkInvariant({
      id: 'LOCK-001',
      name: 'Locks On Non-Existent Seats',
      description: 'No locks on non-existent seats',
      category: 'SEAT_LOCK',
      tier: 'HIGH',
      query: `
        SELECT 
          sl.id as lock_id,
          sl."showtimeSeatId",
          sl."userId",
          sl."expiresAt"
        FROM "SeatLock" sl
        LEFT JOIN "ShowtimeSeat" ss ON ss.id = sl."showtimeSeatId"
        WHERE ss.id IS NULL
      `,
    })
  );

  // LOCK-002: Expired lock bloat detection (non-critical but operational)
  if (!FAST_MODE) {
    results.push(
      await checkInvariant({
        id: 'LOCK-002',
        name: 'Expired Lock Bloat',
        description: 'Excessive expired locks (>100 older than 1 hour)',
        category: 'SEAT_LOCK',
        tier: 'MEDIUM',
        query: `
          SELECT 
            COUNT(*) as expired_count,
            MIN("expiresAt") as oldest_expired,
            MAX("expiresAt") as newest_expired
          FROM "SeatLock"
          WHERE "expiresAt" < NOW() - INTERVAL '1 hour'
          HAVING COUNT(*) > 100
        `,
      })
    );
  }

  // ============================================================================
  // TIER 3 - WEBHOOK & IDEMPOTENCY INVARIANTS
  // ============================================================================

  // WEB-001: No duplicate webhook event IDs
  results.push(
    await checkInvariant({
      id: 'WEB-001',
      name: 'Duplicate Webhook Event IDs',
      description: 'No duplicate webhook event IDs',
      category: 'WEBHOOK',
      tier: 'CRITICAL',
      query: `
        SELECT 
          "stripeEventId",
          COUNT(*) as event_count,
          array_agg(id) as webhook_ids
        FROM "WebhookEvent"
        GROUP BY "stripeEventId"
        HAVING COUNT(*) > 1
      `,
    })
  );

  // WEB-002: No stuck webhook events (>5 min, unprocessed, no error)
  results.push(
    await checkInvariant({
      id: 'WEB-002',
      name: 'Stuck Webhook Events',
      description: 'No stuck webhook events (>5 min, unprocessed, no error)',
      category: 'WEBHOOK',
      tier: 'HIGH',
      query: `
        SELECT 
          id,
          "stripeEventId",
          "eventType",
          processed,
          "processingError",
          "createdAt",
          "processedAt",
          EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 60 as minutes_old
        FROM "WebhookEvent"
        WHERE processed = false
        AND "processingError" IS NULL
        AND "createdAt" < NOW() - INTERVAL '5 minutes'
      `,
    })
  );

  // ============================================================================
  // TIER 4 - CONSISTENCY & STRUCTURAL INTEGRITY INVARIANTS
  // ============================================================================

  // BOOK-001: No booking references seats from different showtimes
  results.push(
    await checkInvariant({
      id: 'BOOK-001',
      name: 'Cross-Showtime Seat References',
      description: 'No booking references seats from different showtimes',
      category: 'CONSISTENCY',
      tier: 'CRITICAL',
      query: `
        SELECT 
          b.id as booking_id,
          b."bookingCode",
          b."showtimeId" as booking_showtime,
          COUNT(DISTINCT ss."showtimeId") as distinct_showtimes
        FROM "Booking" b
        JOIN "BookingSeat" bs ON bs."bookingId" = b.id
        JOIN "ShowtimeSeat" ss ON ss.id = bs."showtimeSeatId"
        GROUP BY b.id, b."bookingCode", b."showtimeId"
        HAVING COUNT(DISTINCT ss."showtimeId") > 1
      `,
    })
  );

  // BOOK-002: No zombie PENDING bookings (>20 minutes old)
  if (!FAST_MODE) {
    results.push(
      await checkInvariant({
        id: 'BOOK-002',
        name: 'Zombie Pending Bookings',
        description: 'No zombie PENDING bookings (>20 min old)',
        category: 'CONSISTENCY',
        tier: 'MEDIUM',
        query: `
          SELECT 
            id,
            "bookingCode",
            "userId",
            status,
            "paymentId",
            "createdAt",
            EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 60 as minutes_old
          FROM "Booking"
          WHERE status = 'PENDING'
          AND "paymentId" IS NULL
          AND "createdAt" < NOW() - INTERVAL '20 minutes'
        `,
      })
    );
  }

  // BOOK-003: No PENDING bookings with SUCCEEDED payment (>5 min old)
  results.push(
    await checkInvariant({
      id: 'BOOK-003',
      name: 'Pending Booking With Succeeded Payment',
      description: 'No PENDING booking with SUCCEEDED payment (>5 min old)',
      category: 'CONSISTENCY',
      tier: 'HIGH',
      query: `
        SELECT 
          b.id as booking_id,
          b."bookingCode",
          b.status as booking_status,
          p.id as payment_id,
          p.status as payment_status,
          p."stripePaymentIntentId",
          b."createdAt",
          EXTRACT(EPOCH FROM (NOW() - b."createdAt")) / 60 as minutes_old
        FROM "Booking" b
        JOIN "Payment" p ON p.id = b."paymentId"
        WHERE b.status = 'PENDING'
        AND p.status = 'SUCCEEDED'
        AND b."createdAt" < NOW() - INTERVAL '5 minutes'
      `,
    })
  );

  // ============================================================================
  // TIER 5 - REFERENTIAL INTEGRITY INVARIANTS
  // ============================================================================

  // REF-001: No BookingSeat referencing non-existent ShowtimeSeat
  results.push(
    await checkInvariant({
      id: 'REF-001',
      name: 'Orphaned BookingSeat References',
      description: 'No BookingSeat referencing non-existent ShowtimeSeat',
      category: 'CONSISTENCY',
      tier: 'CRITICAL',
      query: `
        SELECT 
          bs.id as booking_seat_id,
          bs."bookingId",
          bs."showtimeSeatId",
          b."bookingCode"
        FROM "BookingSeat" bs
        JOIN "Booking" b ON b.id = bs."bookingId"
        LEFT JOIN "ShowtimeSeat" ss ON ss.id = bs."showtimeSeatId"
        WHERE ss.id IS NULL
      `,
    })
  );

  // REF-002: No ShowtimeSeat referencing non-existent Seat
  results.push(
    await checkInvariant({
      id: 'REF-002',
      name: 'Orphaned ShowtimeSeat References',
      description: 'No ShowtimeSeat referencing non-existent Seat',
      category: 'CONSISTENCY',
      tier: 'CRITICAL',
      query: `
        SELECT 
          ss.id as showtime_seat_id,
          ss."showtimeId",
          ss."seatId",
          ss.status
        FROM "ShowtimeSeat" ss
        LEFT JOIN "Seat" s ON s.id = ss."seatId"
        WHERE s.id IS NULL
      `,
    })
  );

  // REF-003: No Payment referencing non-existent Booking
  results.push(
    await checkInvariant({
      id: 'REF-003',
      name: 'Orphaned Payment References',
      description: 'No Payment referencing non-existent Booking',
      category: 'CONSISTENCY',
      tier: 'CRITICAL',
      query: `
        SELECT 
          p.id as payment_id,
          p."stripePaymentIntentId",
          p.status,
          p.amount
        FROM "Payment" p
        LEFT JOIN "Booking" b ON b."paymentId" = p.id
        WHERE b.id IS NULL
        AND p."createdAt" < NOW() - INTERVAL '5 minutes'
      `,
    })
  );

  // ============================================================================
  // RESULTS ANALYSIS & REPORTING
  // ============================================================================

  await prisma.$disconnect();
  
  const totalTime = Date.now() - startTime;
  
  // Categorize results
  const criticalViolations = results.filter((r) => r.tier === 'CRITICAL' && !r.passed);
  const highViolations = results.filter((r) => r.tier === 'HIGH' && !r.passed);
  const mediumViolations = results.filter((r) => r.tier === 'MEDIUM' && !r.passed);
  const lowViolations = results.filter((r) => r.tier === 'LOW' && !r.passed);
  const passed = results.filter((r) => r.passed);
  
  // Print tiered report
  console.log('\n' + '='.repeat(80));
  console.log('INVARIANT VERIFICATION REPORT');
  console.log('='.repeat(80));
  
  // Tier 1 - Financial Safety
  const financialResults = results.filter(r => r.category === 'FINANCIAL');
  console.log('\n📊 Tier 1 – Financial Safety');
  console.log('-'.repeat(40));
  financialResults.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const violations = result.passed ? '' : ` (${result.violationCount} violations)`;
    console.log(`  [${status}] ${result.id}: ${result.name}${violations}`); 
 });
  
  // Tier 2 - Seat & Lock Integrity
  const seatLockResults = results.filter(r => r.category === 'SEAT_LOCK');
  console.log('\n🔒 Tier 2 – Seat & Lock Integrity');
  console.log('-'.repeat(40));
  seatLockResults.forEach(result => {
    const status = result.passed ? '✅ PASS' : (result.tier === 'CRITICAL' ? '❌ FAIL' : '⚠️  WARN');
    const violations = result.passed ? '' : ` (${result.violationCount} violations)`;
    console.log(`  [${status}] ${result.id}: ${result.name}${violations}`);
  });
  
  // Tier 3 - Webhook & Idempotency
  const webhookResults = results.filter(r => r.category === 'WEBHOOK');
  console.log('\n🔗 Tier 3 – Webhook & Idempotency');
  console.log('-'.repeat(40));
  webhookResults.forEach(result => {
    const status = result.passed ? '✅ PASS' : (result.tier === 'CRITICAL' ? '❌ FAIL' : '⚠️  WARN');
    const violations = result.passed ? '' : ` (${result.violationCount} violations)`;
    console.log(`  [${status}] ${result.id}: ${result.name}${violations}`);
  });
  
  // Tier 4 - Consistency & Structural
  const consistencyResults = results.filter(r => r.category === 'CONSISTENCY');
  console.log('\n🔧 Tier 4 – Consistency & Structural Integrity');
  console.log('-'.repeat(40));
  consistencyResults.forEach(result => {
    const status = result.passed ? '✅ PASS' : (result.tier === 'CRITICAL' ? '❌ FAIL' : '⚠️  WARN');
    const violations = result.passed ? '' : ` (${result.violationCount} violations)`;
    console.log(`  [${status}] ${result.id}: ${result.name}${violations}`);
  });
  
  // Overall Status
  console.log('\n' + '='.repeat(80));
  console.log('OVERALL STATUS');
  console.log('='.repeat(80));
  console.log(`Total Checks: ${results.length}`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Critical Failures: ${criticalViolations.length}`);
  console.log(`High Priority Warnings: ${highViolations.length}`);
  console.log(`Medium Priority Warnings: ${mediumViolations.length}`);
  console.log(`Execution Time: ${totalTime}ms`);
  
  // Detailed violations
  if (criticalViolations.length > 0) {
    console.log('\n🚨 CRITICAL VIOLATIONS DETECTED:');
    console.log('='.repeat(80));
    criticalViolations.forEach((result) => {
      printResult(result);
    });
  }
  
  if (highViolations.length > 0) {
    console.log('\n⚠️  HIGH PRIORITY WARNINGS:');
    console.log('='.repeat(80));
    highViolations.forEach((result) => {
      printResult(result);
    });
  }
  
  if (VERBOSE && (mediumViolations.length > 0 || lowViolations.length > 0)) {
    console.log('\n📋 MEDIUM/LOW PRIORITY ISSUES:');
    console.log('='.repeat(80));
    [...mediumViolations, ...lowViolations].forEach((result) => {
      printResult(result);
    });
  }
  
  if (VERBOSE && passed.length > 0) {
    console.log('\n✅ PASSED INVARIANTS:');
    console.log('='.repeat(80));
    passed.forEach((result) => {
      console.log(`  ${result.id}: ${result.name} (${result.executionTimeMs}ms)`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  // Exit with appropriate code
  if (criticalViolations.length > 0) {
    console.log('❌ CRITICAL INVARIANTS VIOLATED - SYSTEM NOT PRODUCTION SAFE');
    console.log('='.repeat(80));
    process.exit(1);
  } else if (highViolations.length > 0) {
    console.log('⚠️  HIGH PRIORITY WARNINGS DETECTED - REVIEW REQUIRED');
    console.log('='.repeat(80));
    process.exit(2);
  } else if (mediumViolations.length > 0 || lowViolations.length > 0) {
    console.log('📋 MINOR ISSUES DETECTED - MONITORING RECOMMENDED');
    console.log('='.repeat(80));
    process.exit(0);
  } else {
    console.log('✅ ALL INVARIANTS HOLD - SYSTEM PRODUCTION SAFE');
    console.log('='.repeat(80));
    process.exit(0);
  }
}

async function checkInvariant(config: {
  id: string;
  name: string;
  description: string;
  category: InvariantCategory;
  tier: InvariantTier;
  query: string;
}): Promise<InvariantResult> {
  const startTime = Date.now();
  
  try {
    const violations = await prisma.$queryRawUnsafe(config.query);
    const violationCount = Array.isArray(violations) ? violations.length : 0;
    const executionTime = Date.now() - startTime;

    return {
      id: config.id,
      name: config.name,
      description: config.description,
      category: config.category,
      tier: config.tier,
      passed: violationCount === 0,
      violationCount,
      violations: VERBOSE ? violations : undefined,
      query: config.query,
      executionTimeMs: executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ Error checking invariant ${config.id}:`, error);
    
    return {
      id: config.id,
      name: config.name,
      description: config.description,
      category: config.category,
      tier: config.tier,
      passed: false,
      violationCount: -1,
      query: config.query,
      executionTimeMs: executionTime,
    };
  }
}

function printResult(result: InvariantResult) {
  console.log(`\n🔍 ${result.id}: ${result.name}`);
  console.log(`   Description: ${result.description}`);
  console.log(`   Category: ${result.category}`);
  console.log(`   Tier: ${result.tier}`);
  console.log(`   Violations: ${result.violationCount}`);
  console.log(`   Execution Time: ${result.executionTimeMs}ms`);

  if (VERBOSE && result.violations && result.violations.length > 0) {
    console.log(`   Violation Details:`);
    result.violations.slice(0, 5).forEach((v, i) => {
      console.log(`     ${i + 1}. ${JSON.stringify(v, null, 6)}`);
    });
    
    if (result.violations.length > 5) {
      console.log(`     ... and ${result.violations.length - 5} more violations`);
    }
  }
  
  if (VERBOSE) {
    console.log(`   Query: ${result.query.trim()}`);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(3);
});

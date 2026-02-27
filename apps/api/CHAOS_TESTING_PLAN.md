# Chaos Testing Plan - Movie Ticket Booking Platform

## Overview

This document defines systematic chaos testing scenarios to prove system correctness under failure conditions.

**Goal**: Verify that financial and seat invariants hold even when infrastructure fails.

---

## Prerequisites

### Setup
```bash
# Install dependencies
npm install

# Start infrastructure
docker-compose up -d postgres redis

# Run migrations
npm run prisma:migrate

# Seed test data
npm run seed:test

# Build verification script
npm run build:scripts
```

### Baseline Verification
```bash
# Verify all invariants pass before chaos
npm run verify-invariants

# Should output:
# ✅ ALL INVARIANTS HOLD - SYSTEM CORRECT
```

---

## Chaos Test Matrix

### Domain 1: Database Failures

#### Test 1.A - DB Dies During Booking Confirmation
**Objective**: Verify transaction rollback prevents partial state

**Setup**:
1. Create booking with locked seats
2. Initiate payment (mock Stripe success)
3. Trigger webhook to confirm booking

**Chaos Injection**:
```bash
# Kill PostgreSQL mid-transaction
docker-compose kill postgres

# Wait 2 seconds
sleep 2

# Restart PostgreSQL
docker-compose start postgres
```

**Expected Result**:
- Transaction rolls back
- No seats become BOOKED
- No locks deleted
- Booking remains PENDING
- Retry succeeds after DB restart

**Verification**:
```bash
npm run verify-invariants

# Check specific invariants
psql -c "SELECT * FROM \"ShowtimeSeat\" WHERE status = 'BOOKED'"
# Should return 0 rows if transaction rolled back

psql -c "SELECT * FROM \"SeatLock\" WHERE \"expiresAt\" > NOW()"
# Should still show locks if rollback occurred
```

**Pass Criteria**:
- ✅ No BOOKED seats without CONFIRMED booking
- ✅ Locks still exist
- ✅ Retry succeeds

---

#### Test 1.B - DB Dies After Refund API, Before Status Update
**Objective**: Verify refund idempotency prevents double refund

**Setup**:
1. Create booking with expired locks
2. Payment succeeds
3. Webhook triggers automatic refund

**Chaos Injection**:
```bash
# Inject delay after Stripe refund call
# (Requires code instrumentation or network delay)

# Kill server after Stripe refund succeeds
docker-compose kill api

# Restart server
docker-compose start api

# Replay webhook
curl -X POST http://localhost:3001/api/webhooks/stripe \
  -H "stripe-signature: ..." \
  -d @webhook-payload.json
```

**Expected Result**:
- Payment.status still SUCCEEDED after crash
- Webhook retry detects status
- Refund idempotency key prevents double refund
- Status transitions to REFUNDED
- Booking cancelled

**Verification**:
```bash
npm run verify-invariants

# Check payment status
psql -c "SELECT status FROM \"Payment\" WHERE \"stripePaymentIntentId\" = '...'"
# Should be REFUNDED

# Check Stripe dashboard
# Should show only ONE refund
```

**Pass Criteria**:
- ✅ No double refund
- ✅ Final state: Payment REFUNDED + Booking CANCELLED
- ✅ FIN-001 invariant holds

---

### Domain 2: Application Crashes

#### Test 2.A - Crash During Webhook Processing
**Objective**: Verify webhook retry completes processing

**Setup**:
1. Payment succeeds
2. Webhook arrives
3. Event inserted

**Chaos Injection**:
```bash
# Kill server after event insert, before processedAt set
# (Requires instrumentation or SIGKILL at precise moment)

docker-compose kill -s SIGKILL api

# Restart
docker-compose start api

# Replay webhook
curl -X POST http://localhost:3001/api/webhooks/stripe \
  -H "stripe-signature: ..." \
  -d @webhook-payload.json
```

**Expected Result**:
- Event exists with processedAt = NULL
- Retry processes event
- Booking confirmed
- processedAt set

**Verification**:
```bash
npm run verify-invariants

# Check webhook event
psql -c "SELECT processed, \"processedAt\" FROM \"WebhookEvent\" WHERE \"stripeEventId\" = '...'"
# Should show processed = true

# Check booking
psql -c "SELECT status FROM \"Booking\" WHERE id = '...'"
# Should be CONFIRMED
```

**Pass Criteria**:
- ✅ Booking confirmed after retry
- ✅ No duplicate processing
- ✅ WEBHOOK-001 invariant holds

---

### Domain 3: Stripe Failures

#### Test 3.A - Stripe Timeout During Refund
**Objective**: Verify refund retry with idempotency

**Setup**:
1. Payment succeeds with expired locks
2. Webhook triggers refund

**Chaos Injection**:
```bash
# Mock Stripe API timeout
# (Requires Stripe mock server or network rules)

# Simulate timeout
iptables -A OUTPUT -p tcp --dport 443 -d api.stripe.com -j DROP

# Wait for timeout
sleep 30

# Restore connection
iptables -D OUTPUT -p tcp --dport 443 -d api.stripe.com -j DROP

# Replay webhook
curl -X POST http://localhost:3001/api/webhooks/stripe \
  -H "stripe-signature: ..." \
  -d @webhook-payload.json
```

**Expected Result**:
- First attempt: Payment → REFUNDING
- Timeout occurs
- Status reverts to SUCCEEDED
- Retry succeeds with idempotency key
- Final: Payment REFUNDED

**Verification**:
```bash
npm run verify-invariants

# Check payment status history
psql -c "SELECT status, \"updatedAt\" FROM \"Payment\" WHERE \"stripePaymentIntentId\" = '...'"

# Verify only one refund in Stripe
```

**Pass Criteria**:
- ✅ No double refund
- ✅ Final state correct
- ✅ FIN-003 invariant holds (no stuck REFUNDING)

---

#### Test 3.B - Concurrent Webhook Delivery
**Objective**: Verify idempotency under concurrent load

**Setup**:
1. Payment succeeds
2. Prepare webhook payload

**Chaos Injection**:
```bash
# Send same webhook 5 times concurrently
for i in {1..5}; do
  curl -X POST http://localhost:3001/api/webhooks/stripe \
    -H "stripe-signature: ..." \
    -d @webhook-payload.json &
done
wait
```

**Expected Result**:
- Only one processes
- Others return success (duplicate)
- No duplicate booking confirmation
- No duplicate refund

**Verification**:
```bash
npm run verify-invariants

# Check webhook events
psql -c "SELECT COUNT(*) FROM \"WebhookEvent\" WHERE \"stripeEventId\" = '...'"
# Should be 1

# Check booking
psql -c "SELECT status FROM \"Booking\" WHERE id = '...'"
# Should be CONFIRMED (only once)
```

**Pass Criteria**:
- ✅ Exactly one processing
- ✅ WEBHOOK-002 invariant holds
- ✅ No duplicate state changes

---

### Domain 4: Redis Failures

#### Test 4.A - Redis Unavailable During Lock Attempt
**Objective**: Verify fail-closed behavior

**Setup**:
1. User attempts to lock seats

**Chaos Injection**:
```bash
# Stop Redis
docker-compose stop redis

# Attempt lock
curl -X POST http://localhost:3001/api/seat-locks \
  -H "Authorization: Bearer ..." \
  -d '{"showtimeSeatIds": ["..."]}'
```

**Expected Result**:
- Rate limit check fails
- Request rejected with error
- No silent bypass

**Verification**:
```bash
# Check response
# Should be 500 or 503 error

# Check logs
docker-compose logs api | grep "Redis"
# Should show connection error

# Verify no locks created
psql -c "SELECT COUNT(*) FROM \"SeatLock\" WHERE \"createdAt\" > NOW() - INTERVAL '1 minute'"
# Should be 0
```

**Pass Criteria**:
- ✅ Request rejected
- ✅ No silent bypass
- ✅ Clear error message

---

### Domain 5: Concurrency Storms

#### Test 5.A - 200 Users Lock Same Seat
**Objective**: Verify exactly-once lock acquisition

**Setup**:
1. Create showtime with seats
2. Prepare 200 concurrent requests

**Chaos Injection**:
```bash
# Use k6 for load generation
k6 run - <<EOF
import http from 'k6/http';

export let options = {
  vus: 200,
  duration: '1s',
};

export default function() {
  const payload = JSON.stringify({
    showtimeSeatIds: ['same-seat-id']
  });
  
  http.post('http://localhost:3001/api/seat-locks', payload, {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ...'
    },
  });
}
EOF
```

**Expected Result**:
- Exactly 1 success
- 199 failures (seat locked)
- No deadlocks
- Retry logs visible

**Verification**:
```bash
npm run verify-invariants

# Check lock count
psql -c "SELECT COUNT(*) FROM \"SeatLock\" WHERE \"showtimeSeatId\" = '...'"
# Should be 1

# Check for multiple locks (should be 0)
npm run verify-invariants | grep "SEAT-002"
# Should pass
```

**Pass Criteria**:
- ✅ Exactly one lock
- ✅ SEAT-002 invariant holds
- ✅ No deadlocks

---

## Execution Workflow

### 1. Pre-Test
```bash
# Clean state
npm run db:reset
npm run seed:test

# Baseline verification
npm run verify-invariants
# Must pass before chaos testing
```

### 2. Run Chaos Test
```bash
# Execute specific test
./scripts/chaos/test-1a-db-failure.sh

# Or run all tests
npm run chaos:all
```

### 3. Post-Test Verification
```bash
# Verify invariants
npm run verify-invariants --verbose

# Check metrics
npm run metrics:report

# Review logs
docker-compose logs api | grep "ERROR\|CRITICAL"
```

### 4. Document Results
```markdown
## Test 1.A Results

**Date**: 2024-01-15
**Duration**: 30 seconds
**Chaos**: PostgreSQL killed mid-transaction

**Results**:
- ✅ Transaction rolled back
- ✅ No partial state
- ✅ Retry succeeded
- ✅ All invariants passed

**Metrics**:
- Retry count: 3
- Recovery time: 2.1s
- Final state: Correct
```

---

## Metrics to Collect

### During Chaos
- Request latency (p50, p95, p99)
- Error rate
- Retry count
- Transaction rollback count
- Lock acquisition failures
- Webhook processing time

### After Chaos
- Invariant violation count
- Orphaned records
- Stuck states (REFUNDING, etc.)
- Data consistency score

---

## Recovery Procedures

### If Invariant Violations Detected

#### FIN-001: Payment SUCCEEDED without CONFIRMED booking
```sql
-- Identify violations
SELECT * FROM "Payment" p
LEFT JOIN "Booking" b ON b."paymentId" = p.id
WHERE p.status = 'SUCCEEDED'
AND (b.id IS NULL OR b.status != 'CONFIRMED');

-- Manual intervention required:
-- 1. Check Stripe dashboard
-- 2. If payment actually succeeded, manually confirm booking
-- 3. If locks expired, initiate refund
```

#### SEAT-001: BOOKED seat with active lock
```sql
-- Identify violations
SELECT * FROM "ShowtimeSeat" ss
JOIN "SeatLock" sl ON sl."showtimeSeatId" = ss.id
WHERE ss.status = 'BOOKED'
AND sl."expiresAt" > NOW();

-- Fix: Delete orphaned locks
DELETE FROM "SeatLock"
WHERE "showtimeSeatId" IN (
  SELECT ss.id FROM "ShowtimeSeat" ss
  WHERE ss.status = 'BOOKED'
);
```

---

## Success Criteria

### Individual Test
- ✅ All critical invariants pass
- ✅ System recovers automatically
- ✅ No manual intervention required
- ✅ Metrics within acceptable range

### Full Chaos Suite
- ✅ All 11 invariants pass after all tests
- ✅ No data loss
- ✅ No financial discrepancies
- ✅ Recovery time < 5 seconds
- ✅ Error rate returns to baseline

---

## Conclusion

Chaos testing proves the system is **financially safe** under real-world failure conditions.

Without chaos testing, we only know the system works when everything works.

With chaos testing, we know the system **stays correct** when things break.

That's the difference between a demo and a production system.

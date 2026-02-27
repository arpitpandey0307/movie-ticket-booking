# Payment Edge Cases - Critical Scenarios

## Overview

This document defines behavior for all critical edge cases in the payment flow. These scenarios are where most booking systems fail.

---

## Edge Case 1: Payment Succeeds After Lock Expiration

### Scenario
1. User locks seats (10-minute expiration)
2. User initiates payment
3. User takes 11 minutes to complete payment
4. Locks expire
5. Payment succeeds
6. Webhook arrives

### Current Behavior
```
1. Webhook calls confirmBooking()
2. confirmBooking() validates locks
3. Lock validation fails (expired)
4. Throws error: "Lock expired before confirmation"
5. Webhook processing fails
6. Stripe retries webhook (up to 5 times over 3 days)
7. All retries fail (locks still expired)
```

### Result
- Booking remains PENDING
- Payment status: SUCCEEDED
- Seats remain AVAILABLE (locks deleted)
- **User paid but has no confirmed booking**

### Required Action
**Manual intervention required** or **automatic refund**

### Recommended Solution
Implement automatic refund:
```typescript
catch (error) {
  if (error.message.includes('Lock expired')) {
    // Initiate refund
    await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: 'requested_by_customer',
    });
    
    // Cancel booking
    await bookingService.cancelBooking(bookingId, userId);
    
    // Update payment status
    await prisma.payment.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: { status: 'REFUNDED' },
    });
  }
}
```

---

## Edge Case 2: Webhook Arrives Before Client Receives Success Response

### Scenario
1. User completes payment
2. Stripe processes payment
3. Webhook fires immediately
4. Webhook confirms booking
5. Client still waiting for payment response
6. Client receives success response

### Current Behavior
```
1. Webhook arrives first
2. confirmBooking() succeeds
3. Booking status: CONFIRMED
4. Seats status: BOOKED
5. Locks deleted
6. Client receives success response
7. Client may call confirmBooking() again
8. confirmBooking() sees status already CONFIRMED
9. Returns existing booking (idempotent)
```

### Result
✅ **Handled correctly** - Idempotent confirmation

---

## Edge Case 3: Stripe Retries Webhook 5 Times

### Scenario
1. Payment succeeds
2. Webhook arrives
3. Our server is down / slow
4. Webhook times out
5. Stripe retries (5 attempts over 3 days)

### Current Behavior
```
1. First webhook attempt:
   - Check if event exists
   - Event doesn't exist
   - Insert event (unique constraint)
   - Process confirmation
   - Mark as processed
   
2. Retry attempts:
   - Check if event exists
   - Event exists with processed=true
   - Return success immediately (idempotent)
   - No duplicate processing
```

### Result
✅ **Handled correctly** - Webhook idempotency via unique constraint

---

## Edge Case 4: Client Retries Booking Confirmation

### Scenario
1. Payment succeeds
2. Webhook confirms booking
3. Client doesn't receive response (network issue)
4. Client retries confirmation request

### Current Behavior
```
1. First confirmation:
   - Booking status: PENDING
   - Validates locks
   - Updates seats to BOOKED
   - Deletes locks
   - Updates booking to CONFIRMED
   
2. Retry:
   - Booking status: CONFIRMED
   - updateMany WHERE status='PENDING'
   - count = 0
   - Returns existing booking (idempotent)
```

### Result
✅ **Handled correctly** - Conditional update provides idempotency

---

## Edge Case 5: User Abandons Payment, Lock Expires, Booking Remains PENDING

### Scenario
1. User locks seats
2. User creates booking (PENDING)
3. User navigates away / closes browser
4. Lock expires (10 minutes)
5. Booking remains PENDING forever

### Current Behavior
```
- Booking status: PENDING
- Locks: Expired (deleted by cleanup job)
- Seats: AVAILABLE
- Payment: Not created
```

### Problem
**Orphaned PENDING bookings accumulate**

### Recommended Solution
Implement booking expiration:

```typescript
// Cron job: Every 5 minutes
async function cleanupExpiredBookings() {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes
  
  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: cutoff },
      paymentId: null, // No payment initiated
    },
  });
  
  for (const booking of expiredBookings) {
    await bookingService.cancelBooking(booking.id, booking.userId);
  }
}
```

---

## Edge Case 6: Concurrent Booking Confirmations (Race Condition)

### Scenario
1. Payment succeeds
2. Webhook fires
3. Client also calls confirm endpoint
4. Both arrive simultaneously

### Current Behavior
```
Transaction 1 (Webhook):
- Booking status: PENDING
- Validates locks
- updateMany WHERE status='PENDING'
- count = 1
- Updates to CONFIRMED

Transaction 2 (Client):
- Booking status: CONFIRMED (T1 committed)
- updateMany WHERE status='PENDING'
- count = 0
- Returns existing booking (idempotent)
```

### Result
✅ **Handled correctly** - SERIALIZABLE + conditional update

---

## Edge Case 7: Payment Succeeds But Seat Already Booked (Race)

### Scenario
1. User A locks seats [1, 2]
2. User B locks seats [2, 3] (seat 2 lock expired, User B acquires it)
3. User A completes payment
4. Webhook tries to confirm User A's booking

### Current Behavior
```
1. Webhook validates User A's locks
2. Lock for seat 1: Valid
3. Lock for seat 2: Missing (User B has it)
4. Throws error: "Lock missing for seat"
5. Webhook processing fails
6. Stripe retries
```

### Result
- User A paid but booking not confirmed
- **Requires refund**

### Prevention
Lock validation in `createPaymentIntent()` catches this before payment:
```typescript
// Before creating PaymentIntent
for (const lock of locks) {
  if (lock.expiresAt <= now) {
    throw new Error('Lock expired - please re-select seats');
  }
}
```

---

## Edge Case 8: Webhook Arrives Out of Order

### Scenario
1. Payment processing
2. Webhook 1: `payment_intent.processing`
3. Webhook 2: `payment_intent.succeeded`
4. Webhook 1 arrives after Webhook 2 (network delay)

### Current Behavior
```
Webhook 2 (succeeded):
- Insert event (succeeded)
- Confirm booking
- Mark processed

Webhook 1 (processing):
- Insert event (processing)
- No action (unhandled event type)
- Mark processed
```

### Result
✅ **Handled correctly** - Each event processed independently

---

## Edge Case 9: Partial Refund After Confirmation

### Scenario
1. Booking confirmed
2. Theater cancels showtime
3. Need to refund users

### Current Behavior
**Not implemented** - Manual process required

### Recommended Solution
```typescript
async function refundBooking(bookingId: string, reason: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });
  
  if (booking.status !== 'CONFIRMED') {
    throw new Error('Can only refund confirmed bookings');
  }
  
  // Create refund in Stripe
  const refund = await stripe.refunds.create({
    payment_intent: booking.payment.stripePaymentIntentId,
    reason: 'requested_by_customer',
  });
  
  // Update booking and payment status
  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
    }),
    prisma.payment.update({
      where: { id: booking.paymentId },
      data: { status: 'REFUNDED' },
    }),
    // Note: Seats remain BOOKED (cannot be resold)
  ]);
}
```

---

## Edge Case 10: Database Transaction Fails During Webhook Processing

### Scenario
1. Webhook arrives
2. Event inserted successfully
3. confirmBooking() transaction starts
4. Database connection lost mid-transaction
5. Transaction rolls back

### Current Behavior
```
1. Event exists with processed=false
2. Webhook processing throws error
3. Returns 500 to Stripe
4. Stripe retries webhook
5. Event already exists
6. Retry processes successfully
```

### Result
✅ **Handled correctly** - Event insertion guards the process

---

## Payment State Transitions

### Valid Transitions

```
PENDING → SUCCEEDED (payment succeeds)
PENDING → FAILED (payment fails)
PENDING → CANCELLED (user cancels)
SUCCEEDED → REFUNDED (refund issued)
```

### Invalid Transitions (Prevented)

```
SUCCEEDED → PENDING (cannot un-succeed)
FAILED → SUCCEEDED (cannot retry failed payment)
REFUNDED → SUCCEEDED (cannot un-refund)
```

---

## Booking State Transitions with Payment

### Valid Transitions

```
PENDING + no payment → PENDING + payment initiated
PENDING + payment SUCCEEDED → CONFIRMED
PENDING + payment FAILED → CANCELLED
PENDING + payment CANCELLED → CANCELLED
CONFIRMED → CANCELLED (with refund)
```

### Invalid Transitions (Prevented)

```
CONFIRMED → PENDING (cannot un-confirm)
CANCELLED → CONFIRMED (cannot un-cancel)
```

---

## Monitoring & Alerts

### Critical Metrics

1. **Payment Success Rate**
   ```
   succeeded_payments / total_payment_attempts
   ```
   Alert if < 95%

2. **Lock Expiration Before Payment Rate**
   ```
   lock_expired_errors / total_confirmations
   ```
   Alert if > 5%

3. **Webhook Processing Failure Rate**
   ```
   webhook_failures / total_webhooks
   ```
   Alert if > 1%

4. **Orphaned PENDING Bookings**
   ```
   SELECT COUNT(*) FROM Booking 
   WHERE status='PENDING' 
   AND createdAt < NOW() - INTERVAL '15 minutes'
   AND paymentId IS NULL
   ```
   Alert if > 100

5. **Payment-Booking Mismatch**
   ```
   SELECT COUNT(*) FROM Payment p
   LEFT JOIN Booking b ON b.paymentId = p.id
   WHERE p.status = 'SUCCEEDED'
   AND (b.id IS NULL OR b.status != 'CONFIRMED')
   ```
   Alert if > 0

---

## Recovery Procedures

### Scenario: User Paid But Booking Not Confirmed

**Detection**:
```sql
SELECT b.id, b.bookingCode, b.userId, p.stripePaymentIntentId
FROM Booking b
JOIN Payment p ON p.id = b.paymentId
WHERE p.status = 'SUCCEEDED'
AND b.status = 'PENDING'
AND b.createdAt < NOW() - INTERVAL '1 hour';
```

**Action**:
1. Check if locks expired
2. If yes → Initiate refund
3. If no → Manually confirm booking
4. Notify user

### Scenario: Duplicate Bookings (Should Never Happen)

**Detection**:
```sql
SELECT ss.id, COUNT(DISTINCT b.id) as booking_count
FROM ShowtimeSeat ss
JOIN BookingSeat bs ON bs.showtimeSeatId = ss.id
JOIN Booking b ON b.id = bs.bookingId
WHERE ss.status = 'BOOKED'
AND b.status = 'CONFIRMED'
GROUP BY ss.id
HAVING COUNT(DISTINCT b.id) > 1;
```

**Action**:
1. **CRITICAL BUG** - Should never occur
2. Investigate transaction logs
3. Refund all but first booking
4. Fix bug immediately

---

## Testing Checklist

### Unit Tests
- [ ] Payment intent creation with valid locks
- [ ] Payment intent creation with expired locks (should fail)
- [ ] Webhook idempotency (duplicate events)
- [ ] Booking confirmation with valid locks
- [ ] Booking confirmation with expired locks (should fail)
- [ ] Conditional booking update (idempotency)

### Integration Tests
- [ ] Full booking flow: lock → book → pay → confirm
- [ ] Lock expiration during payment
- [ ] Webhook retry handling
- [ ] Concurrent confirmation attempts
- [ ] Payment failure → booking cancellation

### Load Tests
- [ ] 100 concurrent payment intent creations
- [ ] 50 concurrent webhook deliveries
- [ ] Lock expiration under load
- [ ] Database connection pool exhaustion

---

## Conclusion

Payment integration is where theoretical correctness meets real-world chaos. Every edge case must be:

1. **Documented** (this file)
2. **Handled** (code implementation)
3. **Tested** (unit + integration + load)
4. **Monitored** (metrics + alerts)
5. **Recoverable** (manual procedures)

The system is only as reliable as its worst edge case.

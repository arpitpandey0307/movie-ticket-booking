# System Invariants - Movie Ticket Booking Platform

## Core Invariant: Seat State Machine

At any moment in time, a seat (ShowtimeSeat) can ONLY be in one of these valid states:

### Valid States

1. **Available & Unlocked**
   - `ShowtimeSeat.status = 'AVAILABLE'`
   - No active `SeatLock` exists (or only expired locks)
   - **Meaning**: Seat is free for anyone to lock

2. **Available & Locked**
   - `ShowtimeSeat.status = 'AVAILABLE'`
   - Active `SeatLock` exists (`expiresAt > NOW()`)
   - **Meaning**: Seat is temporarily reserved, awaiting payment

3. **Booked & Unlocked**
   - `ShowtimeSeat.status = 'BOOKED'`
   - No `SeatLock` exists
   - `Booking` exists with `status = 'CONFIRMED'`
   - **Meaning**: Seat is permanently sold

### Invalid States (MUST NEVER OCCUR)

❌ **Booked & Locked**
- `ShowtimeSeat.status = 'BOOKED'` + active `SeatLock`
- **Why invalid**: Booked seats cannot be locked
- **Prevention**: Lock acquisition checks `status != 'BOOKED'`

❌ **Available & Multiple Locks**
- `ShowtimeSeat.status = 'AVAILABLE'` + multiple active locks
- **Why invalid**: Only one user can hold a lock at a time
- **Prevention**: Unique constraint on `SeatLock.showtimeSeatId`

❌ **Booked Without Booking**
- `ShowtimeSeat.status = 'BOOKED'` + no `Booking` record
- **Why invalid**: Seat status must match booking existence
- **Prevention**: Only `confirmBooking()` sets status to BOOKED, and it creates Booking atomically

---

## State Transitions

### 1. Lock Acquisition
```
AVAILABLE & UNLOCKED → AVAILABLE & LOCKED
```

**Trigger**: User calls `lockSeats()`

**Guards**:
- Seat must be `AVAILABLE`
- No active lock exists (or expired lock is deleted)
- Rate limit not exceeded
- User owns at most 10 seats

**Atomicity**: SERIALIZABLE transaction

---

### 2. Lock Expiration
```
AVAILABLE & LOCKED → AVAILABLE & UNLOCKED
```

**Trigger**: Time passes beyond `SeatLock.expiresAt`

**Guards**: None (automatic)

**Atomicity**: Inline validation treats expired locks as non-existent

**Cleanup**: Async job deletes expired locks (optimization only)

---

### 3. Booking Confirmation
```
AVAILABLE & LOCKED → BOOKED & UNLOCKED
```

**Trigger**: Payment webhook calls `confirmBooking()`

**Guards**:
- Lock must be active (`expiresAt > NOW()`)
- Lock must belong to user
- Seat must still be `AVAILABLE`
- Booking must be `PENDING`

**Atomicity**: SERIALIZABLE transaction with:
1. Validate locks
2. Conditional update: `WHERE status = 'AVAILABLE'`
3. Delete locks
4. Conditional update: `WHERE status = 'PENDING'`

**Rollback**: If any step fails, entire transaction rolls back

---

### 4. Booking Cancellation
```
AVAILABLE & LOCKED → AVAILABLE & UNLOCKED
```

**Trigger**: User cancels booking OR payment fails

**Guards**:
- Booking must be `PENDING` (cannot cancel `CONFIRMED`)
- User must own booking

**Atomicity**: Transaction deletes locks + updates booking status

---

### Invalid Transitions (PREVENTED)

❌ **AVAILABLE & UNLOCKED → BOOKED**
- Cannot book without locking first
- **Prevention**: `confirmBooking()` requires valid locks

❌ **BOOKED → AVAILABLE**
- Cannot un-book a confirmed booking
- **Prevention**: No code path updates BOOKED seats to AVAILABLE

❌ **AVAILABLE & LOCKED (User A) → AVAILABLE & LOCKED (User B)**
- Cannot steal another user's lock
- **Prevention**: Lock acquisition checks existing lock ownership

---

## Webhook Idempotency Invariant

### Valid Webhook Processing States

1. **Not Processed**
   - `WebhookEvent` does not exist
   - **Action**: Process webhook

2. **Processing**
   - `WebhookEvent` exists with `processed = false`
   - **Action**: Another instance is processing, return duplicate

3. **Processed Successfully**
   - `WebhookEvent` exists with `processed = true`, `processingError = null`
   - **Action**: Return success (idempotent)

4. **Processed with Error**
   - `WebhookEvent` exists with `processingError != null`
   - **Action**: Stripe will retry, error will be thrown again

### Webhook Processing Flow

```
1. Check if event exists
   - If exists → return success (idempotent)
   
2. Try to insert event (unique constraint)
   - If conflict → return success (race condition)
   - If success → continue
   
3. Process business logic
   - Booking confirmation (SERIALIZABLE transaction)
   
4. Mark event as processed
   - If business logic fails → record error, throw (Stripe retries)
   - If business logic succeeds → mark processed
```

**Critical Property**: Event uniqueness guards the entire confirmation process. If event insertion succeeds, we own the processing. If it fails, another instance owns it.

---

## Transaction Boundaries

### Rule: No Nested Transactions

Each service method is a **top-level transaction**. Services do NOT call each other's transactional methods within a transaction.

**Correct**:
```typescript
// Controller
await seatLockService.lockSeats(...);        // Transaction 1
await bookingService.createBooking(...);     // Transaction 2
// Later: webhook
await webhookService.processWebhook(...);    // Transaction 3
  → calls bookingService.confirmBooking(...) // Transaction 4
```

**Incorrect**:
```typescript
// Service calling another service's transaction
async confirmBooking() {
  await prisma.$transaction(async (tx) => {
    await seatLockService.releaseLocks(...); // ❌ Nested transaction
  });
}
```

---

## Concurrency Guarantees

### 1. No Double Booking

**Guarantee**: Two concurrent users cannot book the same seat.

**Mechanisms**:
- SERIALIZABLE isolation on booking confirmation
- Conditional update: `WHERE status = 'AVAILABLE'`
- Count verification after update
- Lock validation before update

**Proof**: If two transactions both try to confirm the same seat:
1. Both validate locks (both see AVAILABLE)
2. Both attempt conditional update
3. SERIALIZABLE ensures one commits first
4. Second transaction sees seat as BOOKED
5. Conditional update returns count = 0
6. Second transaction throws error

---

### 2. No Deadlocks

**Guarantee**: Lock acquisition cannot deadlock.

**Mechanisms**:
- Deterministic lock ordering (sorted seat IDs)
- Retry on deadlock detection (40P01)

**Proof**: If User A locks [1,2] and User B locks [2,1]:
- Both sort to [1,2]
- Both acquire in same order
- No circular wait → no deadlock

---

### 3. No Phantom Locks

**Guarantee**: Expired locks do not block seat availability.

**Mechanisms**:
- Inline expiration validation (`expiresAt > NOW()`)
- Expired locks deleted during lock acquisition
- Cleanup job is optimization only

**Proof**: Lock acquisition checks expiration before rejecting. Even if cleanup job fails, expired locks are invisible.

---

### 4. No Duplicate Webhook Processing

**Guarantee**: Each Stripe event is processed exactly once.

**Mechanisms**:
- Unique constraint on `WebhookEvent.stripeEventId`
- Check-then-insert pattern with race condition handling
- Idempotent business logic (conditional updates)

**Proof**: If Stripe retries webhook:
1. Event already exists
2. Return success immediately
3. No duplicate processing

---

## Rate Limiting Invariants

### Per-User Limits

1. **Max 10 seats per request**
   - **Enforcement**: Before transaction
   - **Purpose**: Prevent theater-wide locking

2. **Max 30 lock attempts per 10 minutes**
   - **Enforcement**: Redis sliding window
   - **Purpose**: Prevent DOS attacks

### Redis Failure Handling

**Current**: Fail-closed (throw error if Redis unavailable)

**Alternative**: Fail-open (allow requests if Redis down)

**Recommendation**: Fail-closed for security, with Redis HA setup

---

## Observability Invariants

### Logged Events

1. **Lock Acquisition**
   - Success: userId, seatCount, duration
   - Failure: userId, seatCount, duration, error

2. **Serialization Retries**
   - attempt, operation, userId, backoffMs, errorCode

3. **Booking Confirmation**
   - Success: bookingId, userId, seatCount
   - Failure: bookingId, userId, error

4. **Webhook Processing**
   - Recorded: stripeEventId, eventType
   - Processed: stripeEventId, result
   - Duplicate: stripeEventId, processed status
   - Failed: stripeEventId, error

5. **Rate Limit Violations**
   - userId, current count, limit, TTL

### Metrics to Track

- `lock_acquisition_duration_ms` (p50, p95, p99)
- `lock_retry_total` (by operation)
- `booking_confirmation_total` (by status)
- `webhook_duplicate_total`
- `rate_limit_exceeded_total`

---

## Failure Modes & Recovery

### 1. Serialization Conflict
- **Symptom**: P2034 or 40001 error
- **Recovery**: Automatic retry (max 3 attempts)
- **User Impact**: Slight latency increase

### 2. Deadlock
- **Symptom**: 40P01 error
- **Recovery**: Automatic retry (max 3 attempts)
- **User Impact**: Slight latency increase

### 3. Lock Expired Before Confirmation
- **Symptom**: "Lock expired" error
- **Recovery**: User must re-lock and retry payment
- **Prevention**: Ensure lock duration > payment flow duration

### 4. Webhook Retry
- **Symptom**: Duplicate Stripe event
- **Recovery**: Idempotent processing (return success)
- **User Impact**: None

### 5. Redis Unavailable
- **Symptom**: Rate limiting fails
- **Recovery**: Throw error (fail-closed)
- **User Impact**: Temporary service unavailability
- **Mitigation**: Redis HA setup

---

## Audit Queries

### Verify Invariant: No BOOKED seats with active locks

```sql
SELECT ss.id, ss.status, sl.id as lock_id, sl.expiresAt
FROM "ShowtimeSeat" ss
JOIN "SeatLock" sl ON sl."showtimeSeatId" = ss.id
WHERE ss.status = 'BOOKED'
  AND sl."expiresAt" > NOW();
-- Should return 0 rows
```

### Verify Invariant: No multiple active locks per seat

```sql
SELECT "showtimeSeatId", COUNT(*) as lock_count
FROM "SeatLock"
WHERE "expiresAt" > NOW()
GROUP BY "showtimeSeatId"
HAVING COUNT(*) > 1;
-- Should return 0 rows
```

### Verify Invariant: All BOOKED seats have confirmed bookings

```sql
SELECT ss.id, ss.status
FROM "ShowtimeSeat" ss
LEFT JOIN "BookingSeat" bs ON bs."showtimeSeatId" = ss.id
LEFT JOIN "Booking" b ON b.id = bs."bookingId"
WHERE ss.status = 'BOOKED'
  AND (b.id IS NULL OR b.status != 'CONFIRMED');
-- Should return 0 rows
```

### Verify Webhook Idempotency: No duplicate processing

```sql
SELECT "stripeEventId", COUNT(*) as event_count
FROM "WebhookEvent"
GROUP BY "stripeEventId"
HAVING COUNT(*) > 1;
-- Should return 0 rows (unique constraint enforces this)
```

---

## Conclusion

These invariants form the foundation of the booking system's correctness. They are enforced through:

1. **Database constraints** (unique, foreign key)
2. **Application logic** (conditional updates, validation)
3. **Transaction isolation** (SERIALIZABLE)
4. **Retry mechanisms** (serialization, deadlock)
5. **Idempotency** (webhook events, booking confirmation)

Any violation of these invariants indicates a bug that must be fixed immediately.

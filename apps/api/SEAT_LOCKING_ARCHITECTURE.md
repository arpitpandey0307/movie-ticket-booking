# Enterprise Seat Locking Architecture

## Overview

This document describes the production-grade seat locking system implemented for the Movie Ticket Booking Platform. This is a **transactional booking engine**, not a CRUD application.

## Core Guarantees

### Correctness
- ✅ No double booking under any concurrency scenario
- ✅ No phantom locks or expired lock leaks
- ✅ No deadlocks via deterministic lock ordering
- ✅ Atomic seat status transitions
- ✅ Defense in depth at every layer

### Performance
- ✅ Batch queries reduce DB round-trips
- ✅ In-memory validation after batch fetch
- ✅ Redis-based rate limiting (horizontal scaling)
- ✅ Optimized for high-concurrency scenarios

### Resilience
- ✅ Automatic retry on serialization conflicts
- ✅ Exponential backoff prevents thundering herd
- ✅ Fail-fast on business logic errors
- ✅ Comprehensive observability logging

## Architecture Components

### 1. Seat Lock Service (`seat-lock.service.ts`)

**Responsibilities:**
- Lock acquisition with concurrency control
- Rate limiting (Redis-based)
- Lock release
- Expired lock cleanup

**Key Features:**
- **Deterministic Lock Ordering**: Sorts seat IDs before acquisition to prevent deadlocks
- **SERIALIZABLE Isolation**: Prevents concurrent modification anomalies
- **Retry Logic**: Handles transient serialization conflicts
- **Idempotency**: Returns existing locks without extending expiration
- **Batch Operations**: Fetches all seats and locks upfront

**Lock Acquisition Flow:**
```
1. Rate limit check (Redis)
2. Sort seat IDs deterministically
3. Retry wrapper (max 3 attempts)
4. SERIALIZABLE transaction:
   a. Batch fetch all seats
   b. Validate all seats AVAILABLE
   c. Batch fetch existing locks
   d. For each seat:
      - If expired lock exists → delete
      - If active lock by same user → return (idempotent)
      - If active lock by other user → reject
      - Otherwise → insert new lock
   e. All locks have same expiration time
5. Commit
```

### 2. Booking Service (`booking.service.ts`)

**Responsibilities:**
- Create PENDING bookings
- Confirm bookings after payment
- Cancel bookings
- Query user bookings

**Key Features:**
- **No Nested Transactions**: Each service method is a top-level transaction
- **Conditional Updates**: Only updates seats with `status: 'AVAILABLE'` guard
- **Set Equality Validation**: Verifies exact lock correspondence
- **Batch Operations**: Updates/deletes all seats/locks in single queries

**Booking Confirmation Flow:**
```
1. Retry wrapper (serialization conflicts)
2. SERIALIZABLE transaction:
   a. Fetch booking with seats
   b. Batch fetch all locks
   c. Validate lock count matches
   d. Validate set equality (every lock belongs to booking)
   e. Validate ownership and expiration
   f. Conditional update: WHERE status = 'AVAILABLE'
   g. Verify update count matches expected
   h. Batch delete locks
   i. Update booking status to CONFIRMED
3. Commit
```

### 3. Retry Utility (`retry.ts`)

**Responsibilities:**
- Wrap SERIALIZABLE transactions
- Retry only serialization errors
- Exponential backoff
- Observability logging

**Retry Logic:**
```typescript
for (attempt = 1; attempt <= 3; attempt++) {
  try {
    return await operation();
  } catch (error) {
    if (isSerializationError && attempt < max) {
      log.warn('Serialization conflict - retrying');
      await sleep(10 * 2^(attempt-1)); // 10ms, 20ms, 40ms
      continue;
    }
    if (isBusinessError) {
      throw immediately; // No retry
    }
    throw error;
  }
}
```

### 4. Redis Client (`redis.ts`)

**Responsibilities:**
- Connection management
- Retry strategy
- Error handling

**Rate Limiting:**
```typescript
// Sliding window: 30 attempts per 10 minutes
key = `lock_rate:${userId}`
current = INCR key
if current == 1:
  EXPIRE key 600
if current > 30:
  reject
```

## Concurrency Control Mechanisms

### 1. Deadlock Prevention
**Problem**: User A locks [1,2], User B locks [2,1] → deadlock

**Solution**: Sort seat IDs before acquisition
```typescript
const sortedIds = [...showtimeSeatIds].sort();
```

### 2. Serialization Conflicts
**Problem**: Two transactions read same state, both commit → inconsistency

**Solution**: SERIALIZABLE isolation + retry
```typescript
await prisma.$transaction(async (tx) => {
  // ...
}, { isolationLevel: 'Serializable' });
```

### 3. Expired Lock Races
**Problem**: Two transactions both see expired lock, both try to delete/insert

**Solution**: Delete expired lock inside transaction, rely on SERIALIZABLE to serialize access

### 4. Double Booking
**Problem**: Seat booked between lock validation and confirmation

**Solution**: Conditional update with count verification
```typescript
const result = await tx.showtimeSeat.updateMany({
  where: { id: { in: ids }, status: 'AVAILABLE' },
  data: { status: 'BOOKED' }
});
if (result.count !== ids.length) throw new Error('Already booked');
```

### 5. Lock Extension Abuse
**Problem**: User keeps refreshing lock, blocks seat indefinitely

**Solution**: Return existing lock WITHOUT extending expiration
```typescript
if (existing.userId === userId) {
  return existing; // No expiration update
}
```

## Observability & Metrics

### Logged Events
- ✅ Seat lock acquisition success
- ✅ Serialization retry attempts (with backoff)
- ✅ Rate limit violations
- ✅ Booking confirmation success
- ✅ Lock expiration before confirmation
- ✅ Expired lock cleanup

### Recommended Metrics
```
seat_lock_attempt_total
seat_lock_retry_total
seat_lock_conflict_total
booking_confirmation_fail_total
lock_expired_before_confirmation_total
```

## Configuration

### Environment Variables
```bash
# Lock duration (default: 10 minutes)
SEAT_LOCK_DURATION_MINUTES=10

# Redis connection
REDIS_URL=redis://localhost:6379

# Database
DATABASE_URL=postgresql://...
```

### Constants
```typescript
MAX_SEATS_PER_REQUEST = 10
RATE_LIMIT_WINDOW_SECONDS = 600 (10 minutes)
RATE_LIMIT_MAX_ATTEMPTS = 30
MAX_RETRY_ATTEMPTS = 3
```

## Transaction Boundaries

### Critical Rule: No Nested Transactions

Each service method is a **top-level transaction**. Services do NOT call each other's transactional methods.

**Correct:**
```typescript
// Controller calls service methods independently
await seatLockService.lockSeats(...);
await bookingService.createBooking(...);
// Later: payment webhook
await bookingService.confirmBooking(...);
```

**Incorrect:**
```typescript
// NEVER: Service calling another service's transaction
async confirmBooking() {
  await prisma.$transaction(async (tx) => {
    await seatLockService.releaseLocks(...); // ❌ Nested transaction
  });
}
```

## Testing Strategy

### Unit Tests
- Lock acquisition with available seats
- Lock acquisition with booked seats (should fail)
- Lock acquisition with expired locks (should delete and reacquire)
- Idempotent lock acquisition (same user)
- Rate limiting enforcement
- Booking confirmation with valid locks
- Booking confirmation with expired locks (should fail)
- Conditional update count verification

### Concurrency Tests
- Concurrent lock attempts on same seat
- Concurrent booking confirmations
- Deadlock prevention (reverse order locking)
- Serialization conflict retry
- Lock expiration during confirmation

### Load Tests
- 100 concurrent users locking 10 seats each
- Measure retry rate
- Measure lock acquisition latency
- Verify no double bookings
- Verify no deadlocks

## Performance Characteristics

### Lock Acquisition
- **Best case**: 2 DB queries (batch seat fetch + batch lock fetch)
- **Worst case**: 2 + N queries (N = expired locks to delete)
- **Typical**: 2-3 queries per request

### Booking Confirmation
- **Fixed**: 5 DB queries (fetch booking, fetch locks, update seats, delete locks, update booking)
- **No per-seat loops**

### Rate Limiting
- **Redis overhead**: 2 operations (INCR + EXPIRE or TTL)
- **Latency**: <1ms typical

## Failure Modes & Recovery

### Serialization Conflict
- **Symptom**: Prisma P2034 or PostgreSQL 40001
- **Recovery**: Automatic retry with exponential backoff
- **User Impact**: Transparent (slight latency increase)

### Lock Expired Before Confirmation
- **Symptom**: "Lock expired" error during confirmation
- **Recovery**: User must re-lock seats and retry payment
- **Prevention**: Ensure lock duration > payment flow duration

### Rate Limit Exceeded
- **Symptom**: "Rate limit exceeded" error
- **Recovery**: User waits for TTL expiration
- **Prevention**: Reasonable limits (30 attempts / 10 min)

### Redis Unavailable
- **Symptom**: Rate limiting fails
- **Recovery**: Graceful degradation (allow requests) OR fail-closed (reject requests)
- **Current**: Fail-closed (throws error)

## Future Enhancements

### Optional Improvements
1. **Lua Script for Rate Limiting**: Atomic INCR+EXPIRE
2. **Partial Index on Active Locks**: `WHERE expiresAt > NOW()`
3. **Lock Extension API**: Controlled extension with max limit
4. **Distributed Tracing**: OpenTelemetry integration
5. **Circuit Breaker**: For Redis failures

### Not Recommended
- ❌ Removing SERIALIZABLE isolation (correctness > performance)
- ❌ Allowing lock extension without limits (abuse potential)
- ❌ Caching seat availability (stale data risk)

## Conclusion

This seat locking system implements **systems-level concurrency control** with:
- Mathematical correctness guarantees (SERIALIZABLE)
- Performance optimization (batch queries)
- Resilience (retry logic)
- Observability (structured logging)
- Defense in depth (multiple validation layers)

It is production-ready for real-world load.

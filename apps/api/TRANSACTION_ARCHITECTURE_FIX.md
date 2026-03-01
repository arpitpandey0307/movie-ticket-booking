# Transaction Architecture Fix

## Problem Identified

**Error:** `P2028: Transaction not found. Transaction ID is invalid, refers to an old closed transaction`

**Root Cause:** External I/O (Stripe API call) inside Prisma transaction callback

### Why This Breaks

```typescript
// ❌ WRONG: External I/O inside transaction
await prisma.$transaction(async (tx) => {
  // DB operations
  const paymentIntent = await stripe.paymentIntents.create(...) // External network call
  // More DB operations
})
```

**Problems:**
1. Prisma transactions keep DB connection open
2. Stripe API calls take 200-1000ms (or more)
3. Supabase connection pooler may recycle idle connections
4. Transaction ID becomes invalid → P2028 error

This is **not** a Supabase bug or Stripe bug. It's a **transaction scope violation**.

## Enterprise Rule

**Never perform external API calls inside database transactions.**

Transactions are for database state only. External systems must be called outside them.

## Solution: Three-Phase Pattern

### Phase 1: Validation (DB Transaction - Fast)
```typescript
const validationResult = await prisma.$transaction(async (tx) => {
  // 1. Fetch booking
  // 2. Validate locks
  // 3. Check idempotency
  return { booking };
});
```
✅ Fast, no external I/O

### Phase 2: External I/O (No Transaction)
```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInCents,
  currency: 'usd',
  metadata: { bookingId, userId, ... }
});
```
✅ No DB connection held

### Phase 3: Persist (DB Transaction - Fast)
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Store payment record
  // 2. Link to booking
});
```
✅ Fast, atomic

## Architecture Comparison

### Before (Incorrect)
```
DB transaction
  ├── Validate booking
  ├── Stripe API call (200-1000ms) ⛔
  └── Store payment
```

### After (Correct)
```
DB transaction (validate)
  ↓
Stripe API call (no transaction)
  ↓
DB transaction (persist)
```

## Test Results

### Before Fix
```
❌ Phase 5: P2028 Transaction not found error
```

### After Fix
```
✅ Phase 1: User created
✅ Phase 2: Found showtime with 2 available seats
✅ Phase 3: Locked 2 seats
✅ Phase 4: Booking created (PENDING)
✅ Phase 5: Payment intent created (NO P2028 ERROR!)
✅ Phase 6: Payment confirmed in Stripe
```

## Why This Matters

Under production load:
- Behind connection poolers (Supabase, PgBouncer)
- With slow Stripe responses
- With concurrent requests

**Without this fix:**
- Random transaction failures
- Payment records missing
- Inconsistent state
- Financial data loss

**With this fix:**
- Reliable payment creation
- No connection timeout issues
- Production-ready architecture

## Files Modified

- `apps/api/src/services/payment.service.ts` - Refactored `createPaymentIntent()` to three-phase pattern

## Related Documentation

- `SEAT_LOCKING_ARCHITECTURE.md` - Locking mechanism
- `PAYMENT_EDGE_CASES.md` - Edge case handling
- `SYSTEM_INVARIANTS.md` - Financial invariants

## Status

✅ **Transaction boundary issue RESOLVED**
✅ **Payment intent creation working without P2028 errors**
✅ **Architecture follows enterprise best practices**

Next: Webhook processing validation

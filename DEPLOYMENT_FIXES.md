# Railway Deployment Fixes

## Issues Fixed

### 1. TypeScript Build Errors ✅

**Problem:** Railway build was failing with TypeScript errors

**Errors Fixed:**
- `Property 'id' does not exist on type 'JwtPayload'`
- `Type 'string' is not assignable to parameter of type '"ADMIN" | "THEATER_OWNER" | "USER"'`
- `No overload matches this call` for jwt.sign
- `Type 'number' is not assignable to type 'never'` in seat-lock service

**Solutions:**
1. Updated `JwtPayload` interface to include `id` field
2. Changed `role` type from `string` to union type `'ADMIN' | 'THEATER_OWNER' | 'USER'`
3. Added type assertions for `JWT_SECRET` and `JWT_EXPIRES_IN`
4. Updated auth service to include `id` in JWT payload
5. Removed unsupported `take` parameter from `deleteMany` in seat-lock service

**Files Modified:**
- `apps/api/src/utils/jwt.ts`
- `apps/api/src/services/auth.service.ts`
- `apps/api/src/services/seat-lock.service.ts`

### 2. Environment Variable Requirements ✅

**Problem:** Server failing to start due to missing environment variables

**Changes:**
- Made `STRIPE_SECRET_KEY` optional (was required)
- Made `STRIPE_WEBHOOK_SECRET` optional (was required in production)
- Made `CORS_ORIGIN` optional (defaults to localhost:3000)
- Kept `DATABASE_URL` and `JWT_SECRET` as required

**Files Modified:**
- `apps/api/src/lib/env-validator.ts`
- `apps/api/src/lib/stripe.ts`
- `apps/api/src/services/payment.service.ts`

### 3. Stripe Initialization ✅

**Problem:** Stripe throwing error on startup when key not present

**Solution:**
- Made Stripe initialization conditional
- Returns null if `STRIPE_SECRET_KEY` not set
- Payment service checks for null and returns helpful error
- Logs warning instead of crashing

**Files Modified:**
- `apps/api/src/lib/stripe.ts`
- `apps/api/src/services/payment.service.ts`

## Deployment Checklist

### Minimum Required for API to Start:
- [x] TypeScript builds successfully
- [x] `DATABASE_URL` environment variable (Railway auto-sets this)
- [ ] `JWT_SECRET` environment variable (you need to add this)
- [x] `NODE_ENV=production` (optional but recommended)

### Optional (Can Add Later):
- [ ] `STRIPE_SECRET_KEY` - for payment processing
- [ ] `STRIPE_WEBHOOK_SECRET` - for webhook verification
- [ ] `CORS_ORIGIN` - for web app CORS (defaults to localhost)
- [ ] `REDIS_URL` - for seat locking (falls back gracefully)

## Next Steps

1. **Check Railway Deployment**
   - Go to Railway dashboard
   - Check if API service is building
   - Look for green "Active" status

2. **Add JWT_SECRET**
   - In Railway: API service → Variables tab
   - Add: `JWT_SECRET=your-random-32-char-string`
   - Generate with: `openssl rand -base64 32`

3. **Run Database Migrations**
   ```bash
   # In Railway Console
   npx prisma migrate deploy
   npm run seed
   ```

4. **Test API**
   - Visit: `https://your-api.up.railway.app/health`
   - Should return: `{"status":"healthy",...}`

5. **Configure Web App**
   - Update web app's `NEXT_PUBLIC_API_URL`
   - Point to Railway API URL

6. **Add Stripe (Later)**
   - Get Stripe keys from dashboard
   - Add to Railway variables
   - Redeploy

## Current Status

✅ All TypeScript errors fixed
✅ Environment validation updated
✅ Stripe made optional
✅ Code pushed to GitHub
⏳ Waiting for Railway to rebuild

## Troubleshooting

If deployment still fails:

1. **Check Build Logs** in Railway
   - Look for TypeScript errors
   - Verify dependencies install correctly

2. **Check Deploy Logs**
   - Look for runtime errors
   - Check environment variable errors

3. **Check Application Logs**
   - See if server starts
   - Look for database connection errors

4. **Common Issues:**
   - Missing `JWT_SECRET` → Add in Variables
   - Database not connected → Check PostgreSQL service
   - Port binding → Railway sets `PORT` automatically
   - Redis errors → Ignore if Redis not added (optional)

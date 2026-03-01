# Deployment Guide - Movie Ticket Booking Platform

## Architecture

**Stack:** Vercel (Frontend) + Railway (Backend) + Supabase (Database)

```
Frontend (Next.js) → Vercel
   ↓
Backend (Express) → Railway
   ↓
Database (PostgreSQL) → Supabase (already configured)
```

---

## Prerequisites

1. **Accounts Required:**
   - Vercel account (free tier works)
   - Railway account (free tier works)
   - Supabase account (already have)
   - Stripe account (already have)
   - GitHub account (for deployment)

2. **Repository:**
   - Push code to GitHub
   - Ensure `.env` files are in `.gitignore`

---

## Step 1: Backend Deployment (Railway)

### 1.1 Create New Project
1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select `apps/api` as root directory

### 1.2 Configure Build Settings
```
Root Directory: apps/api
Build Command: npm install && npx prisma generate && npm run build
Start Command: npm start
```

### 1.3 Set Environment Variables

**Required Variables:**
```bash
NODE_ENV=production
PORT=4000

# Database (from Supabase)
DATABASE_URL=postgresql://postgres.xxx:password@aws-xxx.pooler.supabase.com:6543/postgres?pgbouncer=true

# JWT (generate new secret for production)
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_EXPIRES_IN=7d

# Stripe (use LIVE keys for production)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# CORS (will update after Vercel deployment)
CORS_ORIGIN=https://your-app.vercel.app

# Redis (optional - can skip for now)
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
```

### 1.4 Run Database Migrations
After deployment, run in Railway console:
```bash
npx prisma migrate deploy
npx prisma db seed
```

### 1.5 Get Railway URL
- Railway will provide a URL like: `https://your-app.up.railway.app`
- Save this for frontend configuration

---

## Step 2: Frontend Deployment (Vercel)

### 2.1 Create New Project
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import from GitHub
4. Select your repository
5. Configure:
   - Framework Preset: Next.js
   - Root Directory: `apps/web`
   - Build Command: `npm run build`
   - Output Directory: `.next`

### 2.2 Set Environment Variables

```bash
# API URL (from Railway)
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app

# Stripe Publishable Key (use LIVE key for production)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### 2.3 Deploy
- Click "Deploy"
- Vercel will provide URL like: `https://your-app.vercel.app`

### 2.4 Update Backend CORS
Go back to Railway and update:
```bash
CORS_ORIGIN=https://your-app.vercel.app
```

---

## Step 3: Stripe Webhook Configuration

### 3.1 Add Production Webhook Endpoint
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Enter URL: `https://your-app.up.railway.app/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Copy the webhook signing secret (`whsec_xxx`)

### 3.2 Update Railway Environment
```bash
STRIPE_WEBHOOK_SECRET=whsec_xxx_from_stripe_dashboard
```

### 3.3 Test Webhook
Use Stripe CLI or dashboard to send test events:
```bash
stripe trigger payment_intent.succeeded
```

---

## Step 4: Database Setup (Supabase)

### 4.1 Verify Connection
- Supabase is already configured
- Ensure connection pooling is enabled (pgBouncer)
- Current DATABASE_URL should work

### 4.2 Run Migrations (if not done via Railway)
```bash
npx prisma migrate deploy
```

### 4.3 Seed Database
```bash
npx prisma db seed
```

---

## Step 5: Production Checklist

### Security
- [ ] All environment variables set (no defaults)
- [ ] JWT_SECRET is strong random string
- [ ] Stripe LIVE keys configured
- [ ] CORS restricted to frontend domain only
- [ ] No stack traces in production errors
- [ ] Rate limiting enabled

### Functionality
- [ ] User can sign up
- [ ] User can login
- [ ] Movies display correctly
- [ ] Seat selection works
- [ ] Lock countdown timer works
- [ ] Payment flow completes
- [ ] Webhook processes correctly
- [ ] Booking confirmation works
- [ ] Booking history displays

### Monitoring
- [ ] Check Railway logs for errors
- [ ] Check Vercel logs for errors
- [ ] Monitor Stripe webhook delivery
- [ ] Test full user flow end-to-end

---

## Step 6: Custom Domain (Optional)

### Frontend (Vercel)
1. Go to Project Settings → Domains
2. Add custom domain: `yourdomain.com`
3. Follow DNS configuration instructions

### Backend (Railway)
1. Go to Project Settings → Domains
2. Add custom domain: `api.yourdomain.com`
3. Follow DNS configuration instructions

### Update Environment Variables
```bash
# Railway
CORS_ORIGIN=https://yourdomain.com

# Vercel
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Update Stripe Webhook
Change webhook URL to: `https://api.yourdomain.com/api/webhooks/stripe`

---

## Troubleshooting

### CORS Errors
- Verify `CORS_ORIGIN` in Railway matches Vercel URL exactly
- Check for trailing slashes
- Ensure credentials: true is set

### Webhook Signature Verification Fails
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Ensure raw body middleware is before express.json()
- Check webhook endpoint URL is correct

### Database Connection Issues
- Verify DATABASE_URL includes `?pgbouncer=true`
- Check Supabase connection pooling is enabled
- Ensure SSL is configured if required

### Payment Intent Creation Fails
- Verify Stripe keys are LIVE keys (not test)
- Check amount calculation (must be in cents)
- Ensure metadata is properly set

### Lock Expiry Issues
- Verify server time is correct
- Check countdown timer uses server timestamp
- Ensure locks are being created with correct expiry

---

## Environment Variable Summary

### Backend (Railway)
```
NODE_ENV=production
PORT=4000
DATABASE_URL=<supabase-url>
JWT_SECRET=<random-secret>
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
CORS_ORIGIN=https://your-app.vercel.app
```

### Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

---

## Post-Deployment Validation

Run through complete user flow:
1. Sign up new account
2. Browse movies
3. Select showtime
4. Lock seats (verify countdown)
5. Create booking
6. Complete payment
7. Verify booking confirmed
8. Check booking history

**If all steps work → Production ready ✅**

---

## Rollback Plan

If deployment fails:
1. Revert to previous Railway deployment
2. Revert to previous Vercel deployment
3. Check logs for errors
4. Fix issues locally
5. Redeploy

---

## Monitoring & Maintenance

### Logs
- Railway: View logs in dashboard
- Vercel: View logs in dashboard
- Stripe: Monitor webhook delivery

### Alerts
- Set up Railway alerts for errors
- Monitor Stripe webhook failures
- Check database connection health

### Updates
- Test changes locally first
- Deploy to staging (if available)
- Deploy to production
- Monitor for errors

---

## Cost Estimate

- **Vercel:** Free tier (sufficient for MVP)
- **Railway:** ~$5-10/month (with usage)
- **Supabase:** Free tier (sufficient for MVP)
- **Stripe:** Transaction fees only

**Total:** ~$5-10/month for MVP deployment

---

## Next Steps After Deployment

1. Test complete user flow
2. Monitor for errors
3. Gather user feedback
4. Iterate on features
5. Scale as needed

**System is production-ready for real users.**

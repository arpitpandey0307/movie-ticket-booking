# Railway Deployment Setup Guide

## Required Environment Variables

Your Railway API service needs these environment variables to start successfully:

### 1. Database (Auto-configured by Railway)
- `DATABASE_URL` - Automatically set when you add PostgreSQL service

### 2. JWT Authentication (Required)
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

### 3. Stripe Payment (Optional - can add later)
```
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 4. CORS (Optional - defaults to localhost:3000)
```
CORS_ORIGIN=https://your-web-app.up.railway.app
```

### 5. Redis (Optional - for seat locking)
```
REDIS_URL=redis://default:password@host:port
```

### 6. Node Environment
```
NODE_ENV=production
```

## Setup Steps

### Step 1: Add Required Variables
In Railway dashboard:
1. Click on your **API service**
2. Go to **Variables** tab
3. Add these variables:

```
JWT_SECRET=generate-a-random-32-character-string-here
NODE_ENV=production
```

### Step 2: Database Connection
Railway automatically sets `DATABASE_URL` when you:
1. Click **+ New** in your project
2. Select **Database** → **PostgreSQL**
3. Railway will link it to your API service

### Step 3: Run Migrations
Once the API deploys successfully:
1. Go to API service → **Console** tab
2. Run:
```bash
npx prisma migrate deploy
npm run seed
```

### Step 4: Add Optional Variables (Later)
After basic deployment works, add:
- `STRIPE_SECRET_KEY` (for payments)
- `STRIPE_WEBHOOK_SECRET` (for webhook verification)
- `CORS_ORIGIN` (your web app URL)
- `REDIS_URL` (if you add Redis service)

## Troubleshooting

### Build Fails
- Check the **Build Logs** in Railway
- Ensure all TypeScript errors are fixed
- Verify `package.json` has correct build script

### Deployment Fails
- Check **Deploy Logs** for error messages
- Verify `DATABASE_URL` is set
- Verify `JWT_SECRET` is set
- Check that migrations ran successfully

### Server Won't Start
- Go to **Logs** tab to see runtime errors
- Common issues:
  - Missing `JWT_SECRET`
  - Database connection failed
  - Port binding issues (Railway sets `PORT` automatically)

## Current Status

✅ TypeScript build errors fixed
✅ Environment validation updated (STRIPE optional)
⏳ Waiting for Railway deployment

## Next Steps

1. Wait for Railway to rebuild and deploy
2. Check deployment logs for success
3. Add `JWT_SECRET` environment variable
4. Run database migrations
5. Test the API health endpoint
6. Configure web app to use Railway API URL

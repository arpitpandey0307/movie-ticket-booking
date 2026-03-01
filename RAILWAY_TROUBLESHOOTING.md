# Railway Deployment Troubleshooting

## Getting 404 "Application not found"

This error means either:
1. The API hasn't deployed yet
2. The URL is incorrect
3. The deployment failed

### Step 1: Find Your Actual API URL

In Railway Dashboard:
1. Click on your **API service** (not the database)
2. Go to **Settings** tab
3. Scroll to **Domains** section
4. You should see a URL like: `movie-booking-api-production-xxxx.up.railway.app`
5. Copy this URL

### Step 2: Check Deployment Status

In Railway Dashboard:
1. Click on your **API service**
2. Look at the top - should say **"Active"** with green dot
3. If it says **"Building"** or **"Deploying"** - wait for it to finish
4. If it says **"Failed"** or **"Crashed"** - check logs

### Step 3: Check Build Logs

If deployment failed:
1. Click on **Deployments** tab
2. Click on the latest deployment
3. Check **Build Logs** for errors
4. Common issues:
   - TypeScript compilation errors
   - Missing dependencies
   - Build script failures

### Step 4: Check Deploy Logs

If build succeeded but deployment failed:
1. In the deployment view, check **Deploy Logs**
2. Look for error messages
3. Common issues:
   - Missing environment variables
   - Database connection failures
   - Port binding issues

### Step 5: Check Application Logs

If deployment shows "Active" but still getting 404:
1. Go to **Logs** tab (main service view)
2. Look for startup messages
3. Should see:
   ```
   ✅ Environment variables validated
   Database connected
   Server running on port XXXX
   ```

## Common Issues & Solutions

### Issue: "JWT_SECRET environment variable is required"

**Solution:**
1. Go to API service → **Variables** tab
2. Click **+ New Variable**
3. Add:
   - Variable: `JWT_SECRET`
   - Value: Generate with `openssl rand -base64 32` or use any random 32+ char string
4. Click **Add**
5. Railway will auto-redeploy

### Issue: "DATABASE_URL not set"

**Solution:**
1. Make sure you added a PostgreSQL database
2. In Railway project, click **+ New**
3. Select **Database** → **PostgreSQL**
4. Railway will auto-link it to your API service
5. Check API Variables tab - `DATABASE_URL` should appear

### Issue: Build succeeds but app crashes immediately

**Possible causes:**
1. Missing required environment variables
2. Database connection failure
3. Code trying to import missing modules

**Check:**
1. Application Logs for error messages
2. Ensure `DATABASE_URL` and `JWT_SECRET` are set
3. Verify database is running

### Issue: "Cannot find module" errors

**Solution:**
1. Check `package.json` has all dependencies
2. Ensure `node_modules` is not in `.gitignore` (it should be)
3. Railway should install dependencies automatically
4. Check Build Logs for npm install errors

## Testing Your API

Once deployment is successful:

### 1. Test Health Endpoint
```bash
curl https://your-actual-api-url.up.railway.app/health
```

Should return:
```json
{
  "status": "healthy",
  "timestamp": "2024-...",
  "uptime": 123.45
}
```

### 2. Test API Root
```bash
curl https://your-actual-api-url.up.railway.app/api
```

Should return:
```json
{
  "message": "Movie Booking Platform API",
  "version": "1.0.0",
  "status": "running"
}
```

### 3. Run Database Migrations

Once API is running:
1. Go to API service → **Console** tab (or Shell)
2. Run:
```bash
npx prisma migrate deploy
```

3. Then seed the database:
```bash
npm run seed
```

## Still Having Issues?

### Check These:

1. **Railway Service Status**
   - Is the service showing "Active"?
   - Any error indicators?

2. **Environment Variables**
   - `DATABASE_URL` - should be auto-set by Railway
   - `JWT_SECRET` - you must add this manually
   - `NODE_ENV` - optional, set to "production"

3. **Database Service**
   - Is PostgreSQL service running?
   - Is it linked to API service?

4. **GitHub Integration**
   - Is Railway connected to your GitHub repo?
   - Is it watching the correct branch (main)?
   - Did the latest commit trigger a deployment?

### Get Your Railway URLs

Run this in your terminal to see what Railway has deployed:

```bash
# Install Railway CLI (optional)
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Get service info
railway status
```

## Next Steps After Successful Deployment

1. ✅ API is running and responding to /health
2. ✅ Database migrations completed
3. ✅ Database seeded with sample data
4. 🔄 Update web app to use Railway API URL
5. 🔄 Test user registration and login
6. 🔄 Add Stripe keys for payment features

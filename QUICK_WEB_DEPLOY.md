# Quick Web Deployment - Railway

## 🚀 5-Minute Deployment

### Step 1: Create Railway Service (2 min)
1. Go to Railway dashboard: https://railway.app
2. Open your existing project (where API is deployed)
3. Click **"+ New"** → **"GitHub Repo"**
4. Select your repository
5. Railway auto-detects Next.js ✅

### Step 2: Configure Root Directory (30 sec)
1. Go to service **Settings**
2. Set **Root Directory**: `apps/web`
3. Save

### Step 3: Add Environment Variables (1 min)
1. Go to service **Variables**
2. Click **"+ New Variable"**
3. Add these:

```bash
NEXT_PUBLIC_API_URL=https://your-api-service.up.railway.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

**Get your API URL:**
- Go to API service → Settings → Networking → Copy Public Domain

### Step 4: Update API CORS (1 min)
1. Go to your **API service** in Railway
2. Go to **Variables**
3. Update `CORS_ORIGIN`:

```bash
CORS_ORIGIN=https://your-web-app.up.railway.app
```

**Get your Web URL:**
- Go to Web service → Settings → Networking → Copy Public Domain

### Step 5: Deploy! (30 sec)
1. Railway deploys automatically
2. Or click **"Deploy"** button
3. Wait for build to complete (~2-3 minutes)

---

## ✅ Verification Checklist

After deployment, test:
- [ ] Homepage loads
- [ ] Movies display
- [ ] Can sign up/login
- [ ] Can view movie details
- [ ] Can select seats
- [ ] Can create booking
- [ ] No CORS errors in console

---

## 🔧 Quick Fixes

### CORS Error?
Update API's `CORS_ORIGIN` with your web app URL

### API calls fail?
Check `NEXT_PUBLIC_API_URL` is correct

### Build fails?
Check Railway logs and ensure root directory is `apps/web`

---

## 📱 Your Live URLs

After deployment, you'll have:

**Web App:** `https://your-web-app.up.railway.app`
**API:** `https://your-api-service.up.railway.app`

---

## 🎉 Done!

Your movie booking platform is now live!

Share your URL and start booking movies! 🍿

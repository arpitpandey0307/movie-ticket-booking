# 🚀 Deploy Your Web App to Railway - RIGHT NOW

## What You Need Before Starting

1. ✅ Railway account (you already have this)
2. ✅ Your API is deployed on Railway
3. ✅ Your code is pushed to GitHub/GitLab
4. ⚠️ Your API URL from Railway (find it in your API service dashboard)

## Step-by-Step Deployment (10 minutes)

### Step 1: Create New Service in Railway

1. Go to your Railway project dashboard
2. Click **+ New** button
3. Select **GitHub Repo** (or GitLab)
4. Choose your repository
5. Railway will detect it's a monorepo

### Step 2: Configure the Service

In the service settings:

1. **Root Directory**: Set to `apps/web`
   - Click on the service
   - Go to **Settings** tab
   - Find **Root Directory**
   - Enter: `apps/web`
   - Click **Save**

2. **Service Name**: Rename to something like `movie-booking-web`
   - In Settings → **Service Name**
   - Enter: `movie-booking-web`

### Step 3: Add Environment Variables

Click on **Variables** tab and add:

```bash
NEXT_PUBLIC_API_URL=https://your-api-service.up.railway.app
```

**Important:** Replace `your-api-service.up.railway.app` with your actual API URL!

To find your API URL:
- Go to your API service in Railway
- Look for the **Domains** section
- Copy the `.up.railway.app` URL

**Optional** (if you have Stripe):
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### Step 4: Deploy!

Railway will automatically start deploying. You'll see:
- ⚙️ Building...
- 📦 Installing dependencies...
- 🔨 Running build...
- 🚀 Deploying...

This takes about 3-5 minutes.

### Step 5: Get Your Web App URL

Once deployed:
1. Go to **Settings** tab
2. Scroll to **Domains** section
3. Click **Generate Domain**
4. Railway will give you a URL like: `https://movie-booking-web.up.railway.app`

### Step 6: Update API CORS Settings

Now that you have your web app URL, update your API:

1. Go to your **API service** in Railway
2. Click **Variables** tab
3. Add or update:
```bash
CORS_ORIGIN=https://your-web-app.up.railway.app
```

4. Replace with your actual web app URL
5. The API will automatically redeploy

### Step 7: Test Your App! 🎉

Visit your web app URL and test:

1. ✅ Homepage loads
2. ✅ Movies are displayed
3. ✅ Can click on a movie
4. ✅ Can sign up / login
5. ✅ Can select seats
6. ✅ Can create a booking

## 🎯 Quick Verification Checklist

Open your web app and check browser console (F12):

- [ ] No CORS errors
- [ ] No 404 errors for API calls
- [ ] Movies load successfully
- [ ] Authentication works
- [ ] Seat selection works

## 🐛 Common Issues & Quick Fixes

### Issue 1: "Failed to fetch" or CORS errors

**Fix:**
- Make sure `CORS_ORIGIN` in API matches your web app URL exactly
- No trailing slash in URLs
- Wait 1-2 minutes for API to redeploy after changing CORS

### Issue 2: Web app shows but no movies

**Fix:**
- Check if API is running: visit `https://your-api.up.railway.app/health`
- Verify `NEXT_PUBLIC_API_URL` is set correctly in web app
- Check browser console for error messages

### Issue 3: Build fails

**Fix:**
- Verify **Root Directory** is set to `apps/web`
- Check build logs in Railway for specific errors
- Make sure your code is pushed to GitHub

### Issue 4: Environment variables not working

**Fix:**
- Ensure they start with `NEXT_PUBLIC_` for Next.js
- Redeploy after adding variables (click **Deploy** button)
- Variables are case-sensitive

## 📝 Your URLs (Fill These In)

```
API URL: https://_____________________.up.railway.app
Web URL: https://_____________________.up.railway.app
```

## 🎬 What's Next?

After successful deployment:

1. **Test thoroughly** - Try all features
2. **Share it** - Send the URL to friends/testers
3. **Monitor** - Check Railway logs for any errors
4. **Optimize** - Add custom domain, analytics, etc.

## 🆘 Need Help?

### Check Logs
- Railway Dashboard → Your Web Service → **Deployments** → Click latest → **View Logs**

### Test API Connection
```bash
curl https://your-api.up.railway.app/health
```

Should return: `{"status":"ok"}`

### Check Environment Variables
- Railway Dashboard → Web Service → **Variables** tab
- Verify `NEXT_PUBLIC_API_URL` is correct

---

## 🎉 Success!

Once everything works, you have a fully deployed movie booking platform!

**Your live URLs:**
- 🌐 Web App: `https://your-web-app.up.railway.app`
- 🔌 API: `https://your-api.up.railway.app`

Share it with the world! 🎬🍿

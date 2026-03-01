# 🚀 Deploy Web App NOW - Simple Steps

Your web app is **100% ready** for deployment! Follow these exact steps.

## ✅ Pre-Deployment Checklist

- [x] Web app code is ready
- [x] Railway configuration exists
- [x] Environment variables documented
- [x] Build scripts configured
- [ ] Code pushed to GitHub/GitLab
- [ ] Railway account ready
- [ ] API URL from Railway

---

## 🎯 Deployment Steps (10 Minutes)

### Step 1: Push Your Code (if not already done)

```bash
git add .
git commit -m "Ready for web app deployment"
git push origin main
```

### Step 2: Create Railway Service

1. Go to https://railway.app
2. Open your existing project (where your API is)
3. Click **+ New** button
4. Select **GitHub Repo** (or your git provider)
5. Choose your repository
6. Railway will start creating the service

### Step 3: Configure Root Directory

**IMPORTANT:** Railway needs to know this is a monorepo!

1. Click on the new service
2. Go to **Settings** tab
3. Find **Root Directory** section
4. Enter: `apps/web`
5. Click outside the box to save

### Step 4: Add Environment Variables

1. Click **Variables** tab
2. Click **+ New Variable**
3. Add this variable:

```
Variable Name: NEXT_PUBLIC_API_URL
Value: https://your-api-service.up.railway.app
```

**To find your API URL:**
- Go to your API service in Railway
- Look at the **Domains** section
- Copy the `.up.railway.app` URL
- Paste it as the value (include `https://`)

**Optional - If you have Stripe:**
```
Variable Name: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
Value: pk_test_your_actual_key
```

4. Click **Add** or **Save**

### Step 5: Trigger Deployment

Railway should automatically deploy. If not:
1. Go to **Deployments** tab
2. Click **Deploy** button

Watch the logs:
- Building... ⚙️
- Installing dependencies... 📦
- Running build... 🔨
- Deploying... 🚀
- Success! ✅

This takes 3-5 minutes.

### Step 6: Generate Domain

1. Go to **Settings** tab
2. Scroll to **Networking** section
3. Click **Generate Domain**
4. Railway gives you: `https://something.up.railway.app`
5. **Copy this URL** - this is your web app!

### Step 7: Update API CORS

Now tell your API to accept requests from your web app:

1. Go to your **API service** in Railway
2. Click **Variables** tab
3. Add or update this variable:

```
Variable Name: CORS_ORIGIN
Value: https://your-web-app.up.railway.app
```

(Use the URL from Step 6)

4. API will automatically redeploy (takes 1-2 minutes)

### Step 8: Test Your Live App! 🎉

Visit your web app URL and test:

1. Open `https://your-web-app.up.railway.app`
2. Homepage should load with movies
3. Try signing up / logging in
4. Click on a movie
5. Try selecting seats
6. Create a test booking

**Open browser console (F12) and check:**
- No red errors
- No CORS errors
- API calls are successful

---

## 🎊 Success Criteria

Your deployment is successful when:

- ✅ Web app loads without errors
- ✅ Movies are displayed on homepage
- ✅ Can sign up and login
- ✅ Can view movie details
- ✅ Can select seats
- ✅ Can create bookings
- ✅ No CORS errors in console
- ✅ All API calls return data

---

## 🐛 Troubleshooting

### Problem: Build Fails

**Check:**
- Root directory is set to `apps/web`
- Look at build logs for specific error
- Verify code builds locally: `npm run build` in `apps/web`

**Fix:**
- Go to Settings → Root Directory → Set to `apps/web`
- Redeploy

### Problem: CORS Errors

**Symptoms:**
- Console shows: "CORS policy blocked"
- API calls fail with CORS error

**Fix:**
1. Go to API service → Variables
2. Check `CORS_ORIGIN` matches your web app URL exactly
3. No trailing slash
4. Wait 1-2 minutes for API to redeploy

### Problem: "Failed to fetch" or API errors

**Check:**
- API is running: visit `https://your-api.up.railway.app/health`
- Should return: `{"status":"ok"}`

**Fix:**
1. Verify `NEXT_PUBLIC_API_URL` in web app variables
2. Make sure it includes `https://`
3. No trailing slash
4. Redeploy web app

### Problem: Environment Variables Not Working

**Fix:**
- Variables must start with `NEXT_PUBLIC_` for Next.js
- After adding variables, redeploy the service
- Check Variables tab to confirm they're saved

### Problem: Page Shows But No Data

**Check:**
1. Open browser console (F12)
2. Look for error messages
3. Check Network tab for failed requests

**Fix:**
- Verify API URL is correct
- Check API is seeded with data
- Verify CORS is configured

---

## 📝 Your Deployment Info

Fill this in as you go:

```
GitHub Repo: _________________________________

API Service:
  Name: _________________________________
  URL:  https://_________________________.up.railway.app

Web Service:
  Name: _________________________________
  URL:  https://_________________________.up.railway.app

Environment Variables Set:
  [x] NEXT_PUBLIC_API_URL
  [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (optional)

API CORS Updated:
  [ ] CORS_ORIGIN set to web app URL
```

---

## 🎬 After Deployment

### Share Your Platform

```
🎉 My Movie Booking Platform is Live!
🌐 https://your-web-app.up.railway.app

Features:
✅ Browse movies
✅ User authentication
✅ Seat selection
✅ Booking system
✅ Responsive design
```

### Optional Enhancements

1. **Custom Domain**
   - Railway Settings → Domains → Add Custom Domain
   - Point your domain to Railway

2. **Analytics**
   - Add Google Analytics
   - Add monitoring tools

3. **Production Stripe**
   - Replace test keys with production keys
   - Set up webhook endpoint

4. **Performance**
   - Enable caching
   - Optimize images
   - Add CDN

---

## 🆘 Still Stuck?

### Check Logs
```
Railway Dashboard → Web Service → Deployments → Latest → View Logs
```

### Test API Directly
```bash
curl https://your-api.up.railway.app/health
curl https://your-api.up.railway.app/api/movies
```

### Verify Environment
```
Railway Dashboard → Web Service → Variables
```

### Common Mistakes
- ❌ Forgot to set root directory to `apps/web`
- ❌ CORS_ORIGIN doesn't match web app URL
- ❌ NEXT_PUBLIC_API_URL missing or wrong
- ❌ API not seeded with data
- ❌ Forgot to redeploy after changing variables

---

## ✅ Final Checklist

Before you celebrate:

- [ ] Web app loads
- [ ] Movies display on homepage
- [ ] Can sign up
- [ ] Can login
- [ ] Can view movie details
- [ ] Can select seats
- [ ] Can create booking
- [ ] Can view bookings
- [ ] No console errors
- [ ] Mobile responsive works

---

## 🎉 You Did It!

Your movie booking platform is now live on the internet!

**Next Steps:**
1. Test thoroughly
2. Share with friends
3. Gather feedback
4. Iterate and improve

**Your Live Platform:**
- 🌐 Web: `https://your-web-app.up.railway.app`
- 🔌 API: `https://your-api.up.railway.app`

Congratulations! 🎬🍿🎊

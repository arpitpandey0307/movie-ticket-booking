# Web App Deployment Checklist

## ✅ Pre-Deployment

- [x] Build passes locally (`npm run build` in apps/web)
- [x] API is deployed and running on Railway
- [ ] Have Railway account ready
- [ ] Repository pushed to GitHub/GitLab
- [ ] Know your API URL from Railway

## 📋 Railway Setup

### 1. Create Service
- [ ] Go to Railway dashboard
- [ ] Open existing project (where API is)
- [ ] Click "+ New" → "GitHub Repo"
- [ ] Select repository
- [ ] Wait for auto-detection

### 2. Configure Service
- [ ] Set Root Directory: `apps/web`
- [ ] Verify Build Command: `npm install && npm run build`
- [ ] Verify Start Command: `npm start`

### 3. Environment Variables

Add these in Railway Variables tab:

```bash
# Required
NEXT_PUBLIC_API_URL=https://[your-api].up.railway.app

# Optional (if using Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_[your_key]
```

**How to get API URL:**
1. Go to API service in Railway
2. Settings → Networking
3. Copy "Public Domain"

### 4. Update API CORS

In your API service variables:

```bash
CORS_ORIGIN=https://[your-web-app].up.railway.app
```

Or allow multiple:
```bash
CORS_ORIGIN=https://[your-web-app].up.railway.app,http://localhost:3000
```

**How to get Web URL:**
1. Go to Web service in Railway
2. Settings → Networking
3. Copy "Public Domain"

## 🚀 Deploy

- [ ] Click "Deploy" or push to connected branch
- [ ] Monitor build logs
- [ ] Wait for deployment to complete (~2-3 min)
- [ ] Note your public URL

## ✅ Post-Deployment Testing

### Basic Functionality
- [ ] Homepage loads without errors
- [ ] Movies display correctly
- [ ] Images load (TMDB images)
- [ ] Navigation works

### Authentication
- [ ] Can access signup page
- [ ] Can create new account
- [ ] Can login with credentials
- [ ] Can logout
- [ ] Protected routes work

### Movie Browsing
- [ ] Can view movie list
- [ ] Can filter by genre
- [ ] Can search movies
- [ ] Can view movie details
- [ ] Showtimes display

### Booking Flow
- [ ] Can select showtime
- [ ] Seat grid loads
- [ ] Can select seats
- [ ] Seat locking works
- [ ] Timer countdown works
- [ ] Can proceed to payment

### API Integration
- [ ] No CORS errors in console
- [ ] API calls succeed
- [ ] Error messages display properly
- [ ] Loading states work

## 🔍 Troubleshooting

### Check if issues occur:

**CORS Errors:**
- [ ] Verify CORS_ORIGIN in API service
- [ ] Ensure it matches web app URL
- [ ] Redeploy API after changes

**API Connection Fails:**
- [ ] Check NEXT_PUBLIC_API_URL is correct
- [ ] Test API directly: `https://[api-url]/health`
- [ ] Check API service is running

**Build Fails:**
- [ ] Check Railway build logs
- [ ] Verify root directory is `apps/web`
- [ ] Check all dependencies in package.json

**Environment Variables Not Working:**
- [ ] Ensure they start with `NEXT_PUBLIC_`
- [ ] Redeploy after adding variables
- [ ] Check Railway logs for actual values

## 📊 Monitoring

After deployment:
- [ ] Check Railway metrics
- [ ] Monitor error logs
- [ ] Test on different devices
- [ ] Test on different browsers

## 🎯 Optional Enhancements

- [ ] Set up custom domain
- [ ] Configure production Stripe keys
- [ ] Set up error tracking (Sentry)
- [ ] Set up analytics
- [ ] Configure CDN for static assets

## 📝 URLs to Save

```
Web App: https://[your-web-app].up.railway.app
API: https://[your-api].up.railway.app
Railway Dashboard: https://railway.app/project/[project-id]
```

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ Web app loads without errors
- ✅ Can sign up and login
- ✅ Can browse movies
- ✅ Can select seats and create bookings
- ✅ No console errors
- ✅ All API calls work

---

**Ready to deploy? Follow the steps above and check them off as you go!**

Need help? Check `WEB_DEPLOYMENT_GUIDE.md` for detailed instructions.

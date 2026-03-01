# Web Deployment Troubleshooting Guide

## Common Issues and Solutions

### 🚫 Issue 1: CORS Errors

**Symptoms:**
- Console shows: `Access to fetch at 'https://api...' from origin 'https://web...' has been blocked by CORS policy`
- API calls fail with network errors
- 401/403 errors on API requests

**Solution:**
1. Go to your API service in Railway
2. Update the `CORS_ORIGIN` environment variable:
```bash
CORS_ORIGIN=https://your-web-app.up.railway.app
```
3. Redeploy the API service
4. Clear browser cache and test again

**Multiple Origins:**
```bash
CORS_ORIGIN=https://your-web-app.up.railway.app,http://localhost:3000
```

---

### 🔌 Issue 2: API Connection Failed

**Symptoms:**
- "Failed to fetch" errors
- Network timeout errors
- API calls return 404

**Solution:**
1. Verify `NEXT_PUBLIC_API_URL` in Railway web service variables
2. Test API directly: `https://your-api.up.railway.app/health`
3. Check API service is running in Railway dashboard
4. Ensure URL doesn't have trailing slash
5. Redeploy web app after fixing

**Correct format:**
```bash
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
```

**Wrong formats:**
```bash
# ❌ No trailing slash
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app/

# ❌ No /api in the URL (routes handle this)
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app/api
```

---

### 🏗️ Issue 3: Build Fails

**Symptoms:**
- Railway build fails
- "Module not found" errors
- TypeScript errors during build

**Solution:**

**Check Root Directory:**
1. Go to Railway web service Settings
2. Verify Root Directory is: `apps/web`
3. Save and redeploy

**Check Dependencies:**
```bash
cd apps/web
npm install
npm run build
```

**Check TypeScript:**
```bash
cd apps/web
npx tsc --noEmit
```

**Common fixes:**
- Ensure all imports are correct
- Check package.json has all dependencies
- Verify tsconfig.json is valid

---

### 🔑 Issue 4: Environment Variables Not Working

**Symptoms:**
- API URL is undefined
- Features that need env vars don't work
- Console shows `undefined` for env variables

**Solution:**

**Client-side variables MUST start with `NEXT_PUBLIC_`:**
```bash
# ✅ Correct
NEXT_PUBLIC_API_URL=https://...

# ❌ Wrong - won't work in browser
API_URL=https://...
```

**After adding variables:**
1. Redeploy the service
2. Hard refresh browser (Ctrl+Shift+R)
3. Check Railway logs to verify variables are set

**Verify in Railway:**
1. Go to service Variables tab
2. Ensure variables are listed
3. Check for typos

---

### 🖼️ Issue 5: Images Not Loading

**Symptoms:**
- Movie posters don't display
- Broken image icons
- Console errors about image domains

**Solution:**

**Check next.config.ts:**
```typescript
images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'image.tmdb.org',
      pathname: '/t/p/**',
    },
  ],
}
```

**If using other image sources, add them:**
```typescript
remotePatterns: [
  {
    protocol: 'https',
    hostname: 'image.tmdb.org',
    pathname: '/t/p/**',
  },
  {
    protocol: 'https',
    hostname: 'your-cdn.com',
    pathname: '/**',
  },
]
```

---

### 🔐 Issue 6: Authentication Not Working

**Symptoms:**
- Can't login
- Token not saved
- Redirects don't work
- "Unauthorized" errors

**Solution:**

**Check CORS credentials:**
Verify API has `credentials: true` in CORS config (already set in your app.ts)

**Check token storage:**
- Open browser DevTools → Application → Local Storage
- Verify token is being saved
- Check token format is valid JWT

**Check API authentication:**
```bash
# Test login directly
curl -X POST https://your-api.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

**Common fixes:**
- Clear browser local storage
- Check API JWT_SECRET is set
- Verify user exists in database

---

### 🎫 Issue 7: Booking Flow Broken

**Symptoms:**
- Can't select seats
- Seat locks don't work
- Timer doesn't countdown
- Payment fails

**Solution:**

**Check Redis connection:**
1. Verify API has Redis configured
2. Check Railway Redis service is running
3. Test seat lock endpoint:
```bash
curl https://your-api.up.railway.app/api/seat-locks
```

**Check Stripe configuration:**
1. Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
2. Verify API has `STRIPE_SECRET_KEY` set
3. Check Stripe webhook is configured

**Check database:**
1. Verify showtimes exist
2. Check seats are properly seeded
3. Test booking creation directly via API

---

### 🐌 Issue 8: Slow Performance

**Symptoms:**
- Pages load slowly
- API calls take long time
- Images load slowly

**Solution:**

**Check Railway metrics:**
1. Go to service Metrics tab
2. Check CPU and memory usage
3. Consider upgrading plan if needed

**Optimize images:**
- Use Next.js Image component (already implemented)
- Ensure images are properly sized
- Consider using CDN

**Optimize API calls:**
- Check for unnecessary API calls
- Implement proper caching
- Use loading states

**Check database queries:**
- Review slow queries in Railway logs
- Add indexes if needed
- Optimize Prisma queries

---

### 📱 Issue 9: Mobile Issues

**Symptoms:**
- Layout broken on mobile
- Touch events don't work
- Responsive design issues

**Solution:**

**Test responsive design:**
1. Open DevTools
2. Toggle device toolbar
3. Test different screen sizes

**Check viewport meta tag:**
Should be in app/layout.tsx (already set in Next.js)

**Check touch events:**
- Ensure buttons have proper touch targets
- Test on actual mobile device
- Check for hover-only interactions

---

### 🔄 Issue 10: Deployment Stuck

**Symptoms:**
- Build never completes
- Deployment hangs
- Railway shows "Building..." forever

**Solution:**

**Cancel and retry:**
1. Go to Deployments tab
2. Click on stuck deployment
3. Click "Cancel Deployment"
4. Click "Redeploy"

**Check build logs:**
1. Look for errors or warnings
2. Check for infinite loops
3. Verify build command is correct

**Check Railway status:**
- Visit https://railway.app/status
- Check for platform issues

**Last resort:**
1. Delete service
2. Create new service
3. Reconfigure from scratch

---

## 🔍 Debugging Tools

### Browser DevTools
```
F12 or Right-click → Inspect
- Console: Check for errors
- Network: Check API calls
- Application: Check local storage
```

### Railway Logs
```
Railway Dashboard → Service → Deployments → View Logs
```

### Test API Health
```bash
curl https://your-api.up.railway.app/health
```

### Test CORS
```bash
curl -H "Origin: https://your-web-app.up.railway.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS \
  https://your-api.up.railway.app/api/movies
```

---

## 📞 Getting Help

If issues persist:

1. **Check Railway Logs:** Most issues show up in logs
2. **Check Browser Console:** Client-side errors appear here
3. **Test API Independently:** Isolate API vs frontend issues
4. **Review Documentation:** 
   - Railway: https://docs.railway.app
   - Next.js: https://nextjs.org/docs
5. **Check Railway Status:** https://railway.app/status

---

## ✅ Quick Diagnostic Checklist

Run through this when troubleshooting:

- [ ] API service is running
- [ ] Web service is running
- [ ] CORS_ORIGIN is correct in API
- [ ] NEXT_PUBLIC_API_URL is correct in web
- [ ] Root directory is `apps/web`
- [ ] Environment variables are set
- [ ] Build completed successfully
- [ ] No errors in Railway logs
- [ ] No errors in browser console
- [ ] Can access both URLs directly

---

**Still stuck? Double-check the deployment guide and ensure all steps were followed correctly.**

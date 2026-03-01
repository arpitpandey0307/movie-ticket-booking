# Next.js Web App Deployment Guide - Railway

## Overview
This guide walks you through deploying the Next.js frontend to Railway and connecting it to your deployed API.

## Prerequisites
- Railway account (https://railway.app)
- Your API already deployed on Railway
- Git repository pushed to GitHub/GitLab

## Step 1: Create New Railway Service

1. Go to your Railway dashboard
2. Open your existing project (where your API is deployed)
3. Click **"+ New"** → **"GitHub Repo"** or **"Empty Service"**
4. If using GitHub:
   - Select your repository
   - Railway will auto-detect it's a Next.js app
5. If using Empty Service:
   - You'll connect the repo in the next step

## Step 2: Configure Build Settings

Railway should auto-detect Next.js, but verify these settings:

### Root Directory
```
apps/web
```

### Build Command
```
npm install && npm run build
```

### Start Command
```
npm start
```

### Install Command (if needed)
```
npm install
```

## Step 3: Set Environment Variables

In your Railway web service settings, add these environment variables:

### Required Variables

```bash
# API URL - Use your deployed API URL from Railway
NEXT_PUBLIC_API_URL=https://your-api-service.up.railway.app

# Stripe Publishable Key (if using Stripe)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### How to Get Your API URL:
1. Go to your API service in Railway
2. Click on the service
3. Go to **Settings** → **Networking**
4. Copy the **Public Domain** URL
5. Use this URL for `NEXT_PUBLIC_API_URL`

## Step 4: Configure CORS on API

Your API needs to allow requests from your web app domain.

1. Go to your API service in Railway
2. Add/update the `CORS_ORIGIN` environment variable:

```bash
# Replace with your actual Railway web app URL
CORS_ORIGIN=https://your-web-app.up.railway.app
```

Or allow multiple origins:
```bash
CORS_ORIGIN=https://your-web-app.up.railway.app,http://localhost:3000
```

## Step 5: Deploy

1. Railway will automatically deploy when you push to your connected branch
2. Or click **"Deploy"** manually in the Railway dashboard
3. Monitor the build logs for any errors

## Step 6: Verify Deployment

Once deployed, Railway will provide a public URL like:
```
https://your-web-app.up.railway.app
```

### Test These Features:
1. ✅ Homepage loads with movies
2. ✅ Can view movie details
3. ✅ Can sign up / log in
4. ✅ Can select seats and book tickets
5. ✅ API calls work (check browser console for errors)

## Troubleshooting

### Issue: "Failed to fetch" or CORS errors

**Solution:** Update CORS_ORIGIN in your API service
```bash
CORS_ORIGIN=https://your-web-app.up.railway.app
```

### Issue: Build fails with "Module not found"

**Solution:** Ensure all dependencies are in package.json
```bash
cd apps/web
npm install
```

### Issue: Environment variables not working

**Solution:** 
- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding environment variables
- Check Railway logs for the actual values being used

### Issue: Images not loading

**Solution:** Verify `next.config.ts` has correct image domains:
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

### Issue: API calls return 404

**Solution:** 
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check that API service is running
- Test API directly: `https://your-api.up.railway.app/health`

## Custom Domain (Optional)

To use your own domain:

1. Go to your web service in Railway
2. Click **Settings** → **Networking**
3. Click **"Add Custom Domain"**
4. Follow Railway's instructions to configure DNS

## Monitoring

### View Logs
```
Railway Dashboard → Your Web Service → Deployments → View Logs
```

### Check Build Status
```
Railway Dashboard → Your Web Service → Deployments
```

### Monitor Performance
- Railway provides basic metrics
- Use browser DevTools Network tab to check API response times

## Cost Optimization

Railway free tier includes:
- $5 credit per month
- Shared resources

Tips:
- Use Railway's sleep feature for non-production environments
- Monitor usage in Railway dashboard
- Consider upgrading for production workloads

## Next Steps

After successful deployment:

1. ✅ Test all user flows end-to-end
2. ✅ Set up custom domain (optional)
3. ✅ Configure Stripe for production (if using payments)
4. ✅ Set up monitoring and error tracking
5. ✅ Share your live URL!

## Quick Reference

### Environment Variables Checklist
- [ ] `NEXT_PUBLIC_API_URL` - Your Railway API URL
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe key (if using)
- [ ] API service has correct `CORS_ORIGIN`

### Deployment Checklist
- [ ] Repository connected to Railway
- [ ] Root directory set to `apps/web`
- [ ] Environment variables configured
- [ ] CORS configured on API
- [ ] Build successful
- [ ] Site accessible via Railway URL
- [ ] API calls working
- [ ] Authentication working
- [ ] Booking flow working

## Support

If you encounter issues:
1. Check Railway logs for errors
2. Verify environment variables
3. Test API independently
4. Check browser console for client-side errors
5. Review Railway documentation: https://docs.railway.app

---

**Your movie booking platform is now live! 🎉**

# Deploy Web App to Vercel (Easier Alternative)

Vercel is built for Next.js and will work much better than Railway for the web app.

## Steps:

1. Go to https://vercel.com and sign in with GitHub

2. Click "Add New Project"

3. Import your `movie-ticket-booking` repository

4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: Leave as default
   
5. Add Environment Variable:
   - Click "Environment Variables"
   - Add: `NEXT_PUBLIC_API_URL` = `https://movie-bookingapi-production.up.railway.app`

6. Click "Deploy"

That's it! Vercel will handle everything automatically and your app should work in 2-3 minutes.

Your API is already working fine on Railway, so you just need the web app on Vercel.

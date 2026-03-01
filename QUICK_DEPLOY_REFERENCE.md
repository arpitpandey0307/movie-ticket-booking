# ⚡ Quick Deploy Reference Card

## 🎯 What You Need

1. Railway account
2. Code pushed to GitHub/GitLab
3. Your API URL from Railway

---

## 🚀 Deploy in 5 Steps

### 1️⃣ Create Service
Railway → **+ New** → **GitHub Repo** → Select your repo

### 2️⃣ Set Root Directory
Settings → **Root Directory** → `apps/web`

### 3️⃣ Add Environment Variable
Variables → **+ New Variable**
```
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app
```

### 4️⃣ Generate Domain
Settings → Networking → **Generate Domain**

### 5️⃣ Update API CORS
API Service → Variables → Add/Update
```
CORS_ORIGIN=https://your-web-app.up.railway.app
```

---

## ✅ Test Checklist

- [ ] Homepage loads
- [ ] Movies display
- [ ] Can login/signup
- [ ] Can select seats
- [ ] No CORS errors

---

## 🐛 Quick Fixes

| Problem | Fix |
|---------|-----|
| Build fails | Check root directory = `apps/web` |
| CORS errors | Update API `CORS_ORIGIN` |
| No data | Check `NEXT_PUBLIC_API_URL` |
| Env vars not working | Must start with `NEXT_PUBLIC_` |

---

## 📞 Help

**Check Logs:** Railway → Service → Deployments → View Logs

**Test API:** `curl https://your-api.up.railway.app/health`

**Full Guide:** See `DEPLOY_WEB_NOW.md`

---

## 🎉 Success!

When it works, you'll have:
- 🌐 Live web app
- 🔌 Connected to API
- ✅ Full booking system
- 📱 Mobile responsive

**Share it with the world!** 🎬🍿

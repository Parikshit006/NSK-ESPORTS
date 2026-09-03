# 🚀 NSK-ESPORTS — Production Deployment Guide

This guide describes how to deploy the migrated **NSK-ESPORTS** full-stack application (React 18 + Node.js/Express + MongoDB) to production at zero or minimal cost.

---

## 1. Production Architecture

- **Database:** MongoDB Atlas (Free M0 Sandbox — 512MB, unlimited operations)
- **Backend API:** Render / Railway / DigitalOcean App Platform (Node.js web service)
- **Frontend SPA:** Vercel (Global Edge CDN, automatic SSL)
- **Media CDN:** Cloudinary (Free tier — 25GB bandwidth for tournament banners)

---

## 2. Step 1: Set Up MongoDB Atlas

1. Visit [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free account.
2. Click **Build a Database** ➔ Choose **M0 Free Shared Tier**.
3. Select a region close to your primary audience (e.g. **AWS / Mumbai** or **Singapore**).
4. In **Database Access**, create a user (e.g. `nsk_admin`) with a secure password.
5. In **Network Access**, click **Add IP Address** ➔ Select **Allow Access From Anywhere** (`0.0.0.0/0`).
6. Click **Connect** ➔ **Drivers (Node.js)** ➔ Copy the connection string:
   ```text
   mongodb+srv://nsk_admin:<password>@cluster0.abcde.mongodb.net/nsk_esports?retryWrites=true&w=majority
   ```

---

## 3. Step 2: Deploy Node.js / Express Backend (Render / Railway)

### Using Render (Recommended Free/Low-Cost):
1. Push your repository to GitHub.
2. Go to [render.com](https://render.com) ➔ Click **New Web Service**.
3. Connect your GitHub repository.
4. Set configuration:
   - **Root Directory:** Leave empty
   - **Build Command:** `npm install`
   - **Start Command:** `npm run server`
5. Add Environment Variables in Render:
   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `5000` |
   | `MONGODB_URI` | `mongodb+srv://...` (from Atlas) |
   | `JWT_SECRET` | A secure random 64-char string |
   | `ADMIN_EMAIL` | Organizer email for admin access |
   | `ADMIN_PASSWORD` | Strong initial admin password |
   | `CLIENT_URL` | Your frontend production URL (e.g., `https://nsk-esports.vercel.app`) |
6. Deploy the service and note your Render URL (e.g., `https://nsk-api.onrender.com`).

---

## 4. Step 3: Deploy Frontend (Vercel)

1. Update `vercel.json` to proxy `/api` calls directly to your deployed Express backend:
   ```json
   {
     "rewrites": [
       { "source": "/api/(.*)", "destination": "https://nsk-api.onrender.com/api/$1" },
       { "source": "/(.*)", "destination": "/index.html" }
     ],
     "headers": [
       {
         "source": "/assets/(.*)",
         "headers": [
           { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
         ]
       }
     ]
   }
   ```
2. In Vercel Project Settings ➔ **Environment Variables**:
   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `/api` |
   | `VITE_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
   | `VITE_CLOUDINARY_UPLOAD_PRESET` | Your unsigned upload preset |
3. Deploy to Vercel. All `/api` routes will automatically forward to your Express backend with zero CORS issues!

---

## 5. Step 4: Verification Checklist

- [ ] Healthcheck responds: `https://nsk-api.onrender.com/api/health`
- [ ] Admin login succeeds at `/admin`
- [ ] Tournament creation persists to MongoDB Atlas
- [ ] Team registrations and payment uploads function smoothly
- [ ] Leaderboard auto-refreshes accurately via polling

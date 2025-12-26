# VisaVerse Deployment Guide

Deploy VisaVerse for free using Firebase Hosting (frontend) + Render (backend).

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Firebase (Free Tier)                      │
├─────────────────────────────────────────────────────────────┤
│  Hosting            │  Firestore        │  Authentication   │
│  (Frontend SPA)     │  (Database)       │  (User Auth)      │
│  10GB/month         │  1GB, 50K reads   │  50K MAU          │
└───────────┬─────────┴────────┬──────────┴─────────┬─────────┘
            │                  │                    │
            │                  ▼                    │
            │       ┌──────────────────┐            │
            └──────►│  Render (Free)   │◄───────────┘
                    │  Backend + API   │
                    │  750 hrs/month   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Anthropic API   │
                    │  (Pay per use)   │
                    └──────────────────┘
```

## Free Tier Limits

| Service | Free Tier |
|---------|-----------|
| Firebase Hosting | 10GB storage, 360MB/day transfer |
| Firestore | 1GB storage, 50K reads/day, 20K writes/day |
| Firebase Auth | 50,000 monthly active users |
| Render | 750 hours/month (spins down after 15 min idle) |
| Anthropic | Pay-per-use (~$3/million tokens) |

---

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g., `visaverse-demo`)
3. Disable Google Analytics (optional for demo)
4. Click **Create project**

### 1.2 Enable Services

**Authentication:**
1. Go to **Authentication** → **Get started**
2. Click **Sign-in method** tab
3. Enable **Email/Password**

**Firestore:**
1. Go to **Firestore Database** → **Create database**
2. Select **Start in production mode**
3. Choose a region (e.g., `us-central1`)

### 1.3 Get Firebase Web Config

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to **Your apps** → Click **</>** (Web)
3. Register app name: `visaverse-web`
4. **Copy the config object** - you'll need these values:
   ```javascript
   apiKey: "AIza...",
   authDomain: "your-project.firebaseapp.com",
   projectId: "your-project-id",
   storageBucket: "your-project.appspot.com",
   messagingSenderId: "123456789",
   appId: "1:123456789:web:abc123"
   ```

### 1.4 Generate Service Account Key

1. Go to **Project Settings** → **Service accounts**
2. Click **Generate new private key**
3. Save the JSON file securely (never commit this!)
4. You'll need `client_email` and `private_key` from this file

---

## Step 2: Deploy Backend to Render

### 2.1 Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended for auto-deploy)

### 2.2 Create Web Service

1. Click **New** → **Web Service**
2. Connect your GitHub repository
3. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `visaverse-backend` |
| **Region** | Oregon (US West) or nearest |
| **Branch** | `main` (or your branch) |
| **Root Directory** | `backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | `Free` |

### 2.3 Add Environment Variables

Click **Environment** and add these variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | From service account JSON (`client_email`) |
| `FIREBASE_PRIVATE_KEY` | From service account JSON (`private_key`) - include the `-----BEGIN/END-----` parts |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (`sk-ant-...`) |
| `CORS_ORIGINS` | `https://your-project.web.app` (update after Firebase deploy) |
| `JWT_SECRET` | Generate a random string (e.g., `openssl rand -base64 32`) |

> **Note:** For `FIREBASE_PRIVATE_KEY`, paste the entire key including newlines. Render handles multi-line values correctly.

### 2.4 Deploy

1. Click **Create Web Service**
2. Wait for deployment (2-3 minutes)
3. Copy your URL: `https://visaverse-backend.onrender.com`

> **Note:** Free tier spins down after 15 minutes of inactivity. First request after idle takes 30-60 seconds.

---

## Step 3: Configure Frontend

### 3.1 Create Frontend Environment File

Create `frontend/.env`:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Backend URL (from Render)
VITE_API_URL=https://visaverse-backend.onrender.com
```

### 3.2 Update Firebase Project ID

Edit `.firebaserc` in the project root:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

---

## Step 4: Deploy Frontend to Firebase

### 4.1 Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 4.2 Login to Firebase

```bash
firebase login
```

### 4.3 Build and Deploy

```bash
# From project root
cd frontend
npm install
npm run build
cd ..

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Your site is now live at: `https://your-project.web.app`

### 4.4 Update Render CORS

Go back to Render dashboard and update `CORS_ORIGINS`:

```
https://your-project.web.app,https://your-project.firebaseapp.com
```

---

## Step 5: Deploy Firestore Rules

```bash
# From project root
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Quick Reference Commands

```bash
# Install dependencies
npm run install:all

# Local development
npm run dev:frontend    # http://localhost:3000
npm run dev:backend     # http://localhost:5000

# Run tests
npm run test

# Deploy frontend only
npm run deploy:hosting

# Deploy everything (frontend + Firestore rules)
npm run deploy
```

---

## Troubleshooting

### "Failed to fetch" or CORS Errors

1. Check `CORS_ORIGINS` in Render includes your Firebase URL
2. Ensure both `https://your-project.web.app` AND `https://your-project.firebaseapp.com` are listed
3. Redeploy backend after changing environment variables

### Backend Cold Start (30-60 second delay)

This is normal on Render's free tier. The first request after 15 minutes of inactivity wakes up the server. Options:
- Use a cron job to ping the health endpoint every 14 minutes
- Upgrade to Render's paid tier ($7/month) for always-on

### AI Companion Not Responding

1. Check `ANTHROPIC_API_KEY` is set correctly in Render
2. View Render logs for error messages
3. Verify you have API credits at [console.anthropic.com](https://console.anthropic.com)

### Firebase Auth Errors

1. Verify Email/Password is enabled in Firebase Console
2. Check all `VITE_FIREBASE_*` variables match your project config
3. Ensure authorized domains include your Firebase Hosting URL

### WebSocket/Chat Issues

Render supports WebSockets on free tier. If issues persist:
1. Check browser console for connection errors
2. Verify `VITE_API_URL` doesn't have a trailing slash
3. Check Render logs for Socket.io errors

---

## Updating Your Deployment

### Frontend Changes

```bash
cd frontend && npm run build && cd ..
firebase deploy --only hosting
```

### Backend Changes

Push to GitHub - Render auto-deploys from your connected branch.

### Environment Variable Changes

Update in Render dashboard → **Environment** → Save → **Manual Deploy**

---

## Cost Summary

For a demo/staging site with moderate usage:

| Service | Monthly Cost |
|---------|--------------|
| Firebase (Hosting + Auth + Firestore) | $0 |
| Render (Backend) | $0 |
| Anthropic Claude API | ~$1-5 (usage dependent) |
| **Total** | **~$1-5/month** |

---

## Next Steps

1. **Custom Domain**: Firebase Console → Hosting → Add custom domain
2. **Monitoring**: Check Firebase Console and Render dashboard for usage
3. **Upgrade Path**: When ready for production, consider:
   - Render Starter ($7/mo) - no cold starts
   - Firebase Blaze plan - pay-as-you-go for higher limits

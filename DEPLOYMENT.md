# VisaVerse Deployment Guide

This guide covers deploying VisaVerse to Firebase Hosting (frontend) with a separate backend service.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Firebase Project                          │
├─────────────────────────────────────────────────────────────┤
│  Firebase Hosting     │  Firestore      │  Authentication   │
│  (Frontend SPA)       │  (Database)     │  (User Auth)      │
└───────────┬───────────┴────────┬────────┴─────────┬─────────┘
            │                    │                  │
            │                    ▼                  │
            │         ┌──────────────────┐          │
            └────────►│  Backend Server  │◄─────────┘
                      │  (Cloud Run /    │
                      │   Railway /      │
                      │   Render)        │
                      └────────┬─────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │  Anthropic API   │
                      │  (Claude AI)     │
                      └──────────────────┘
```

## Prerequisites

1. **Firebase CLI** installed: `npm install -g firebase-tools`
2. **Firebase Project** created at [console.firebase.google.com](https://console.firebase.google.com)
3. **Anthropic API Key** for Claude AI companion
4. A backend hosting platform account (Railway, Render, or Google Cloud Run)

---

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" and follow the wizard
3. Enable Google Analytics (optional)

### 1.2 Enable Firebase Services

In your Firebase project, enable:

- **Authentication** → Sign-in method → Email/Password
- **Firestore Database** → Create database (start in production mode)
- **Hosting** → Get started

### 1.3 Get Firebase Configuration

1. Go to Project Settings → General → Your apps
2. Click "Add app" → Web (</>)
3. Register app and copy the config object

### 1.4 Generate Service Account Key

1. Go to Project Settings → Service accounts
2. Click "Generate new private key"
3. Save as `firebase-service-account.json` (keep secure, never commit!)

---

## Step 2: Configure Local Environment

### 2.1 Update .firebaserc

Edit `.firebaserc` in the project root:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

### 2.2 Frontend Environment (.env)

Create `frontend/.env`:

```bash
# Firebase Configuration (from Firebase Console)
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Backend API URL (update after deploying backend)
VITE_API_URL=https://your-backend-url.com
```

### 2.3 Backend Environment (.env)

Create `backend/.env`:

```bash
PORT=5000
NODE_ENV=production

# Firebase Admin (use one method)
# Method 1: Service account file path
FIREBASE_SERVICE_ACCOUNT_KEY=./firebase-service-account.json

# Method 2: Environment variables (preferred for cloud deployment)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Anthropic API
ANTHROPIC_API_KEY=sk-ant-...

# CORS (your Firebase Hosting URL)
CORS_ORIGINS=https://your-project.web.app,https://your-custom-domain.com

# JWT Secret (generate a secure random string)
JWT_SECRET=your-secure-random-string-here
```

---

## Step 3: Deploy Backend

Choose one of these platforms:

### Option A: Railway (Recommended for simplicity)

1. Create account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set root directory to `backend`
5. Add environment variables from Step 2.3
6. Railway auto-detects Node.js and deploys
7. Copy the generated URL (e.g., `https://visaverse-backend.up.railway.app`)

### Option B: Render

1. Create account at [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables
6. Copy the generated URL

### Option C: Google Cloud Run

```bash
# From backend directory
cd backend

# Build and deploy
gcloud run deploy visaverse-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,ANTHROPIC_API_KEY=sk-ant-..."
```

---

## Step 4: Deploy Frontend to Firebase

### 4.1 Update Frontend Environment

Update `frontend/.env` with your deployed backend URL:

```bash
VITE_API_URL=https://your-backend-url.com
```

### 4.2 Build Frontend

```bash
cd frontend
npm install
npm run build
```

### 4.3 Deploy to Firebase Hosting

```bash
# From project root
firebase login
firebase deploy --only hosting
```

Your site will be live at: `https://your-project.web.app`

---

## Step 5: Deploy Firestore Rules & Indexes

```bash
# From project root
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Quick Deploy Commands

```bash
# Full deployment (from project root)
cd frontend && npm run build && cd ..
firebase deploy

# Frontend only
cd frontend && npm run build && cd ..
firebase deploy --only hosting

# Firestore rules only
firebase deploy --only firestore:rules
```

---

## Environment Variables Checklist

### Frontend (Firebase Hosting)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging ID | Yes |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | Yes |
| `VITE_API_URL` | Backend API URL | Yes |

### Backend (Railway/Render/Cloud Run)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (usually auto-set) | No |
| `NODE_ENV` | Set to `production` | Yes |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Yes |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Yes |
| `ANTHROPIC_API_KEY` | Claude API key | Yes |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |

---

## Troubleshooting

### CORS Errors

Ensure `CORS_ORIGINS` in backend includes your Firebase Hosting URL:
```
CORS_ORIGINS=https://your-project.web.app,https://your-project.firebaseapp.com
```

### Firebase Auth Errors

- Check that Email/Password auth is enabled in Firebase Console
- Verify `VITE_FIREBASE_*` variables match your project

### AI Companion Not Working

- Verify `ANTHROPIC_API_KEY` is set correctly
- Check backend logs for Claude API errors

### WebSocket Connection Failed

- Ensure your backend hosting supports WebSocket connections
- Railway and Render support WebSockets by default

---

## Custom Domain (Optional)

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow DNS configuration steps
4. Update `CORS_ORIGINS` in backend to include new domain

---

## Monitoring

- **Firebase Console**: View hosting analytics and Firestore usage
- **Backend Platform**: Check Railway/Render dashboard for logs and metrics
- **Anthropic Console**: Monitor Claude API usage

---

## Security Reminders

- Never commit `.env` files or service account keys
- Use environment variables in production
- Regularly rotate API keys and secrets
- Review Firestore rules for your security requirements

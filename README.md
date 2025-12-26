# VisaVerse

**Feel less alone while moving across the world**

VisaVerse is an AI-powered connection platform that intentionally matches **locals and travelers** based on destination, goals, and reasons for participation. It helps reduce social friction in global mobility by connecting people before and during their journey.

*Built for the VisaVerse AI Hackathon 2025*

## The Concept

Relocating, studying, working, or traveling across borders is not just a logistical challenge — it is a human one. Newcomers often arrive without trusted local connections, cultural context, or a sense of belonging. Meanwhile, many locals want to welcome newcomers but lack a structured way to do so.

VisaVerse uses an AI companion to understand user intent and context, then connects people based on their **destination city or country** for community, professional, or experiential connections.

### Two User Modes

1. **Traveler** - Someone relocating, studying abroad, working, or visiting a new place
2. **Local** - Someone who lives in a city/country and wants to welcome or connect with travelers

All connections are **opt-in, intentional, and explainable**.

## Features

### Destination-Based Matching
- Connect with people headed to or living in your destination
- Country-level matching (required) with optional city-level precision
- Local ↔ Traveler pairing prioritized for complementary connections
- Explainable match reasons ("Same destination", "Aligned goals", etc.)

### AI Companion
- Personal AI that learns about you through natural conversation
- Automatically detects mobility context from chat (destination, mode, goals)
- Builds personality fingerprint for better matching
- 100% private conversations - only aggregated insights used for matching

### Mobility Context
Each user provides structured mobility data:
- **Mode**: LOCAL or TRAVELER
- **Destination**: Country (required), City (optional)
- **Goal**: Make friends, Feel welcome, Help others, Build network, Explore city
- **Connection Intent**: Community, Career, or Experience
- **Reason**: Why traveling or why participating as a local

### Real-time Chat
- Socket.io powered instant messaging
- AI-generated personalized icebreakers based on shared context
- Topic prompts for inactive conversations
- Typing indicators and online status

### Connection Phases
- **Stranger** - Potential AI-matched connections with compatibility scores
- **Connection** - Active conversations with match reasons visible
- **Friend** - Upgraded relationships with extended profile access

### Games
- Two Truths and a Lie
- Twenty Questions
- Word Association

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **AI:** Claude API (Anthropic)
- **Real-time:** Socket.io

## Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React context providers
│   │   ├── pages/           # Page components
│   │   ├── services/        # API and Firebase services
│   │   └── styles/          # CSS and Tailwind config
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── config/          # Firebase and app configuration
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic (Claude, matching)
│   │   ├── scripts/         # Seed and utility scripts
│   │   └── index.js         # Server entry point
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project (with Authentication and Firestore enabled)
- Anthropic API key

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd visa-verse-2025

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Configure Firebase

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Email/Password authentication
3. Create a Firestore database
4. Download your service account key (Project Settings → Service Accounts → Generate New Private Key)
5. Save it as `firebase-service-account.json` in the `backend/` directory

### 3. Set Environment Variables

**Frontend (`frontend/.env`)**
```bash
cd frontend
cp .env.example .env
# Edit .env with your Firebase config from Firebase Console → Project Settings → General
```

Required frontend variables:
```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_URL=http://localhost:5000
```

**Backend (`backend/.env`)**
```bash
cd backend
cp .env.example .env
# Edit .env with your Firebase and Anthropic credentials
```

Required backend variables:
```
PORT=5000
FIREBASE_SERVICE_ACCOUNT_KEY=./firebase-service-account.json
ANTHROPIC_API_KEY=your_anthropic_api_key
CORS_ORIGINS=http://localhost:3000
```

### 4. Seed Test Users (Optional)

```bash
cd backend
node src/scripts/seed.js
```

This creates demo users with pre-configured mobility data for testing.

### 5. Run Locally

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Visit http://localhost:3000

## API Endpoints

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/:userId` - Get user profile by ID
- `PUT /api/users/profile` - Update profile
- `GET /api/users/mobility` - Get mobility context
- `PUT /api/users/mobility` - Update mobility context
- `GET /api/users/friends` - Get friends list
- `GET /api/users/connections` - Get connections list
- `GET /api/users/pending-requests` - Get pending connection requests
- `GET /api/users/sent-requests` - Get sent connection requests

### Companion
- `POST /api/companion/chat` - Chat with AI companion
- `GET /api/companion/history` - Get conversation history
- `GET /api/companion/insights` - Get personality insights
- `POST /api/companion/confirm-interest` - Confirm detected interest
- `POST /api/companion/confirm-mobility` - Confirm detected mobility context

### Matches
- `GET /api/matches` - Get all matches
- `GET /api/matches/suggested` - Get suggested matches (with match reasons)
- `GET /api/matches/:matchId` - Get specific match
- `POST /api/matches/connect` - Connect with user
- `POST /api/matches/decline` - Decline match with feedback
- `POST /api/matches/accept/:matchId` - Accept connection request
- `POST /api/matches/:matchId/friend-request` - Request friendship
- `POST /api/matches/:matchId/remove` - Remove connection
- `POST /api/matches/:matchId/report` - Report user

### Chat
- `GET /api/chat/:matchId` - Get conversation
- `POST /api/chat/:matchId/message` - Send message
- `GET /api/chat/:matchId/icebreakers` - Get AI icebreakers
- `GET /api/chat/:matchId/topic-prompt` - Get topic prompt

### Games
- `POST /api/games/:matchId/start` - Start a game
- `POST /api/games/:matchId/move` - Submit game move
- `GET /api/games/:matchId/state` - Get game state

## The Matching Algorithm

### Required Filters
- **Same destination country** (required)
- City-level match when both users specify a city

### Scoring Boosts
| Factor | Boost |
|--------|-------|
| Local ↔ Traveler match | +12 |
| Same connection intent | +8 |
| Same city | +6 |
| Shared goal | +6 |
| Same travel/local reason | +5 |
| Each shared interest | +3 |

### Explainable Match Reasons
Every match includes human-readable reasons:
- "Local ↔ Traveler match"
- "Same destination: Toronto, Canada"
- "Both interested in: Community connections"
- "Shared goal: Feel welcome"
- "3 shared interests"

## Demo Scenario

1. A traveler says: "I'm moving to Toronto for school."
2. The AI companion gathers destination, goals, and intent.
3. The platform suggests:
   - A local in Toronto who enjoys welcoming newcomers
   - Another traveler arriving around the same time
4. The user sees **why** each match was suggested.
5. A conversation begins — reducing isolation before arrival.

## Deployment

### Frontend (Vercel/Netlify)

```bash
cd frontend
npm run build
# Deploy dist/ folder or connect GitHub repo
```

### Backend (Railway/Render)

1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. Deploy with automatic builds

## Privacy & Safety

- Companion conversations are 100% private
- Only aggregated personality insights used for matching
- No legal, immigration, or visa advice provided
- Reporting and blocking mechanisms supported
- Firebase Auth handles authentication securely
- Rate limiting on all endpoints

## Future Enhancements

- Language-aware matching
- Event-based connections (meetups, group activities)
- Time-bound travel windows
- Partner integrations with relocation platforms

## License

MIT

---

*VisaVerse - Connection infrastructure for a globally mobile world.*

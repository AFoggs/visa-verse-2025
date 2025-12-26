# 3Degrees

**Feel less alone while moving across the world**

3Degrees is an AI-powered connection platform that intentionally matches **locals and travelers** based on destination, goals, and reasons for participation. It helps reduce social friction in global mobility by connecting people before and during their journey.

*Built for the VisaVerse AI Hackathon 2025*

## The Concept

Relocating, studying, working, or traveling across borders is not just a logistical challenge — it is a human one. Newcomers often arrive without trusted local connections, cultural context, or a sense of belonging. Meanwhile, many locals want to welcome newcomers but lack a structured way to do so.

3Degrees uses an AI companion to understand user intent and context, then connects people based on their **destination city or country** for community, professional, or experiential connections.

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
- **Friend** - Upgraded relationships with extended profile access (including photo)

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth
- **AI:** Claude API (Anthropic)
- **Real-time:** Socket.io

## The Matching Algorithm

The matching algorithm uses a multi-factor scoring system that prioritizes **destination alignment** and **complementary roles** (Local ↔ Traveler pairing).

### Hard Filters (Must Pass)

Before any scoring, matches must pass these requirements:

1. **Same destination country** - Both users must be in/going to the same country
2. **Age preference compatibility** - Both users' age preferences must be mutually satisfied
3. **Communication preference compatibility** - Users with conflicting preferences (text-only vs voice-only) are filtered out

### Scoring System

Matches that pass hard filters receive a weighted compatibility score:

#### Mobility Scoring (20% weight, up to 57 base points)

| Factor | Points | Description |
|--------|--------|-------------|
| Same destination country | +20 | Required baseline match |
| Same city | +6 | Bonus when both specify the same city |
| Local ↔ Traveler match | +12 | Complementary role pairing |
| Local-Traveler alignment bonus | +4 to +8 | Extra points based on reason alignment |
| Same connection intent | +8 | Both seeking Community, Career, or Experience |
| Same goal | +6 | Both have matching primary goals |
| Same travel reason | +5 | For Traveler-Traveler matches with same purpose |

#### Local-Traveler Alignment Bonuses

When a Local matches with a Traveler, additional points are awarded based on compatible reasons:

| Local Reason | Traveler Reason | Bonus |
|--------------|-----------------|-------|
| Welcome Others | Any | +6 |
| Professional Network | Career | +8 |
| Community Building | Relocating or School | +6 |
| Cultural Exchange | Not Tourism | +5 |
| Language Practice | Any | +4 |

#### Traditional Compatibility Scores

| Factor | Weight | Description |
|--------|--------|-------------|
| Interest Score | 25% | Jaccard similarity of interests + shared interest bonus |
| Style Score | 20% | Conversational style and energy level compatibility |
| Value Score | 20% | Shared values from personality fingerprint |
| Goal Score | 15% | Keyword matching in "why here" responses |

### Match Prioritization

Final results are sorted by:
1. **Complementary mode first** - Local ↔ Traveler matches appear before same-mode matches
2. **Compatibility score** - Higher scores ranked first

### Explainable Match Reasons

Every match includes up to 3 human-readable reasons:
- "Local ↔ Traveler match"
- "Both in Toronto" or "Same destination: Canada"
- "Community connection" (matching intent)
- "Both looking to make friends" (matching goal)
- "3 shared interests"

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

# Install all dependencies
npm run install:all
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

**Backend (`backend/.env`)**
```bash
cd backend
cp .env.example .env
# Edit .env with your Firebase and Anthropic credentials
```

### 4. Run Locally

```bash
# Terminal 1: Start backend
npm run dev:backend

# Terminal 2: Start frontend
npm run dev:frontend
```

Visit http://localhost:3000

### 5. Run Tests

```bash
# Run all tests
npm test

# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:frontend
```

## API Endpoints

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/:userId` - Get user profile by ID
- `PUT /api/users/profile` - Update profile
- `GET /api/users/mobility` - Get mobility context
- `PUT /api/users/mobility` - Update mobility context
- `GET /api/users/friends` - Get friends list
- `GET /api/users/connections` - Get connections list

### Companion
- `POST /api/companion/chat` - Chat with AI companion
- `GET /api/companion/history` - Get conversation history
- `GET /api/companion/insights` - Get personality insights
- `POST /api/companion/confirm-interest` - Confirm detected interest
- `POST /api/companion/confirm-mobility` - Confirm detected mobility context

### Matches
- `GET /api/matches` - Get all matches
- `GET /api/matches/suggested` - Get suggested matches (with match reasons)
- `POST /api/matches/connect` - Connect with user
- `POST /api/matches/accept/:matchId` - Accept connection request
- `POST /api/matches/:matchId/friend-request` - Request friendship

### Chat
- `GET /api/chat/:matchId` - Get conversation
- `POST /api/chat/:matchId/message` - Send message
- `GET /api/chat/:matchId/icebreakers` - Get AI icebreakers

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions using:
- **Frontend**: Firebase Hosting (free tier)
- **Backend**: Render (free tier)
- **Database**: Firebase Firestore (free tier)

## Privacy & Safety

- Companion conversations are 100% private
- Only aggregated personality insights used for matching
- Profile photos only visible to friends
- No legal, immigration, or visa advice provided
- Reporting and blocking mechanisms supported
- Firebase Auth handles authentication securely
- Rate limiting on all endpoints

## License

MIT

---

*3Degrees - Connection infrastructure for a globally mobile world.*

*Built for the VisaVerse AI Hackathon 2025*

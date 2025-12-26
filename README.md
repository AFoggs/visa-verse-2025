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

### AI Companion with Signal Detection
- Personal AI that learns about you through natural conversation
- **Real-time signal detection** extracts matching-relevant information from conversations:
  - Languages spoken and proficiency levels
  - Activity preferences (indoor/outdoor, group size)
  - Schedule patterns (early bird/night owl)
  - Social style (introvert/ambivert/extrovert)
  - Life stage (student, career, parent, etc.)
  - Cultural interests and curiosity level
  - Expertise areas that could help others
  - Deal breakers and strong preferences
- Builds comprehensive personality fingerprint for better matching
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

The matching algorithm uses a **12-factor scoring system** that combines structured profile data with AI-extracted conversation signals. It prioritizes **destination alignment** and **complementary roles** (Local ↔ Traveler pairing).

### Hard Filters (Must Pass)

Before any scoring, matches must pass these requirements:

1. **Same destination country** - Both users must be in/going to the same country
2. **Age preference compatibility** - Both users' age preferences must be mutually satisfied
3. **Communication preference compatibility** - Users with conflicting preferences (text-only vs voice-only) are filtered out
4. **Deal breaker compatibility** - No conflicting deal breakers detected from conversations

### AI Signal Detection

During conversations with the AI companion, the following signals are automatically detected and stored:

| Signal Type | What's Detected | Example |
|-------------|-----------------|---------|
| **Languages** | Language + proficiency | "I speak Spanish fluently" → `{language: "Spanish", proficiency: "fluent"}` |
| **Activity** | Indoor/outdoor + group size | "I love hiking with small groups" → `{type: "outdoor", groupSize: "small_group"}` |
| **Schedule** | Time preference + availability | "I'm a morning person" → `{type: "early_bird", availability: "flexible"}` |
| **Social Style** | Introvert/ambivert/extrovert | "I need alone time to recharge" → `{type: "introvert"}` |
| **Life Stage** | Current situation | "Just started my first job" → `{stage: "early_career"}` |
| **Cultural** | Curiosity level + interests | "I want to learn local traditions" → `{curiosity: "high", interests: ["traditions"]}` |
| **Expertise** | Skills to share | "I work in tech, happy to help" → `{area: "technology", canHelp: "job hunting"}` |
| **Deal Breakers** | Strong preferences | "I really can't be around smokers" → `{type: "smoking", value: "non-smoker"}` |

### Scoring Dimensions

The algorithm calculates 12 separate scores, each contributing to the final weighted score:

#### Core Matching (48% of total)

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Mobility** | 15% | Destination match, Local↔Traveler pairing, intent alignment |
| **Interests** | 18% | Jaccard similarity of profile interests + shared interest bonus |
| **Language** | 10% | Shared languages weighted by proficiency; language exchange bonus |
| **Values** | 10% | Shared values detected from personality analysis |

#### Conversation-Derived (44% of total)

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Activity** | 8% | Indoor/outdoor alignment + group size preference |
| **Style** | 8% | Conversational style, energy level, humor compatibility |
| **Schedule** | 6% | Early bird/night owl + weekday/weekend availability |
| **Social** | 6% | Introvert/extrovert compatibility + depth preference |
| **Life Stage** | 5% | Same or adjacent life stages (student, career, parent) |
| **Cultural Bridge** | 5% | High-curiosity traveler + cultural-exchange local pairing |
| **Expertise** | 4% | One user has skills the other needs |
| **Goal** | 5% | Keyword matching in "why here" responses |

### Mobility Scoring Details

| Factor | Points | Description |
|--------|--------|-------------|
| Same destination country | +20 | Required baseline match |
| Same city | +6 | Bonus when both specify the same city |
| Local ↔ Traveler match | +12 | Complementary role pairing |
| Local-Traveler alignment bonus | +4 to +8 | Extra points based on reason alignment |
| Same connection intent | +8 | Both seeking Community, Career, or Experience |
| Same goal | +6 | Both have matching primary goals |
| Same travel reason | +5 | For Traveler-Traveler matches with same purpose |

### Language Exchange Bonus

Special scoring for language learning opportunities:

| Scenario | Score Bonus |
|----------|-------------|
| Native + Learning same language | +85 (language exchange opportunity) |
| Both fluent in same language | +80 (easy communication) |
| Both conversational | +60 (can communicate) |
| Shared language at any level | +40 base (common ground) |

### Cultural Bridge Scoring

For Local ↔ Traveler matches:

| Factor | Bonus |
|--------|-------|
| Traveler has high cultural curiosity | +25 |
| Traveler has medium cultural curiosity | +10 |
| Local interested in cultural exchange | +15 |
| Matching cultural interests (food, traditions, etc.) | +5 per shared interest |

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
- "Both speak Spanish" (shared language)
- "Can help with technology" (expertise bridge)

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
- `POST /api/companion/chat` - Chat with AI companion (returns detected signals)
- `GET /api/companion/history` - Get conversation history
- `GET /api/companion/insights` - Get personality insights and detected signals
- `POST /api/companion/confirm-interest` - Confirm detected interest
- `POST /api/companion/confirm-mobility` - Confirm detected mobility context

### Matches
- `GET /api/matches` - Get all matches
- `GET /api/matches/suggested` - Get suggested matches (with match reasons and score breakdown)
- `POST /api/matches/connect` - Connect with user
- `POST /api/matches/accept/:matchId` - Accept connection request
- `POST /api/matches/:matchId/friend-request` - Request friendship

### Chat
- `GET /api/chat/:matchId` - Get conversation
- `POST /api/chat/:matchId/message` - Send message
- `GET /api/chat/:matchId/icebreakers` - Get AI icebreakers (uses detected signals)

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

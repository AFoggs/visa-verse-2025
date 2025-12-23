# 3Degrees

**Connection through AI companionship**

3Degrees is an AI-powered connection platform where users get a personal AI companion that learns about them through conversation, then facilitates meaningful connections with compatible users.

*Built for the VisaVerse AI Hackathon 2025*

## The Concept

Three degrees of separation: **User → Their AI → Other User's AI → Other User**

1. **Stranger** - Potential AI-matched connections
2. **Connection** - Active conversations with AI icebreakers
3. **Friend** - Upgraded relationships with full profile access

## Features

### AI Companion
- Personal AI friend that learns about you through natural conversation
- Builds a personality fingerprint from your chats
- Detects interests and confirms before adding them to your profile
- 100% private conversations - only aggregated insights used for matching

### Smart Matching
- Compatibility scoring based on interests, communication style, values, and goals
- Hard filters for age preferences and geographic location
- Shows shared interests and compatibility percentage
- Feedback collection for continuous improvement

### Real-time Chat
- Socket.io powered instant messaging
- AI-generated personalized icebreakers
- Topic prompts for inactive conversations
- Typing indicators and online status

### Phase Transitions
- **Connection → Friend** triggered by:
  - 3+ conversation sessions
  - 45+ minutes total chat time
  - Mutual "Become Friends?" button click
- Extended profile access unlocked for friends

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
- **Voice:** Web Speech API

## Project Structure

```
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── pages/           # Page components
│   │   ├── services/        # API and Firebase services
│   │   ├── styles/          # CSS and Tailwind config
│   │   └── utils/           # Utility functions
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── config/          # Firebase and app configuration
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic (Claude, matching, socket)
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

### 3. Set Environment Variables

**Frontend (.env)**
```bash
cd frontend
cp .env.example .env
# Edit .env with your Firebase config
```

**Backend (.env)**
```bash
cd backend
cp .env.example .env
# Edit .env with your Firebase and Anthropic credentials
```

### 4. Run Locally

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

### Authentication
- `POST /api/auth/verify` - Verify Firebase token

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/:userId` - Get user profile by ID
- `PUT /api/users/profile` - Update profile
- `GET /api/users/friends` - Get friends list
- `GET /api/users/connections` - Get connections list

### Companion
- `POST /api/companion/chat` - Chat with AI companion
- `GET /api/companion/history` - Get conversation history
- `GET /api/companion/insights` - Get personality insights
- `POST /api/companion/confirm-interest` - Confirm detected interest

### Matches
- `GET /api/matches` - Get all matches
- `GET /api/matches/suggested` - Get suggested matches
- `GET /api/matches/:matchId` - Get specific match
- `POST /api/matches/connect` - Connect with user
- `POST /api/matches/decline` - Decline match
- `POST /api/matches/:matchId/rate` - Rate connection
- `POST /api/matches/:matchId/friend-request` - Request friendship

### Chat
- `GET /api/chat/:matchId` - Get conversation
- `POST /api/chat/:matchId/message` - Send message
- `GET /api/chat/:matchId/icebreakers` - Get AI icebreakers
- `GET /api/chat/:matchId/topic-prompt` - Get topic prompt

### Games
- `POST /api/games/:matchId/start` - Start a game
- `POST /api/games/:matchId/move` - Submit game move
- `GET /api/games/:matchId/state` - Get game state

## Deployment

### Frontend (Vercel)

```bash
cd frontend
npm run build
# Deploy with Vercel CLI or connect GitHub repo
```

### Backend (Railway/Render)

1. Connect your GitHub repository
2. Set environment variables
3. Deploy with automatic builds

## Privacy & Security

- **Companion conversations are 100% private** - Only aggregated personality insights are used for matching
- User passwords handled by Firebase Auth
- JWT token authentication for API requests
- Rate limiting on all endpoints
- Helmet.js security headers

## The Matching Algorithm

```javascript
// Scoring breakdown
Interests:        30% - Shared interests and Jaccard similarity
Communication:    25% - Conversational style and energy level
Values:           25% - Alignment in core values
Goals:            20% - Why they're on the platform

// Hard filters (must pass all)
- Age preference compatibility
- Geographic preference compatibility
- Communication mode compatibility
```

## License

MIT

---

*3Degrees - Making meaningful connections, one conversation at a time.*

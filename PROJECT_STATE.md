# 3Degrees Project State

**Last Updated:** December 25, 2025
**Branch:** `claude/review-session-G0vLA`

---

## 1. Project Overview

**3Degrees** is a social/friendship platform that helps users make meaningful connections based on shared interests, personality compatibility, and communication preferences. It features an AI companion powered by Claude for personalized interactions.

---

## 2. Project Structure

```
visa-verse-2025/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── firebase.js           # Firebase Admin SDK initialization
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.js               # Authentication endpoints
│   │   │   ├── chat.js               # Chat/messaging endpoints
│   │   │   ├── companion.js          # AI Companion chat endpoints
│   │   │   ├── games.js              # Interactive games endpoints
│   │   │   ├── matches.js            # Match/connection management
│   │   │   └── users.js              # User profile endpoints
│   │   ├── scripts/
│   │   │   └── seed.js               # Database seeding script
│   │   ├── services/
│   │   │   ├── claude.js             # Claude AI integration
│   │   │   ├── matching.js           # Compatibility algorithm
│   │   │   └── socket.js             # WebSocket handlers
│   │   └── index.js                  # Express server entry point
│   ├── .env.example
│   ├── firestore.indexes.json
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── games/
│   │   │   │   ├── GameContainer.jsx      # Game wrapper component
│   │   │   │   ├── TwentyQuestionsGame.jsx
│   │   │   │   ├── TwoTruthsGame.jsx
│   │   │   │   └── WouldYouRatherGame.jsx
│   │   │   ├── layout/
│   │   │   │   └── MainLayout.jsx         # App shell with navigation
│   │   │   ├── LocationSearch.jsx         # OpenStreetMap location autocomplete
│   │   │   ├── ProfilePhoto.jsx           # Photo upload with visibility
│   │   │   └── VoiceCall.jsx              # WebRTC voice calling
│   │   ├── context/
│   │   │   ├── AuthContext.jsx            # Firebase auth state
│   │   │   ├── NotificationContext.jsx    # Push notifications
│   │   │   └── SocketContext.jsx          # WebSocket connection
│   │   ├── pages/
│   │   │   ├── Chat.jsx                   # 1:1 messaging view
│   │   │   ├── Companion.jsx              # AI companion chat
│   │   │   ├── Dashboard.jsx              # Home/activity feed
│   │   │   ├── Discover.jsx               # Browse potential matches
│   │   │   ├── Friends.jsx                # Friends & connections list
│   │   │   ├── Landing.jsx                # Public landing page
│   │   │   ├── Login.jsx
│   │   │   ├── Onboarding.jsx             # New user profile setup
│   │   │   ├── Profile.jsx                # User profile view/edit
│   │   │   ├── Register.jsx
│   │   │   └── Settings.jsx
│   │   ├── services/
│   │   │   ├── api.js                     # API client functions
│   │   │   └── firebase.js                # Firebase client config
│   │   ├── styles/
│   │   │   └── index.css                  # Tailwind CSS styles
│   │   ├── App.jsx                        # Route definitions
│   │   └── main.jsx                       # React entry point
│   ├── .env.example
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── README.md
└── PROJECT_STATE.md
```

---

## 3. Key Functionality Implemented

### 3.1 Authentication & User Management
- Firebase Authentication (email/password)
- JWT token verification for API requests
- User profile creation and onboarding flow
- Profile photo upload (Firebase Storage) with friends-only visibility
- Location autocomplete using OpenStreetMap Nominatim API

### 3.2 Matching System
- **Compatibility Algorithm** (`matching.js`):
  - Interest overlap (30% weight)
  - Communication style compatibility (25%)
  - Shared values (25%)
  - Goal alignment (20%)
- **Hard filters**: Age range, geographic preference, communication preference
- **Connection flow**: Pending → Connected → Friends (mutual upgrade)

### 3.3 Messaging & Real-time Features
- Socket.IO for real-time messaging
- Typing indicators
- Message persistence in Firestore
- Global notifications for new messages
- Rate limiting (30 messages/minute per socket)

### 3.4 AI Companion (Claude Integration)
- Personalized companion chat using Claude claude-sonnet-4-20250514
- Dynamic response styles and mood variations
- Automatic interest detection from conversations
- Personality fingerprint analysis
- **Conversation starters**: First-person, concise (<15 words), contextually relevant

### 3.5 Interactive Games
| Game | Description | Status |
|------|-------------|--------|
| Two Truths & a Lie | Players submit statements, guess lies | ✅ Complete |
| Would You Rather | Choose between options, compare | ✅ Complete |
| 20 Questions | One sets topic, other guesses | ✅ Complete |
| Word Association | Chain of related words | ✅ Complete |

### 3.6 Voice Calling
- WebRTC peer-to-peer audio calls
- Socket.IO signaling (offer/answer/ICE)
- Communication preference compatibility check

### 3.7 Profile Features
- 103 total interests (30 primary + 73 additional)
- "Show More" button to load additional interests
- 8 "Looking For" reasons with 3 max selection
- Connection preferences (geographic, age range, communication)
- Limited profile view for non-friends

### 3.8 Safety Features
- Remove connection with reason
- Report user functionality
- Input validation and sanitization
- Rate limiting on API and sockets
- Helmet.js security headers

---

## 4. Current Issues / Known Bugs

| Issue | Severity | Notes |
|-------|----------|-------|
| None currently tracked | - | All recent bugs have been fixed |

### Recently Fixed (This Session)
1. ✅ Conversation starters now first-person and concise
2. ✅ Interests "Show More" no longer shows count
3. ✅ Profile viewable from chat menu for all connections
4. ✅ Header shows profile icon instead of name

---

## 5. Next Steps / Development Roadmap

### Immediate
- [ ] Add unit tests for matching algorithm
- [ ] Implement email verification
- [ ] Add password reset functionality
- [ ] Create admin dashboard for reports

### Short-term
- [ ] Add profile verification badges
- [ ] Implement block user functionality
- [ ] Add conversation search
- [ ] Push notifications (Firebase Cloud Messaging)

### Long-term
- [ ] Video call support
- [ ] Group chat functionality
- [ ] Activity/event suggestions based on shared interests
- [ ] Mobile app (React Native)

---

## 6. Key Code Patterns

### 6.1 API Request Pattern
```javascript
// frontend/src/services/api.js
async function fetchWithAuth(endpoint, options = {}) {
  const token = await getAuthToken();
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) throw new Error('Request failed');
  return response.json();
}
```

### 6.2 Socket Authentication
```javascript
// backend/src/services/socket.js
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const userId = socket.handshake.auth.userId;
  const decodedToken = await auth.verifyIdToken(token);
  if (decodedToken.uid !== userId) {
    return next(new Error('User ID mismatch'));
  }
  socket.userId = decodedToken.uid;
  next();
});
```

### 6.3 Protected Route Pattern
```jsx
// frontend/src/App.jsx
function ProtectedRoute({ children }) {
  const { user, loading, profileComplete } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" />;
  if (!profileComplete) return <Navigate to="/onboarding" />;
  return children;
}
```

### 6.4 Compatibility Calculation
```javascript
// backend/src/services/matching.js
const weightedScore =
  scores.interest * 0.30 +    // Shared interests
  scores.style * 0.25 +       // Communication style
  scores.value * 0.25 +       // Shared values
  scores.goal * 0.20;         // Goal alignment
```

### 6.5 AI Icebreaker Generation
```javascript
// backend/src/services/claude.js
const prompt = `Generate 3 short conversation starters written in FIRST PERSON...
Rules:
- Write in first person ("I", "I'm", "I've")
- Keep each message SHORT (under 15 words)
- Be specific and contextual to their interests
- Sound natural, like a real text message`;
```

---

## 7. Environment Variables

### Backend (`backend/.env`)
```env
# Server
PORT=5000
NODE_ENV=development

# Firebase Admin
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# Security
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=your_jwt_secret
```

### Frontend (`frontend/.env`)
```env
# Firebase Client
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_DATABASE_URL=https://project.firebaseio.com

# Backend
VITE_API_URL=http://localhost:5000
```

---

## 8. Architectural Decisions

### 8.1 Database: Firestore
- **Rationale**: Real-time sync, scalable, integrates with Firebase Auth
- **Collections**: `users`, `matches`, `conversations`

### 8.2 Real-time: Socket.IO
- **Rationale**: Reliable WebSocket with fallback, room-based messaging
- **Usage**: Chat messages, typing indicators, game moves, voice signaling

### 8.3 AI: Claude claude-sonnet-4-20250514
- **Rationale**: Natural conversation, personality analysis, high temperature (0.85-0.9) for variety
- **Usage**: Companion chat, icebreaker generation, topic prompts, personality fingerprinting

### 8.4 Styling: Tailwind CSS
- **Rationale**: Utility-first, dark theme, responsive design
- **Theme**: Custom dark palette with primary (purple/pink gradient) and accent colors

### 8.5 State Management: React Context
- **Rationale**: Simple, built-in, sufficient for current scale
- **Contexts**: AuthContext, SocketContext, NotificationContext

### 8.6 Connection Progression
```
Discovery → Pending Request → Connected → Friends
                 ↓                ↓
            (declined)      (mutual upgrade)
```

### 8.7 Profile Visibility Levels
| Data | Non-friend | Friend |
|------|------------|--------|
| Name, Age, Location | ✅ | ✅ |
| Interests | ✅ | ✅ |
| Preferences | ✅ | ✅ |
| Photo | ❌ | ✅ |
| Bio | ❌ | ✅ |

---

## 9. Running the Project

### Development
```bash
# Backend
cd backend
npm install
cp .env.example .env  # Configure environment variables
npm run dev           # Starts on port 5000

# Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env  # Configure environment variables
npm run dev           # Starts on port 3000
```

### Database Seeding
```bash
cd backend
npm run seed          # Add test users
npm run seed:clear    # Remove test users
npm run seed:reset    # Clear and reseed
```

### Production Build
```bash
cd frontend
npm run build         # Creates dist/ folder
```

---

## 10. Recent Changes (This Session)

| Commit | Description |
|--------|-------------|
| `a448196` | Improve UX: first-person conversation starters, cleaner Show More button, universal profile viewing, header profile icon |

---

## 11. Dependencies

### Backend
- `express` ^4.18.2 - Web framework
- `socket.io` ^4.7.2 - Real-time communication
- `firebase-admin` ^11.11.1 - Firebase server SDK
- `@anthropic-ai/sdk` ^0.32.0 - Claude AI
- `helmet` ^7.1.0 - Security headers
- `express-rate-limit` ^7.1.5 - Rate limiting
- `uuid` ^9.0.1 - Unique IDs

### Frontend
- `react` ^18.2.0 - UI framework
- `react-router-dom` ^6.20.0 - Routing
- `firebase` ^10.7.0 - Firebase client SDK
- `socket.io-client` ^4.7.2 - Socket.IO client
- `framer-motion` ^10.16.4 - Animations
- `lucide-react` ^0.294.0 - Icons
- `tailwindcss` ^3.3.5 - Styling
- `vite` ^5.0.0 - Build tool

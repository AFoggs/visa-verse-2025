// Seed script to create test users for development
// Run with: node src/scripts/seed.js

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, existsSync } from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const backendRoot = join(__dirname, '../..');

dotenv.config({ path: join(backendRoot, '.env') });

// Initialize Firebase
let db;

function initFirebase() {
  try {
    let credential;

    // Try to load from service account JSON file first
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountPath) {
      const fullPath = resolve(backendRoot, serviceAccountPath);
      if (existsSync(fullPath)) {
        console.log(`Loading service account from: ${fullPath}`);
        const serviceAccount = JSON.parse(readFileSync(fullPath, 'utf8'));
        credential = cert(serviceAccount);
      } else {
        console.error(`Service account file not found: ${fullPath}`);
        process.exit(1);
      }
    }
    // Fall back to individual env vars
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      console.log('Using individual Firebase env variables');
      credential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else {
      console.error('Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_KEY or individual env vars.');
      process.exit(1);
    }

    initializeApp({ credential });
    db = getFirestore();
    console.log('Firebase initialized\n');
  } catch (error) {
    console.error('Firebase init error:', error);
    process.exit(1);
  }
}

const TEST_USERS = [
  // Traveler with city - going to Toronto for school
  {
    oderId: 'test-user-alice',
    email: 'alice@test.com',
    profile: {
      name: 'Alice',
      age: 22,
      location: { city: 'San Francisco', country: 'USA' },
      whyHere: 'Studying abroad',
      interests: ['Technology', 'Photography', 'Music', 'Coffee', 'Travel'],
      preferences: {
        geographic: 'global',
        ageRange: 'any',
        communication: 'both',
      },
    },
    mobility: {
      mode: 'TRAVELER',
      area: { country: 'Canada', city: 'Toronto' },
      travelReason: 'SCHOOL',
      localReason: null,
      goal: 'FEEL_WELCOME',
      connectionIntent: 'COMMUNITY',
      updatedAt: new Date(),
    },
    extendedProfile: {
      bio: 'Moving to Toronto for grad school! Looking for locals to show me around and help me settle in.',
      additionalInterests: ['Coding', 'Hiking'],
    },
    companionData: {
      personalityFingerprint: {
        conversationalStyle: 'casual',
        energyLevel: 7,
        humorStyle: 'playful',
        depthPreference: 'moderate',
        values: ['learning', 'connection', 'growth'],
      },
    },
    connections: { strangers: [], connections: [], friends: [] },
    onboardingComplete: true,
  },
  // Local in Toronto - welcoming newcomers
  {
    oderId: 'test-user-bob',
    email: 'bob@test.com',
    profile: {
      name: 'Bob',
      age: 28,
      location: { city: 'Toronto', country: 'Canada' },
      whyHere: 'Welcome newcomers to my city',
      interests: ['Technology', 'Fitness', 'Music', 'Food', 'Hiking'],
      preferences: {
        geographic: 'global',
        ageRange: 'any',
        communication: 'both',
      },
    },
    mobility: {
      mode: 'LOCAL',
      area: { country: 'Canada', city: 'Toronto' },
      travelReason: null,
      localReason: 'WELCOME_OTHERS',
      goal: 'HELP_OTHERS',
      connectionIntent: 'COMMUNITY',
      updatedAt: new Date(),
    },
    extendedProfile: {
      bio: 'Born and raised in Toronto. Love showing newcomers the best spots in the city!',
      additionalInterests: ['Running', 'Local Events'],
    },
    companionData: {
      personalityFingerprint: {
        conversationalStyle: 'energetic',
        energyLevel: 8,
        humorStyle: 'witty',
        depthPreference: 'moderate',
        values: ['community', 'adventure', 'helping'],
      },
    },
    connections: { strangers: [], connections: [], friends: [] },
    onboardingComplete: true,
  },
  // Traveler with country only - relocating to Canada
  {
    oderId: 'test-user-carol',
    email: 'carol@test.com',
    profile: {
      name: 'Carol',
      age: 30,
      location: { city: 'London', country: 'UK' },
      whyHere: 'Relocating permanently',
      interests: ['Reading', 'Art', 'Music', 'Travel', 'Cooking'],
      preferences: {
        geographic: 'global',
        ageRange: 'any',
        communication: 'both',
      },
    },
    mobility: {
      mode: 'TRAVELER',
      area: { country: 'Canada', city: '' },
      travelReason: 'RELOCATING',
      localReason: null,
      goal: 'MAKE_FRIENDS',
      connectionIntent: 'COMMUNITY',
      updatedAt: new Date(),
    },
    extendedProfile: {
      bio: 'Relocating to Canada for a fresh start. Would love to meet locals who can share tips about life there!',
      additionalInterests: ['Writing', 'Museums'],
    },
    companionData: {
      personalityFingerprint: {
        conversationalStyle: 'thoughtful',
        energyLevel: 5,
        humorStyle: 'dry',
        depthPreference: 'deep',
        values: ['culture', 'learning', 'connection'],
      },
    },
    connections: { strangers: [], connections: [], friends: [] },
    onboardingComplete: true,
  },
  // Local in Canada (Vancouver) - professional networking
  {
    oderId: 'test-user-david',
    email: 'david@test.com',
    profile: {
      name: 'David',
      age: 35,
      location: { city: 'Vancouver', country: 'Canada' },
      whyHere: 'Professional networking',
      interests: ['Technology', 'Entrepreneurship', 'Fitness', 'Coffee', 'Networking'],
      preferences: {
        geographic: 'global',
        ageRange: 'any',
        communication: 'both',
      },
    },
    mobility: {
      mode: 'LOCAL',
      area: { country: 'Canada', city: 'Vancouver' },
      travelReason: null,
      localReason: 'PROFESSIONAL_NETWORK',
      goal: 'BUILD_NETWORK',
      connectionIntent: 'CAREER',
      updatedAt: new Date(),
    },
    extendedProfile: {
      bio: 'Tech entrepreneur in Vancouver. Happy to connect with newcomers looking to break into the local tech scene.',
      additionalInterests: ['Startups', 'Investing'],
    },
    companionData: {
      personalityFingerprint: {
        conversationalStyle: 'casual',
        energyLevel: 7,
        humorStyle: 'playful',
        depthPreference: 'moderate',
        values: ['innovation', 'growth', 'connection'],
      },
    },
    connections: { strangers: [], connections: [], friends: [] },
    onboardingComplete: true,
  },
  // Traveler going to Canada for work
  {
    oderId: 'test-user-emma',
    email: 'emma@test.com',
    profile: {
      name: 'Emma',
      age: 27,
      location: { city: 'Sydney', country: 'Australia' },
      whyHere: 'Work or career opportunity',
      interests: ['Technology', 'Yoga', 'Nature', 'Coffee', 'Music'],
      preferences: {
        geographic: 'global',
        ageRange: 'any',
        communication: 'both',
      },
    },
    mobility: {
      mode: 'TRAVELER',
      area: { country: 'Canada', city: 'Vancouver' },
      travelReason: 'CAREER',
      localReason: null,
      goal: 'BUILD_NETWORK',
      connectionIntent: 'CAREER',
      updatedAt: new Date(),
    },
    extendedProfile: {
      bio: 'Moving to Vancouver for a tech job! Looking to meet professionals and explore the city.',
      additionalInterests: ['Wellness', 'Hiking'],
    },
    companionData: {
      personalityFingerprint: {
        conversationalStyle: 'thoughtful',
        energyLevel: 6,
        humorStyle: 'minimal',
        depthPreference: 'moderate',
        values: ['wellness', 'career', 'growth'],
      },
    },
    connections: { strangers: [], connections: [], friends: [] },
    onboardingComplete: true,
  },
];

async function seedUsers() {
  console.log('Seeding test users (Local & Traveler mobility system)...\n');

  for (const user of TEST_USERS) {
    const userId = user.oderId;
    try {
      await db.collection('users').doc(userId).set({
        ...user,
        oderId: undefined,
        userId,
        createdAt: new Date(),
        lastActive: new Date(),
      });
      const modeLabel = user.mobility?.mode || 'N/A';
      const areaLabel = user.mobility?.area?.city
        ? `${user.mobility.area.city}, ${user.mobility.area.country}`
        : user.mobility?.area?.country || 'N/A';
      console.log(`✓ Created ${modeLabel}: ${user.profile.name} → ${areaLabel}`);
    } catch (error) {
      console.error(`✗ Failed to create ${user.profile.name}:`, error.message);
    }
  }

  console.log('\n✓ Seeding complete!');
  console.log('\nTest users created:');
  TEST_USERS.forEach(u => {
    const mode = u.mobility?.mode || 'N/A';
    const area = u.mobility?.area?.city
      ? `${u.mobility.area.city}, ${u.mobility.area.country}`
      : u.mobility?.area?.country || 'N/A';
    console.log(`  - ${u.profile.name} (${mode}) → ${area}`);
    console.log(`    Interests: ${u.profile.interests.join(', ')}`);
  });
}

async function clearTestUsers() {
  console.log('Clearing test users...\n');

  for (const user of TEST_USERS) {
    try {
      await db.collection('users').doc(user.oderId).delete();
      console.log(`✓ Deleted: ${user.profile.name}`);
    } catch (error) {
      console.error(`✗ Failed to delete ${user.profile.name}:`, error.message);
    }
  }

  // Also clear any matches involving test users
  const matchesSnapshot = await db.collection('matches').get();
  for (const doc of matchesSnapshot.docs) {
    const data = doc.data();
    if (data.user1Id?.startsWith('test-user-') || data.user2Id?.startsWith('test-user-')) {
      await doc.ref.delete();
      console.log(`✓ Deleted match: ${doc.id}`);
    }
  }

  console.log('\n✓ Cleanup complete!');
}

async function clearAllMatches() {
  console.log('Clearing all matches and resetting connections...\n');

  // Delete all matches
  const matchesSnapshot = await db.collection('matches').get();
  let matchCount = 0;
  for (const doc of matchesSnapshot.docs) {
    await doc.ref.delete();
    matchCount++;
  }
  console.log(`✓ Deleted ${matchCount} matches`);

  // Reset connections for all users
  const usersSnapshot = await db.collection('users').get();
  let userCount = 0;
  for (const doc of usersSnapshot.docs) {
    await doc.ref.update({
      'connections.strangers': [],
      'connections.connections': [],
      'connections.friends': [],
    });
    userCount++;
  }
  console.log(`✓ Reset connections for ${userCount} users`);

  // Delete all conversations
  const convsSnapshot = await db.collection('conversations').get();
  let convCount = 0;
  for (const doc of convsSnapshot.docs) {
    await doc.ref.delete();
    convCount++;
  }
  console.log(`✓ Deleted ${convCount} conversations`);

  console.log('\n✓ All matches cleared! Discovery should show all users now.');
}

// Main
const command = process.argv[2];

initFirebase();

if (command === 'clear') {
  clearTestUsers().then(() => process.exit(0));
} else if (command === 'reset') {
  clearTestUsers()
    .then(() => seedUsers())
    .then(() => process.exit(0));
} else if (command === 'clear-matches') {
  clearAllMatches().then(() => process.exit(0));
} else {
  seedUsers().then(() => process.exit(0));
}

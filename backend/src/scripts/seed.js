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
  {
    oderId: 'test-user-alice',
    email: 'alice@test.com',
    profile: {
      name: 'Alice',
      age: 25,
      location: { city: 'New York', country: 'USA' },
      whyHere: 'Make new friends',
      interests: ['Technology', 'Gaming', 'Music', 'Movies', 'Travel'],
      preferences: {
        geographic: 'global',
        ageRange: 'any',
        communication: 'both',
      },
    },
    extendedProfile: {
      bio: 'Software developer who loves gaming and exploring new places!',
      additionalInterests: ['Coding', 'Board Games'],
    },
    companionData: {
      personalityFingerprint: {
        conversationalStyle: 'casual',
        energyLevel: 7,
        humorStyle: 'playful',
        depthPreference: 'moderate',
        values: ['creativity', 'connection', 'growth'],
      },
    },
    connections: { strangers: [], connections: [], friends: [] },
    onboardingComplete: true,
  },
  {
    oderId: 'test-user-bob',
    email: 'bob@test.com',
    profile: {
      name: 'Bob',
      age: 28,
      location: { city: 'Los Angeles', country: 'USA' },
      whyHere: 'Find people with similar interests',
      interests: ['Technology', 'Fitness', 'Music', 'Photography', 'Hiking'],
      preferences: {
        geographic: 'global',
        ageRange: 'any',
        communication: 'both',
      },
    },
    extendedProfile: {
      bio: 'Fitness enthusiast and amateur photographer. Love outdoor adventures!',
      additionalInterests: ['Running', 'Nature'],
    },
    companionData: {
      personalityFingerprint: {
        conversationalStyle: 'energetic',
        energyLevel: 8,
        humorStyle: 'witty',
        depthPreference: 'moderate',
        values: ['health', 'adventure', 'creativity'],
      },
    },
    connections: { strangers: [], connections: [], friends: [] },
    onboardingComplete: true,
  },
  {
    oderId: 'test-user-carol',
    email: 'carol@test.com',
    profile: {
      name: 'Carol',
      age: 24,
      location: { city: 'London', country: 'UK' },
      whyHere: 'Meet people from different cultures',
      interests: ['Reading', 'Art', 'Music', 'Travel', 'Cooking'],
      preferences: {
        geographic: 'global',
        ageRange: 'any',
        communication: 'both',
      },
    },
    extendedProfile: {
      bio: 'Book lover and art enthusiast. Always planning my next trip!',
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
  {
    oderId: 'test-user-david',
    email: 'david@test.com',
    profile: {
      name: 'David',
      age: 30,
      location: { city: 'Toronto', country: 'Canada' },
      whyHere: 'Expand my social circle',
      interests: ['Gaming', 'Movies', 'Science', 'Technology', 'Board Games'],
      preferences: {
        geographic: 'global',
        ageRange: 'any',
        communication: 'both',
      },
    },
    extendedProfile: {
      bio: 'Sci-fi nerd and board game collector. Looking for gaming buddies!',
      additionalInterests: ['Anime', 'Podcasts'],
    },
    companionData: {
      personalityFingerprint: {
        conversationalStyle: 'casual',
        energyLevel: 6,
        humorStyle: 'playful',
        depthPreference: 'moderate',
        values: ['fun', 'friendship', 'learning'],
      },
    },
    connections: { strangers: [], connections: [], friends: [] },
    onboardingComplete: true,
  },
  {
    oderId: 'test-user-emma',
    email: 'emma@test.com',
    profile: {
      name: 'Emma',
      age: 26,
      location: { city: 'Sydney', country: 'Australia' },
      whyHere: 'Combat loneliness',
      interests: ['Yoga', 'Meditation', 'Nature', 'Cooking', 'Music'],
      preferences: {
        geographic: 'global',
        ageRange: 'any',
        communication: 'both',
      },
    },
    extendedProfile: {
      bio: 'Yoga instructor finding balance in life. Love meaningful conversations!',
      additionalInterests: ['Wellness', 'Volunteering'],
    },
    companionData: {
      personalityFingerprint: {
        conversationalStyle: 'thoughtful',
        energyLevel: 4,
        humorStyle: 'minimal',
        depthPreference: 'deep',
        values: ['wellness', 'connection', 'growth'],
      },
    },
    connections: { strangers: [], connections: [], friends: [] },
    onboardingComplete: true,
  },
];

async function seedUsers() {
  console.log('Seeding test users...\n');

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
      console.log(`✓ Created user: ${user.profile.name} (${userId})`);
    } catch (error) {
      console.error(`✗ Failed to create ${user.profile.name}:`, error.message);
    }
  }

  console.log('\n✓ Seeding complete!');
  console.log('\nTest users created:');
  TEST_USERS.forEach(u => {
    console.log(`  - ${u.profile.name}: ${u.profile.interests.join(', ')}`);
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

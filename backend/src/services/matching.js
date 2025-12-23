import { getDb } from '../config/firebase.js';

export function calculateCompatibility(user1, user2) {
  // Hard filters first
  if (!passesHardFilters(user1, user2)) {
    return null;
  }

  const scores = {
    interest: calculateInterestScore(user1, user2),      // 30%
    style: calculateStyleScore(user1, user2),             // 25%
    value: calculateValueScore(user1, user2),             // 25%
    goal: calculateGoalScore(user1, user2),               // 20%
  };

  const weightedScore =
    scores.interest * 0.30 +
    scores.style * 0.25 +
    scores.value * 0.25 +
    scores.goal * 0.20;

  return {
    score: Math.round(weightedScore),
    breakdown: scores,
    sharedInterests: getSharedInterests(user1, user2),
  };
}

function passesHardFilters(user1, user2) {
  // Same user check
  if (user1.userId === user2.userId) return false;

  // Age preference check
  const age1 = user1.profile?.age;
  const age2 = user2.profile?.age;

  if (age1 && age2) {
    const pref1 = user1.profile?.preferences?.ageRange;
    const pref2 = user2.profile?.preferences?.ageRange;

    if (!checkAgePreference(age1, age2, pref1) || !checkAgePreference(age2, age1, pref2)) {
      return false;
    }
  }

  // Geographic preference check
  const geo1 = user1.profile?.preferences?.geographic;
  const geo2 = user2.profile?.preferences?.geographic;
  const loc1 = user1.profile?.location;
  const loc2 = user2.profile?.location;

  if (geo1 === 'local' && loc1?.city !== loc2?.city) return false;
  if (geo2 === 'local' && loc2?.city !== loc1?.city) return false;

  if (geo1 === 'regional' && loc1?.country !== loc2?.country) return false;
  if (geo2 === 'regional' && loc2?.country !== loc1?.country) return false;

  // Communication preference check - only filter if both want only one type
  const comm1 = user1.profile?.preferences?.communication;
  const comm2 = user2.profile?.preferences?.communication;

  if ((comm1 === 'text' && comm2 === 'voice') || (comm1 === 'voice' && comm2 === 'text')) {
    return false;
  }

  return true;
}

function checkAgePreference(myAge, theirAge, preference) {
  if (!preference || preference === 'any' || preference === 'unspecified') return true;

  const diff = Math.abs(myAge - theirAge);

  switch (preference) {
    case '±5':
      return diff <= 5;
    case '±10':
      return diff <= 10;
    default:
      return true;
  }
}

function calculateInterestScore(user1, user2) {
  const interests1 = new Set(user1.profile?.interests || []);
  const interests2 = new Set(user2.profile?.interests || []);

  if (interests1.size === 0 || interests2.size === 0) return 50;

  const shared = [...interests1].filter(i => interests2.has(i));
  const total = new Set([...interests1, ...interests2]).size;

  // Jaccard similarity scaled to 100
  const similarity = (shared.length / total) * 100;

  // Bonus for having many shared interests
  const sharedBonus = Math.min(shared.length * 5, 20);

  return Math.min(similarity + sharedBonus, 100);
}

function calculateStyleScore(user1, user2) {
  const fp1 = user1.companionData?.personalityFingerprint;
  const fp2 = user2.companionData?.personalityFingerprint;

  if (!fp1 || !fp2) return 60; // Default score if no fingerprint

  let score = 60;

  // Conversational style compatibility
  const styleCompatibility = {
    casual: { casual: 20, energetic: 15, thoughtful: 10, reserved: 5 },
    energetic: { energetic: 20, casual: 15, thoughtful: 10, reserved: 0 },
    thoughtful: { thoughtful: 20, casual: 10, reserved: 15, energetic: 10 },
    reserved: { reserved: 20, thoughtful: 15, casual: 5, energetic: 0 },
  };

  score += styleCompatibility[fp1.conversationalStyle]?.[fp2.conversationalStyle] || 10;

  // Energy level compatibility (closer is better)
  const energyDiff = Math.abs((fp1.energyLevel || 5) - (fp2.energyLevel || 5));
  score += Math.max(0, 20 - energyDiff * 2);

  return Math.min(score, 100);
}

function calculateValueScore(user1, user2) {
  const values1 = new Set(user1.companionData?.personalityFingerprint?.values || []);
  const values2 = new Set(user2.companionData?.personalityFingerprint?.values || []);

  if (values1.size === 0 || values2.size === 0) return 60;

  const shared = [...values1].filter(v => values2.has(v));

  return 40 + Math.min(shared.length * 20, 60);
}

function calculateGoalScore(user1, user2) {
  const why1 = user1.profile?.whyHere?.toLowerCase() || '';
  const why2 = user2.profile?.whyHere?.toLowerCase() || '';

  if (!why1 || !why2) return 60;

  // Simple keyword matching for goal alignment
  const goalKeywords = {
    friendship: ['friend', 'friendship', 'connect', 'social', 'circle'],
    interests: ['interest', 'hobby', 'similar', 'passion'],
    cultural: ['culture', 'language', 'different'],
    support: ['lonely', 'loneliness', 'support', 'talk'],
    activity: ['activity', 'partner', 'workout', 'game'],
  };

  let matchCount = 0;
  let totalCategories = 0;

  for (const [, keywords] of Object.entries(goalKeywords)) {
    const in1 = keywords.some(k => why1.includes(k));
    const in2 = keywords.some(k => why2.includes(k));

    if (in1 || in2) totalCategories++;
    if (in1 && in2) matchCount++;
  }

  if (totalCategories === 0) return 60;

  return 40 + (matchCount / totalCategories) * 60;
}

function getSharedInterests(user1, user2) {
  const interests1 = new Set(user1.profile?.interests || []);
  const interests2 = new Set(user2.profile?.interests || []);

  return [...interests1].filter(i => interests2.has(i));
}

export async function getSuggestedMatches(userId, limit = 10) {
  const db = getDb();

  try {
    // Get current user
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }
    const currentUser = { userId, ...userDoc.data() };

    // Get existing connections to exclude
    const existingConnections = new Set([
      ...(currentUser.connections?.strangers || []),
      ...(currentUser.connections?.connections || []),
      ...(currentUser.connections?.friends || []),
    ]);

    // Get all potential matches
    const usersSnapshot = await db.collection('users')
      .where('onboardingComplete', '==', true)
      .limit(100)
      .get();

    const potentialMatches = [];

    usersSnapshot.forEach(doc => {
      const userData = { userId: doc.id, ...doc.data() };

      // Skip self and existing connections
      if (userData.userId === userId || existingConnections.has(userData.userId)) {
        return;
      }

      const compatibility = calculateCompatibility(currentUser, userData);

      if (compatibility) {
        potentialMatches.push({
          userId: userData.userId,
          name: userData.profile?.name,
          age: userData.profile?.age,
          location: userData.profile?.location,
          whyHere: userData.profile?.whyHere,
          interests: userData.profile?.interests,
          compatibilityScore: compatibility.score,
          sharedInterests: compatibility.sharedInterests,
          otherInterests: userData.profile?.interests?.filter(
            i => !compatibility.sharedInterests.includes(i)
          ),
        });
      }
    });

    // Sort by compatibility score
    potentialMatches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    return potentialMatches.slice(0, limit);
  } catch (error) {
    console.error('Error getting suggested matches:', error);
    throw error;
  }
}

export default {
  calculateCompatibility,
  getSuggestedMatches,
};

import { getDb } from '../config/firebase.js';

// Helper functions for mobility matching
function getArea(user) {
  return user.mobility?.area || { country: '', city: '' };
}

function sameDestination(a, b) {
  if (!a.country || !b.country) return false;
  if (a.country.toLowerCase() !== b.country.toLowerCase()) return false;

  // If both have cities, check city match
  if (a.city && b.city) {
    return a.city.toLowerCase() === b.city.toLowerCase();
  }
  // Country match is sufficient if city not specified
  return true;
}

function complementaryMode(u1, u2) {
  return (
    (u1.mobility?.mode === 'LOCAL' && u2.mobility?.mode === 'TRAVELER') ||
    (u1.mobility?.mode === 'TRAVELER' && u2.mobility?.mode === 'LOCAL')
  );
}

function localTravelerAlignment(local, traveler) {
  let score = 0;
  const lr = local.mobility?.localReason;
  const tr = traveler.mobility?.travelReason;

  if (!lr || !tr) return score;

  if (lr === 'WELCOME_OTHERS') score += 6;
  if (lr === 'CULTURAL_EXCHANGE' && tr !== 'TOURISM') score += 5;
  if (lr === 'PROFESSIONAL_NETWORK' && tr === 'CAREER') score += 8;
  if (lr === 'LANGUAGE_PRACTICE') score += 4;
  if (lr === 'COMMUNITY_BUILDING' && (tr === 'RELOCATING' || tr === 'SCHOOL')) score += 6;

  return score;
}

export function calculateCompatibility(user1, user2) {
  // Hard filters first
  if (!passesHardFilters(user1, user2)) {
    return null;
  }

  const matchReasons = [];
  let mobilityScore = 0;

  // Check destination matching
  const area1 = getArea(user1);
  const area2 = getArea(user2);

  if (sameDestination(area1, area2)) {
    mobilityScore += 20;
    if (area1.city && area2.city && area1.city.toLowerCase() === area2.city.toLowerCase()) {
      matchReasons.push(`Both in ${area1.city}`);
      mobilityScore += 6; // City match bonus
    } else {
      matchReasons.push(`Same destination: ${area1.country}`);
    }
  }

  // Local ↔ Traveler pairing bonus
  if (complementaryMode(user1, user2)) {
    mobilityScore += 12;
    matchReasons.push('Local ↔ Traveler match');

    // Calculate alignment bonus
    const local = user1.mobility?.mode === 'LOCAL' ? user1 : user2;
    const traveler = user1.mobility?.mode === 'TRAVELER' ? user1 : user2;
    mobilityScore += localTravelerAlignment(local, traveler);
  }

  // Same connection intent
  if (user1.mobility?.connectionIntent &&
      user1.mobility?.connectionIntent === user2.mobility?.connectionIntent) {
    mobilityScore += 8;
    const intentLabels = {
      'COMMUNITY': 'Community connection',
      'CAREER': 'Professional networking',
      'EXPERIENCE': 'Experience sharing',
    };
    matchReasons.push(intentLabels[user1.mobility.connectionIntent] || 'Aligned intent');
  }

  // Same goal
  if (user1.mobility?.goal && user1.mobility?.goal === user2.mobility?.goal) {
    mobilityScore += 6;
    const goalLabels = {
      'MAKE_FRIENDS': 'Both looking to make friends',
      'FEEL_WELCOME': 'Both want to feel welcome',
      'HELP_OTHERS': 'Both want to help others',
      'BUILD_NETWORK': 'Both building networks',
      'EXPLORE_CITY': 'Both want to explore',
    };
    if (matchReasons.length < 3) {
      matchReasons.push(goalLabels[user1.mobility.goal] || 'Aligned goals');
    }
  }

  // Same travel reason (for traveler-traveler matches)
  if (user1.mobility?.mode === 'TRAVELER' && user2.mobility?.mode === 'TRAVELER') {
    if (user1.mobility?.travelReason && user1.mobility.travelReason === user2.mobility?.travelReason) {
      mobilityScore += 5;
      if (matchReasons.length < 3) {
        matchReasons.push('Same travel purpose');
      }
    }
  }

  // Traditional compatibility scores
  const scores = {
    mobility: mobilityScore,
    interest: calculateInterestScore(user1, user2),      // 25%
    style: calculateStyleScore(user1, user2),             // 20%
    value: calculateValueScore(user1, user2),             // 20%
    goal: calculateGoalScore(user1, user2),               // 15%
  };

  // Weighted score - mobility is now the most important factor
  const weightedScore =
    scores.mobility * 0.20 +  // Mobility matching (20% of score, but can add up to 57 base points)
    scores.interest * 0.25 +
    scores.style * 0.20 +
    scores.value * 0.20 +
    scores.goal * 0.15;

  // Add shared interests to reasons if we have room
  const sharedInterests = getSharedInterests(user1, user2);
  if (sharedInterests.length > 0 && matchReasons.length < 3) {
    if (sharedInterests.length === 1) {
      matchReasons.push(`Shared interest: ${sharedInterests[0]}`);
    } else {
      matchReasons.push(`${sharedInterests.length} shared interests`);
    }
  }

  // Ensure we have at least one reason
  if (matchReasons.length === 0) {
    matchReasons.push('Potential connection');
  }

  return {
    score: Math.min(Math.round(weightedScore), 100),
    breakdown: scores,
    sharedInterests,
    matchReasons: matchReasons.slice(0, 3), // Return up to 3 reasons
  };
}

function passesHardFilters(user1, user2) {
  // Same user check
  if (user1.userId === user2.userId) return false;

  // Both users must have mobility data OR we allow legacy matching
  const hasMobility1 = user1.mobility?.mode && user1.mobility?.area?.country;
  const hasMobility2 = user2.mobility?.mode && user2.mobility?.area?.country;

  // If both have mobility, require same destination country
  if (hasMobility1 && hasMobility2) {
    const area1 = getArea(user1);
    const area2 = getArea(user2);
    if (!sameDestination(area1, area2)) {
      return false;
    }
  }

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

  // Geographic preference check (legacy - still applies for users without mobility)
  const geo1 = user1.profile?.preferences?.geographic;
  const geo2 = user2.profile?.preferences?.geographic;
  const loc1 = user1.profile?.location;
  const loc2 = user2.profile?.location;

  // Only apply legacy geographic filter if no mobility data
  if (!hasMobility1 || !hasMobility2) {
    if (geo1 === 'local' && loc1?.city !== loc2?.city) return false;
    if (geo2 === 'local' && loc2?.city !== loc1?.city) return false;

    if (geo1 === 'regional' && loc1?.country !== loc2?.country) return false;
    if (geo2 === 'regional' && loc2?.country !== loc1?.country) return false;
  }

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
    case '±15':
      return diff <= 15;
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

    // Get existing matches (pending or connected) to exclude
    const matches1 = await db.collection('matches')
      .where('user1Id', '==', userId)
      .get();
    const matches2 = await db.collection('matches')
      .where('user2Id', '==', userId)
      .get();

    console.log('Excluding from discovery:', {
      userId,
      existingMatchesAsUser1: matches1.docs.map(d => ({ id: d.id, user2: d.data().user2Id, status: d.data().status })),
      existingMatchesAsUser2: matches2.docs.map(d => ({ id: d.id, user1: d.data().user1Id, status: d.data().status })),
    });

    matches1.forEach(doc => {
      const match = doc.data();
      existingConnections.add(match.user2Id);
    });
    matches2.forEach(doc => {
      const match = doc.data();
      existingConnections.add(match.user1Id);
    });

    console.log('Total excluded users:', existingConnections.size, [...existingConnections]);

    // Get all potential matches
    const usersSnapshot = await db.collection('users')
      .where('onboardingComplete', '==', true)
      .limit(100)
      .get();

    const potentialMatches = [];

    usersSnapshot.forEach(doc => {
      const userData = { userId: doc.id, ...doc.data() };

      // Skip self and existing connections/matches
      if (userData.userId === userId || existingConnections.has(userData.userId)) {
        return;
      }

      // Skip users without a valid profile name
      if (!userData.profile?.name) {
        console.log('Skipping user without name:', userData.userId);
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
          matchReasons: compatibility.matchReasons,
          otherInterests: userData.profile?.interests?.filter(
            i => !compatibility.sharedInterests.includes(i)
          ),
          // Mobility data for display
          mobility: userData.mobility || null,
        });
      }
    });

    // Sort by compatibility score, prioritizing Local ↔ Traveler matches
    potentialMatches.sort((a, b) => {
      // Prioritize complementary mode matches
      const aComplementary = complementaryMode(currentUser, { mobility: a.mobility });
      const bComplementary = complementaryMode(currentUser, { mobility: b.mobility });

      if (aComplementary && !bComplementary) return -1;
      if (!aComplementary && bComplementary) return 1;

      // Then sort by compatibility score
      return b.compatibilityScore - a.compatibilityScore;
    });

    console.log('Returning potential matches:', potentialMatches.length);
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

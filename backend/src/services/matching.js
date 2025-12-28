import { getDb } from '../config/firebase.js';
import { predictConversationQuality } from './personalityAnalysis.js';
import { getAlgorithmWeights, recordMatchOutcome } from './matchOutcomeLearning.js';

// Default weights (used if dynamic weights not available)
const DEFAULT_WEIGHTS = {
  mobility: 0.14,
  interest: 0.15,
  style: 0.06,
  value: 0.08,
  goal: 0.05,
  language: 0.08,
  activity: 0.06,
  schedule: 0.05,
  social: 0.05,
  lifeStage: 0.05,
  cultural: 0.05,
  expertise: 0.04,
  conversationQuality: 0.08,
  timeline: 0.06,
};

// Cached weights for synchronous access
let cachedWeights = DEFAULT_WEIGHTS;

/**
 * Initialize/refresh algorithm weights from database
 * Call this on server start and periodically
 */
export async function refreshAlgorithmWeights() {
  try {
    const weights = await getAlgorithmWeights();
    cachedWeights = weights;
    console.log('Algorithm weights refreshed');
    return weights;
  } catch (error) {
    console.error('Failed to refresh algorithm weights:', error);
    return cachedWeights;
  }
}

/**
 * Get current cached weights (synchronous)
 */
export function getCurrentWeights() {
  return cachedWeights;
}

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

// Get fingerprint from companionData
function getFingerprint(user) {
  return user.companionData?.personalityFingerprint || {};
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

  // Calculate all compatibility scores
  const scores = {
    mobility: mobilityScore,
    interest: calculateInterestScore(user1, user2),
    style: calculateStyleScore(user1, user2),
    value: calculateValueScore(user1, user2),
    goal: calculateGoalScore(user1, user2),
    // New conversation-derived scores
    language: calculateLanguageScore(user1, user2),
    activity: calculateActivityScore(user1, user2),
    schedule: calculateScheduleScore(user1, user2),
    social: calculateSocialScore(user1, user2),
    lifeStage: calculateLifeStageScore(user1, user2),
    cultural: calculateCulturalBridgeScore(user1, user2),
    expertise: calculateExpertiseScore(user1, user2),
    // Predictive conversation quality score
    conversationQuality: calculateConversationQualityScore(user1, user2),
    // Timeline compatibility
    timeline: calculateTimelineScore(user1, user2),
  };

  // Use learned weights (or defaults if not available)
  const weights = cachedWeights;

  // Weighted score with dynamic weights from learning algorithm
  const weightedScore =
    scores.mobility * (weights.mobility || 0.14) +
    scores.interest * (weights.interest || 0.15) +
    scores.style * (weights.style || 0.06) +
    scores.value * (weights.value || 0.08) +
    scores.goal * (weights.goal || 0.05) +
    scores.language * (weights.language || 0.08) +
    scores.activity * (weights.activity || 0.06) +
    scores.schedule * (weights.schedule || 0.05) +
    scores.social * (weights.social || 0.05) +
    scores.lifeStage * (weights.lifeStage || 0.05) +
    scores.cultural * (weights.cultural || 0.05) +
    scores.expertise * (weights.expertise || 0.04) +
    scores.conversationQuality * (weights.conversationQuality || 0.08) +
    scores.timeline * (weights.timeline || 0.06);

  // Add shared interests to reasons if we have room
  const sharedInterests = getSharedInterests(user1, user2);
  if (sharedInterests.length > 0 && matchReasons.length < 3) {
    if (sharedInterests.length === 1) {
      matchReasons.push(`Shared interest: ${sharedInterests[0]}`);
    } else {
      matchReasons.push(`${sharedInterests.length} shared interests`);
    }
  }

  // Add language match reason if applicable
  const sharedLanguages = getSharedLanguages(user1, user2);
  if (sharedLanguages.length > 0 && matchReasons.length < 3) {
    matchReasons.push(`Both speak ${sharedLanguages[0]}`);
  }

  // Add expertise bridge reason if applicable
  const expertiseBridge = getExpertiseBridge(user1, user2);
  if (expertiseBridge && matchReasons.length < 3) {
    matchReasons.push(expertiseBridge);
  }

  // Ensure we have at least one reason
  if (matchReasons.length === 0) {
    matchReasons.push('Potential connection');
  }

  return {
    score: Math.min(Math.round(weightedScore), 100),
    breakdown: scores,
    sharedInterests,
    sharedLanguages,
    matchReasons: matchReasons.slice(0, 3),
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

  // Deal breaker check - check if any deal breakers conflict
  const fp1 = getFingerprint(user1);
  const fp2 = getFingerprint(user2);

  if (fp1.dealBreakers && fp2.dealBreakers) {
    // Check for conflicting deal breakers (e.g., one hates smoking, other is smoker)
    for (const db1 of fp1.dealBreakers) {
      for (const db2 of fp2.dealBreakers) {
        if (db1.type === db2.type && db1.value !== db2.value) {
          // Potential conflict - could be refined further
          return false;
        }
      }
    }
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
  const fp1 = getFingerprint(user1);
  const fp2 = getFingerprint(user2);

  if (!fp1.conversationalStyle && !fp2.conversationalStyle) return 60;

  let score = 50;

  // Conversational style compatibility
  const styleCompatibility = {
    casual: { casual: 20, energetic: 15, thoughtful: 10, reserved: 5 },
    energetic: { energetic: 20, casual: 15, thoughtful: 10, reserved: 0 },
    thoughtful: { thoughtful: 20, casual: 10, reserved: 15, energetic: 10 },
    reserved: { reserved: 20, thoughtful: 15, casual: 5, energetic: 0 },
  };

  if (fp1.conversationalStyle && fp2.conversationalStyle) {
    score += styleCompatibility[fp1.conversationalStyle]?.[fp2.conversationalStyle] || 10;
  }

  // Energy level compatibility (closer is better)
  if (fp1.energyLevel && fp2.energyLevel) {
    const energyDiff = Math.abs(fp1.energyLevel - fp2.energyLevel);
    score += Math.max(0, 15 - energyDiff * 1.5);
  }

  // Humor style compatibility
  if (fp1.humorStyle && fp2.humorStyle && fp1.humorStyle !== 'unknown' && fp2.humorStyle !== 'unknown') {
    if (fp1.humorStyle === fp2.humorStyle) {
      score += 10;
    } else if (
      (fp1.humorStyle === 'playful' && fp2.humorStyle === 'witty') ||
      (fp1.humorStyle === 'witty' && fp2.humorStyle === 'playful')
    ) {
      score += 5;
    }
  }

  return Math.min(score, 100);
}

function calculateValueScore(user1, user2) {
  const fp1 = getFingerprint(user1);
  const fp2 = getFingerprint(user2);

  const values1 = new Set(fp1.values || []);
  const values2 = new Set(fp2.values || []);

  if (values1.size === 0 || values2.size === 0) return 60;

  const shared = [...values1].filter(v => values2.has(v));

  // Base score + bonus for shared values
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

// NEW: Language compatibility score
function calculateLanguageScore(user1, user2) {
  const fp1 = getFingerprint(user1);
  const fp2 = getFingerprint(user2);

  const langs1 = fp1.languages || [];
  const langs2 = fp2.languages || [];

  if (langs1.length === 0 || langs2.length === 0) return 60; // Default

  let maxScore = 0;

  for (const l1 of langs1) {
    for (const l2 of langs2) {
      if (l1.language.toLowerCase() === l2.language.toLowerCase()) {
        // Calculate score based on proficiency levels
        const proficiencyScores = { native: 4, fluent: 3, conversational: 2, learning: 1 };
        const p1 = proficiencyScores[l1.proficiency] || 1;
        const p2 = proficiencyScores[l2.proficiency] || 1;

        // Higher combined proficiency = better communication
        const combinedScore = Math.min(p1, p2) * 15 + Math.max(p1, p2) * 5;
        maxScore = Math.max(maxScore, combinedScore);
      }
    }
  }

  // Learning + Native is a great match (language exchange)
  for (const l1 of langs1) {
    for (const l2 of langs2) {
      if (l1.language.toLowerCase() === l2.language.toLowerCase()) {
        if (
          (l1.proficiency === 'learning' && l2.proficiency === 'native') ||
          (l1.proficiency === 'native' && l2.proficiency === 'learning')
        ) {
          maxScore = Math.max(maxScore, 85); // Language exchange bonus
        }
      }
    }
  }

  return Math.min(40 + maxScore, 100);
}

// NEW: Activity preference alignment
function calculateActivityScore(user1, user2) {
  const fp1 = getFingerprint(user1);
  const fp2 = getFingerprint(user2);

  let score = 60;

  // Activity type matching
  if (fp1.activityType && fp2.activityType) {
    if (fp1.activityType === fp2.activityType) {
      score += 20;
    } else if (fp1.activityType === 'mixed' || fp2.activityType === 'mixed') {
      score += 10;
    } else if (fp1.activityType !== 'unknown' && fp2.activityType !== 'unknown') {
      score -= 10; // Opposing preferences
    }
  }

  // Group preference matching
  if (fp1.groupPreference && fp2.groupPreference) {
    const groupCompat = {
      solo: { solo: 15, small_group: 5, large_group: -5, flexible: 10 },
      small_group: { solo: 5, small_group: 15, large_group: 5, flexible: 10 },
      large_group: { solo: -5, small_group: 5, large_group: 15, flexible: 10 },
      flexible: { solo: 10, small_group: 10, large_group: 10, flexible: 15 },
    };
    score += groupCompat[fp1.groupPreference]?.[fp2.groupPreference] || 0;
  }

  return Math.min(Math.max(score, 0), 100);
}

// NEW: Schedule compatibility
function calculateScheduleScore(user1, user2) {
  const fp1 = getFingerprint(user1);
  const fp2 = getFingerprint(user2);

  let score = 60;

  // Schedule type matching
  if (fp1.scheduleType && fp2.scheduleType) {
    if (fp1.scheduleType === fp2.scheduleType) {
      score += 25;
    } else if (fp1.scheduleType === 'flexible' || fp2.scheduleType === 'flexible') {
      score += 15;
    } else if (
      (fp1.scheduleType === 'early_bird' && fp2.scheduleType === 'night_owl') ||
      (fp1.scheduleType === 'night_owl' && fp2.scheduleType === 'early_bird')
    ) {
      score -= 15; // Hard to meet up
    }
  }

  // Availability matching
  if (fp1.availability && fp2.availability) {
    if (fp1.availability === fp2.availability || fp1.availability === 'flexible' || fp2.availability === 'flexible') {
      score += 10;
    }
  }

  return Math.min(Math.max(score, 0), 100);
}

// NEW: Social style compatibility
function calculateSocialScore(user1, user2) {
  const fp1 = getFingerprint(user1);
  const fp2 = getFingerprint(user2);

  let score = 60;

  if (fp1.socialStyle && fp2.socialStyle && fp1.socialStyle !== 'unknown' && fp2.socialStyle !== 'unknown') {
    // Similar social styles work well together
    const socialCompat = {
      introvert: { introvert: 20, ambivert: 15, extrovert: 5 },
      ambivert: { introvert: 15, ambivert: 20, extrovert: 15 },
      extrovert: { introvert: 5, ambivert: 15, extrovert: 20 },
    };
    score += socialCompat[fp1.socialStyle]?.[fp2.socialStyle] || 10;

    // Depth preference matching
    if (fp1.depthPreference && fp2.depthPreference) {
      if (fp1.depthPreference === fp2.depthPreference) {
        score += 10;
      }
    }
  }

  return Math.min(score, 100);
}

// NEW: Life stage alignment
function calculateLifeStageScore(user1, user2) {
  const fp1 = getFingerprint(user1);
  const fp2 = getFingerprint(user2);

  let score = 60;

  if (fp1.lifeStage && fp2.lifeStage && fp1.lifeStage !== 'unknown' && fp2.lifeStage !== 'unknown') {
    // Same life stage = shared experiences
    if (fp1.lifeStage === fp2.lifeStage) {
      score += 30;
    } else {
      // Adjacent life stages can also connect well
      const stageOrder = ['student', 'early_career', 'mid_career', 'parent', 'retiree'];
      const idx1 = stageOrder.indexOf(fp1.lifeStage);
      const idx2 = stageOrder.indexOf(fp2.lifeStage);

      if (idx1 >= 0 && idx2 >= 0) {
        const distance = Math.abs(idx1 - idx2);
        if (distance === 1) score += 15; // Adjacent stages
        else if (distance === 2) score += 5;
      }
    }
  }

  return Math.min(score, 100);
}

// NEW: Cultural bridge score (high curiosity local + traveler)
function calculateCulturalBridgeScore(user1, user2) {
  const fp1 = getFingerprint(user1);
  const fp2 = getFingerprint(user2);

  let score = 60;

  // Check if this is a Local ↔ Traveler match
  if (complementaryMode(user1, user2)) {
    const local = user1.mobility?.mode === 'LOCAL' ? user1 : user2;
    const traveler = user1.mobility?.mode === 'TRAVELER' ? user1 : user2;
    const localFp = local === user1 ? fp1 : fp2;
    const travelerFp = local === user1 ? fp2 : fp1;

    // High cultural curiosity from traveler is great
    if (travelerFp.culturalCuriosity === 'high') {
      score += 25;
    } else if (travelerFp.culturalCuriosity === 'medium') {
      score += 10;
    }

    // Local with cultural exchange interest matches well
    if (local.mobility?.localReason === 'CULTURAL_EXCHANGE') {
      score += 15;
    }

    // Matching cultural interests
    if (localFp.culturalInterests && travelerFp.culturalInterests) {
      const shared = localFp.culturalInterests.filter((c) =>
        travelerFp.culturalInterests.includes(c)
      );
      score += shared.length * 5;
    }
  }

  return Math.min(score, 100);
}

// NEW: Expertise match score (one can help the other)
function calculateExpertiseScore(user1, user2) {
  const fp1 = getFingerprint(user1);
  const fp2 = getFingerprint(user2);

  let score = 60;

  const exp1 = fp1.expertiseAreas || [];
  const exp2 = fp2.expertiseAreas || [];

  if (exp1.length === 0 && exp2.length === 0) return score;

  // Check if expertise areas could be helpful
  // This is a simplified check - in reality you'd match against needs
  const helpfulCategories = {
    tech: ['technology', 'software', 'coding', 'programming', 'IT'],
    career: ['business', 'career', 'professional', 'networking', 'job'],
    language: ['language', 'translation', 'teaching'],
    local: ['city', 'neighborhood', 'restaurants', 'culture'],
  };

  // If one user has expertise the other might need
  const user1Needs = user1.mobility?.mode === 'TRAVELER';
  const user2Needs = user2.mobility?.mode === 'TRAVELER';

  if (user1Needs && exp2.length > 0) {
    score += 15; // Local has expertise traveler might need
  }
  if (user2Needs && exp1.length > 0) {
    score += 15;
  }

  // Career-related expertise matching with career intent
  if (
    (user1.mobility?.connectionIntent === 'CAREER' && exp2.some(e => helpfulCategories.career.some(c => e.toLowerCase().includes(c)))) ||
    (user2.mobility?.connectionIntent === 'CAREER' && exp1.some(e => helpfulCategories.career.some(c => e.toLowerCase().includes(c))))
  ) {
    score += 20;
  }

  return Math.min(score, 100);
}

// NEW: Predicted conversation quality based on personality profiles
function calculateConversationQualityScore(user1, user2) {
  const personality1 = user1.companionData?.personalityProfile;
  const personality2 = user2.companionData?.personalityProfile;

  return predictConversationQuality(personality1, personality2);
}

// NEW: Timeline compatibility - prioritize users who will be in the same place at the same time
function calculateTimelineScore(user1, user2) {
  const fp1 = getFingerprint(user1);
  const fp2 = getFingerprint(user2);

  const timeline1 = fp1.timeline;
  const timeline2 = fp2.timeline;

  if (!timeline1 && !timeline2) return 60; // Neutral if no data

  let score = 60;

  // Local ↔ Traveler timeline matching
  if (user1.mobility?.mode === 'LOCAL' && user2.mobility?.mode === 'TRAVELER') {
    const travelerTimeline = timeline2;

    if (travelerTimeline) {
      // Traveler arriving soon + local available now = great match
      if (travelerTimeline.urgency === 'immediate') {
        score += 30;
      } else if (travelerTimeline.urgency === 'planning') {
        score += 15; // Can plan ahead
      }

      // Long-term stay matches better with locals
      if (travelerTimeline.departureDate === 'staying' || !travelerTimeline.departureDate) {
        score += 10; // More time to build friendship
      }
    }
  } else if (user2.mobility?.mode === 'LOCAL' && user1.mobility?.mode === 'TRAVELER') {
    // Same logic, reversed
    const travelerTimeline = timeline1;

    if (travelerTimeline) {
      if (travelerTimeline.urgency === 'immediate') {
        score += 30;
      } else if (travelerTimeline.urgency === 'planning') {
        score += 15;
      }

      if (travelerTimeline.departureDate === 'staying' || !travelerTimeline.departureDate) {
        score += 10;
      }
    }
  } else if (timeline1 && timeline2) {
    // Traveler ↔ Traveler timeline overlap
    const overlap = calculateTimelineOverlap(timeline1, timeline2);
    score += overlap * 40; // 0-1 overlap → 0-40 points
  }

  return Math.min(score, 100);
}

function calculateTimelineOverlap(t1, t2) {
  // Simplified - in reality, parse dates and calculate actual overlap
  if (!t1.arrivalDate || !t2.arrivalDate) return 0.5;

  // Both staying long-term
  if (t1.departureDate === 'staying' && t2.departureDate === 'staying') {
    return 1.0;
  }

  // Both have similar urgency
  if (t1.urgency === t2.urgency) {
    return 0.8;
  }

  return 0.5; // Default moderate overlap
}

function getSharedInterests(user1, user2) {
  const interests1 = new Set(user1.profile?.interests || []);
  const interests2 = new Set(user2.profile?.interests || []);

  return [...interests1].filter(i => interests2.has(i));
}

function getSharedLanguages(user1, user2) {
  const fp1 = getFingerprint(user1);
  const fp2 = getFingerprint(user2);

  const langs1 = fp1.languages || [];
  const langs2 = fp2.languages || [];

  const shared = [];
  for (const l1 of langs1) {
    for (const l2 of langs2) {
      if (l1.language.toLowerCase() === l2.language.toLowerCase()) {
        shared.push(l1.language);
      }
    }
  }
  return [...new Set(shared)];
}

function getExpertiseBridge(user1, user2) {
  const fp1 = getFingerprint(user1);
  const fp2 = getFingerprint(user2);

  // If one is a traveler seeking career help and other has career expertise
  if (user1.mobility?.mode === 'TRAVELER' && user1.mobility?.connectionIntent === 'CAREER') {
    const exp2 = fp2.expertiseAreas || [];
    if (exp2.length > 0) {
      return `Can help with ${exp2[0]}`;
    }
  }
  if (user2.mobility?.mode === 'TRAVELER' && user2.mobility?.connectionIntent === 'CAREER') {
    const exp1 = fp1.expertiseAreas || [];
    if (exp1.length > 0) {
      return `Can help with ${exp1[0]}`;
    }
  }

  return null;
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
          sharedLanguages: compatibility.sharedLanguages,
          matchReasons: compatibility.matchReasons,
          scoreBreakdown: compatibility.breakdown,
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
  refreshAlgorithmWeights,
  getCurrentWeights,
};

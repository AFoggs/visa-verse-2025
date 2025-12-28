import { getDb } from '../config/firebase.js';

// Default weights (fallback if no learned weights)
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

// Cache for weights
let cachedWeights = null;
let weightsCacheTime = null;
const CACHE_DURATION = 3600000; // 1 hour

/**
 * Get algorithm weights (cached for 1 hour)
 */
export async function getAlgorithmWeights() {
  // Return cached weights if fresh
  if (cachedWeights && Date.now() - weightsCacheTime < CACHE_DURATION) {
    return cachedWeights;
  }

  const db = getDb();

  try {
    const configDoc = await db.collection('config').doc('matchingWeights').get();

    if (configDoc.exists) {
      const data = configDoc.data();
      cachedWeights = data.weights;
      weightsCacheTime = Date.now();
      console.log('Loaded learned weights from database');
      return cachedWeights;
    }
  } catch (error) {
    console.error('Failed to load algorithm weights:', error);
  }

  // Fallback to default weights
  return DEFAULT_WEIGHTS;
}

/**
 * Clear the weights cache (call after optimization)
 */
export function clearWeightsCache() {
  cachedWeights = null;
  weightsCacheTime = null;
}

/**
 * Record a match outcome for learning
 */
export async function recordMatchOutcome(matchId, user1Id, user2Id, compatibilityScore, scoreBreakdown) {
  const db = getDb();

  try {
    await db.collection('matchOutcomes').doc(matchId).set({
      matchId,
      user1Id,
      user2Id,
      compatibilityScore,
      scoreBreakdown,
      outcome: {
        connectionQuality: 0,
        becameFriends: false,
        conversationCount: 0,
        lastInteraction: null,
        user1Feedback: null,
        user2Feedback: null,
      },
      createdAt: new Date(),
      resolvedAt: null,
    });

    console.log(`Recorded match outcome for ${matchId}`);
  } catch (error) {
    console.error('Failed to record match outcome:', error);
  }
}

/**
 * Update match outcome with user feedback
 */
export async function updateMatchFeedback(matchId, userId, feedback) {
  const db = getDb();

  try {
    const outcomeDoc = await db.collection('matchOutcomes').doc(matchId).get();

    if (!outcomeDoc.exists) {
      console.log(`Match outcome not found: ${matchId}`);
      return false;
    }

    const data = outcomeDoc.data();
    const isUser1 = data.user1Id === userId;

    const feedbackField = isUser1 ? 'outcome.user1Feedback' : 'outcome.user2Feedback';

    const updateData = {
      [feedbackField]: {
        rating: feedback.rating,
        whatWorked: feedback.whatWorked || [],
        whatDidnt: feedback.whatDidnt || [],
        submittedAt: new Date(),
      },
    };

    // If both users have provided feedback, calculate overall quality
    const existingFeedback = isUser1 ? data.outcome.user2Feedback : data.outcome.user1Feedback;
    if (existingFeedback) {
      const avgRating = (feedback.rating + existingFeedback.rating) / 2;
      updateData['outcome.connectionQuality'] = avgRating;
      updateData['resolvedAt'] = new Date();
    }

    await db.collection('matchOutcomes').doc(matchId).update(updateData);
    console.log(`Updated feedback for match ${matchId} from user ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to update match feedback:', error);
    return false;
  }
}

/**
 * Update conversation metrics for a match
 */
export async function updateMatchMetrics(matchId, metrics) {
  const db = getDb();

  try {
    await db.collection('matchOutcomes').doc(matchId).update({
      'outcome.conversationCount': metrics.conversationCount,
      'outcome.lastInteraction': new Date(),
      'outcome.becameFriends': metrics.becameFriends || false,
    });
  } catch (error) {
    console.error('Failed to update match metrics:', error);
  }
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(arr1, arr2) {
  if (arr1.length !== arr2.length || arr1.length === 0) return 0;

  const n = arr1.length;
  const sum1 = arr1.reduce((a, b) => a + b, 0);
  const sum2 = arr2.reduce((a, b) => a + b, 0);
  const sum1Sq = arr1.reduce((a, b) => a + b * b, 0);
  const sum2Sq = arr2.reduce((a, b) => a + b * b, 0);
  const pSum = arr1.map((x, i) => x * arr2[i]).reduce((a, b) => a + b, 0);

  const num = pSum - (sum1 * sum2 / n);
  const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));

  return den === 0 ? 0 : num / den;
}

/**
 * Optimize weights based on correlation strength
 */
function optimizeWeights(correlations) {
  // Calculate total absolute correlation
  const totalCorrelation = Object.values(correlations).reduce((a, b) => a + Math.abs(b), 0);

  if (totalCorrelation === 0) {
    return DEFAULT_WEIGHTS;
  }

  const weights = {};

  for (const [dimension, correlation] of Object.entries(correlations)) {
    // Use absolute correlation value, but preserve some weight for negatively correlated dimensions
    // (they might still be important for filtering)
    weights[dimension] = Math.max(0.02, Math.abs(correlation) / totalCorrelation);
  }

  // Ensure mobility always has minimum 10% weight (core matching feature)
  weights.mobility = Math.max(weights.mobility, 0.10);

  // Normalize to sum to 1.0
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  for (const key in weights) {
    weights[key] = Math.round((weights[key] / sum) * 100) / 100;
  }

  // Final adjustment to ensure sum is exactly 1.0
  const finalSum = Object.values(weights).reduce((a, b) => a + b, 0);
  const diff = 1.0 - finalSum;
  weights.interest = Math.round((weights.interest + diff) * 100) / 100;

  return weights;
}

/**
 * Analyze match outcomes to optimize algorithm weights
 * Run this periodically (daily/weekly)
 */
export async function optimizeAlgorithmWeights() {
  const db = getDb();

  console.log('Starting algorithm weight optimization...');

  try {
    // Get all resolved matches with feedback
    const outcomes = await db.collection('matchOutcomes')
      .where('outcome.connectionQuality', '>', 0)
      .limit(1000)
      .get();

    if (outcomes.empty) {
      console.log('No match outcomes with feedback found');
      return null;
    }

    const data = outcomes.docs.map(doc => doc.data());
    console.log(`Analyzing ${data.length} match outcomes...`);

    // Analyze which scoring dimensions correlated with success
    const dimensionCorrelations = {};
    const dimensions = Object.keys(DEFAULT_WEIGHTS);

    for (const dimension of dimensions) {
      const scores = data
        .filter(m => m.scoreBreakdown && m.scoreBreakdown[dimension] !== undefined)
        .map(m => m.scoreBreakdown[dimension]);

      const outcomeScores = data
        .filter(m => m.scoreBreakdown && m.scoreBreakdown[dimension] !== undefined)
        .map(m => m.outcome.connectionQuality);

      if (scores.length >= 10) {
        dimensionCorrelations[dimension] = calculateCorrelation(scores, outcomeScores);
      } else {
        // Not enough data, use default correlation assumption
        dimensionCorrelations[dimension] = DEFAULT_WEIGHTS[dimension];
      }
    }

    console.log('Dimension correlations:', dimensionCorrelations);

    // Optimize weights based on correlations
    const optimizedWeights = optimizeWeights(dimensionCorrelations);

    console.log('Optimized weights:', optimizedWeights);

    // Store in config
    await db.collection('config').doc('matchingWeights').set({
      weights: optimizedWeights,
      updatedAt: new Date(),
      basedOnSampleSize: data.length,
      correlations: dimensionCorrelations,
      previousWeights: cachedWeights || DEFAULT_WEIGHTS,
    });

    // Clear cache so new weights are used
    clearWeightsCache();

    console.log('Algorithm weights optimized and saved');
    return optimizedWeights;
  } catch (error) {
    console.error('Failed to optimize algorithm weights:', error);
    return null;
  }
}

/**
 * Get optimization stats for dashboard
 */
export async function getOptimizationStats() {
  const db = getDb();

  try {
    const [configDoc, outcomesSnapshot] = await Promise.all([
      db.collection('config').doc('matchingWeights').get(),
      db.collection('matchOutcomes').where('outcome.connectionQuality', '>', 0).get(),
    ]);

    const config = configDoc.exists ? configDoc.data() : null;

    return {
      currentWeights: config?.weights || DEFAULT_WEIGHTS,
      lastOptimized: config?.updatedAt || null,
      sampleSize: config?.basedOnSampleSize || 0,
      correlations: config?.correlations || null,
      totalOutcomes: outcomesSnapshot.size,
    };
  } catch (error) {
    console.error('Failed to get optimization stats:', error);
    return null;
  }
}

export default {
  getAlgorithmWeights,
  clearWeightsCache,
  recordMatchOutcome,
  updateMatchFeedback,
  updateMatchMetrics,
  optimizeAlgorithmWeights,
  getOptimizationStats,
};

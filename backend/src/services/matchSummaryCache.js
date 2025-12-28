import { getDb } from '../config/firebase.js';
import { generateMatchSummary } from './claude.js';

// Cache duration: 1 week in milliseconds
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Get cache key for a user pair (order-independent)
 */
function getCacheKey(userId1, userId2) {
  // Sort IDs to ensure consistent key regardless of order
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

/**
 * Get cached summary for a match pair
 * Returns null if no cache exists or cache is expired
 */
export async function getCachedSummary(userId1, userId2) {
  const db = getDb();
  const cacheKey = getCacheKey(userId1, userId2);

  try {
    const cacheDoc = await db.collection('matchSummaryCache').doc(cacheKey).get();

    if (!cacheDoc.exists) {
      return null;
    }

    const data = cacheDoc.data();
    const cacheAge = Date.now() - data.generatedAt.toDate().getTime();

    // Check if cache is still valid (less than 1 week old)
    if (cacheAge < CACHE_DURATION_MS) {
      return {
        summary: data.summary,
        generatedAt: data.generatedAt.toDate(),
        forUser: data.forUser, // The perspective user
      };
    }

    // Cache expired
    return null;
  } catch (error) {
    console.error('Error getting cached summary:', error);
    return null;
  }
}

/**
 * Store a summary in the cache
 */
export async function cacheSummary(userId1, userId2, summary, forUserId) {
  const db = getDb();
  const cacheKey = getCacheKey(userId1, userId2);

  try {
    await db.collection('matchSummaryCache').doc(cacheKey).set({
      userId1,
      userId2,
      summary,
      forUser: forUserId,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + CACHE_DURATION_MS),
    });

    console.log(`Cached summary for ${cacheKey}`);
  } catch (error) {
    console.error('Error caching summary:', error);
  }
}

/**
 * Get summaries for multiple matches from cache
 * Returns a map of matchUserId -> summary (or null if not cached)
 */
export async function getCachedSummaries(currentUserId, matchUserIds) {
  const summaries = new Map();

  // Fetch all in parallel
  const promises = matchUserIds.map(async (matchUserId) => {
    const cached = await getCachedSummary(currentUserId, matchUserId);
    return { matchUserId, summary: cached?.summary || null };
  });

  const results = await Promise.all(promises);

  for (const { matchUserId, summary } of results) {
    summaries.set(matchUserId, summary);
  }

  return summaries;
}

/**
 * Pre-generate summaries for a user's top matches
 * Uses lazy import to avoid circular dependency
 */
export async function preGenerateSummariesForUser(userId, limit = 10) {
  const db = getDb();

  console.log(`Pre-generating summaries for user ${userId}...`);

  try {
    // Lazy import to avoid circular dependency
    const { calculateCompatibility } = await import('./matching.js');

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return { generated: 0, skipped: 0 };
    }
    const currentUser = { userId, ...userDoc.data() };

    // Get potential matches (simplified query)
    const usersSnapshot = await db.collection('users')
      .where('onboardingComplete', '==', true)
      .limit(50)
      .get();

    // Calculate compatibility and get top matches
    const potentialMatches = [];

    for (const doc of usersSnapshot.docs) {
      if (doc.id === userId) continue;

      const userData = { userId: doc.id, ...doc.data() };
      if (!userData.profile?.name) continue;

      const compatibility = calculateCompatibility(currentUser, userData);
      if (compatibility) {
        potentialMatches.push({
          userId: doc.id,
          userData,
          compatibility,
        });
      }
    }

    // Sort by score and take top matches
    potentialMatches.sort((a, b) => b.compatibility.score - a.compatibility.score);
    const topMatches = potentialMatches.slice(0, limit);

    let generated = 0;
    let skipped = 0;

    // Generate summaries for matches that don't have a valid cache
    for (const match of topMatches) {
      const cached = await getCachedSummary(userId, match.userId);

      if (cached) {
        skipped++;
        continue;
      }

      // Generate new summary
      try {
        const summary = await generateMatchSummary(
          currentUser,
          match.userData,
          match.compatibility
        );

        if (summary) {
          await cacheSummary(userId, match.userId, summary, userId);
          generated++;
        }
      } catch (error) {
        console.error(`Failed to generate summary for ${match.userId}:`, error);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`Pre-generated ${generated} summaries, skipped ${skipped} cached`);
    return { generated, skipped };
  } catch (error) {
    console.error('Error pre-generating summaries:', error);
    return { generated: 0, skipped: 0, error: error.message };
  }
}

/**
 * Pre-generate summaries for all active users
 * Call this daily via scheduled job
 */
export async function preGenerateAllSummaries(limit = 10) {
  const db = getDb();

  console.log('Starting daily summary pre-generation...');

  try {
    // Get all active users (recently active)
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const usersSnapshot = await db.collection('users')
      .where('onboardingComplete', '==', true)
      .limit(100)
      .get();

    let totalGenerated = 0;
    let totalSkipped = 0;
    let usersProcessed = 0;

    for (const doc of usersSnapshot.docs) {
      const result = await preGenerateSummariesForUser(doc.id, limit);
      totalGenerated += result.generated;
      totalSkipped += result.skipped;
      usersProcessed++;

      // Delay between users to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Daily summary generation complete: ${usersProcessed} users, ${totalGenerated} generated, ${totalSkipped} skipped`);

    return {
      usersProcessed,
      totalGenerated,
      totalSkipped,
    };
  } catch (error) {
    console.error('Error in daily summary generation:', error);
    return { error: error.message };
  }
}

/**
 * Clear expired cache entries (cleanup job)
 */
export async function cleanupExpiredCache() {
  const db = getDb();

  try {
    const expiredDocs = await db.collection('matchSummaryCache')
      .where('expiresAt', '<', new Date())
      .limit(100)
      .get();

    const batch = db.batch();
    expiredDocs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Cleaned up ${expiredDocs.size} expired cache entries`);

    return { deleted: expiredDocs.size };
  } catch (error) {
    console.error('Error cleaning up cache:', error);
    return { error: error.message };
  }
}

export default {
  getCachedSummary,
  cacheSummary,
  getCachedSummaries,
  preGenerateSummariesForUser,
  preGenerateAllSummaries,
  cleanupExpiredCache,
};

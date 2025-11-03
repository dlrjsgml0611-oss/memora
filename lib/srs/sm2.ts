/**
 * SuperMemo SM-2 Algorithm Implementation
 *
 * This algorithm calculates the optimal review schedule for flashcards
 * based on user performance.
 *
 * Rating scale:
 * 1 - Again: Complete blackout, incorrect response
 * 2 - Hard: Correct response with serious difficulty
 * 3 - Good: Correct response with some hesitation
 * 4 - Easy: Perfect response, immediate recall
 */

export interface SM2Result {
  ease: number;          // Ease factor (minimum 1.3)
  interval: number;      // Days until next review
  repetitions: number;   // Number of consecutive correct reviews
  nextReview: Date;      // Date of next review
  state: 'new' | 'learning' | 'review' | 'relearning';
}

export interface SM2Input {
  ease: number;          // Current ease factor
  interval: number;      // Current interval in days
  repetitions: number;   // Current repetition count
  rating: 1 | 2 | 3 | 4; // User's performance rating
}

/**
 * Calculate next review parameters using SM-2 algorithm
 */
export function calculateSM2(input: SM2Input): SM2Result {
  let { ease, interval, repetitions, rating } = input;

  // If rating is "Again" (1), reset progress
  if (rating === 1) {
    return {
      ease: Math.max(1.3, ease - 0.2),
      interval: 0,
      repetitions: 0,
      nextReview: getNextReviewDate(0),
      state: repetitions === 0 ? 'new' : 'relearning',
    };
  }

  // Update ease factor based on rating
  ease = ease + (0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02));
  ease = Math.max(1.3, ease); // Minimum ease is 1.3

  // Increment repetitions
  repetitions += 1;

  // Calculate new interval
  let newInterval: number;
  let state: 'new' | 'learning' | 'review' | 'relearning';

  if (repetitions === 1) {
    newInterval = 1;
    state = 'learning';
  } else if (repetitions === 2) {
    newInterval = 6;
    state = 'learning';
  } else {
    newInterval = Math.round(interval * ease);
    state = 'review';
  }

  // Apply rating modifiers
  if (rating === 2) {
    // Hard: multiply interval by 1.2
    newInterval = Math.round(newInterval * 1.2);
  } else if (rating === 4) {
    // Easy: multiply interval by ease factor again for faster progression
    newInterval = Math.round(newInterval * ease);
    state = 'review';
  }

  return {
    ease,
    interval: newInterval,
    repetitions,
    nextReview: getNextReviewDate(newInterval),
    state,
  };
}

/**
 * Get the next review date based on interval
 */
function getNextReviewDate(intervalDays: number): Date {
  const now = new Date();
  const nextReview = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  // Set to start of day for consistency
  nextReview.setHours(0, 0, 0, 0);

  return nextReview;
}

/**
 * Initialize SM-2 parameters for a new flashcard
 */
export function initializeSM2(): SM2Result {
  return {
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: new Date(),
    state: 'new',
  };
}

/**
 * Get statistics about retention based on ease factor
 */
export function getRetentionStats(ease: number): {
  difficulty: 'very-hard' | 'hard' | 'normal' | 'easy' | 'very-easy';
  estimatedRetention: number;
} {
  if (ease < 1.7) {
    return { difficulty: 'very-hard', estimatedRetention: 0.7 };
  } else if (ease < 2.0) {
    return { difficulty: 'hard', estimatedRetention: 0.8 };
  } else if (ease < 2.5) {
    return { difficulty: 'normal', estimatedRetention: 0.9 };
  } else if (ease < 3.0) {
    return { difficulty: 'easy', estimatedRetention: 0.95 };
  } else {
    return { difficulty: 'very-easy', estimatedRetention: 0.98 };
  }
}

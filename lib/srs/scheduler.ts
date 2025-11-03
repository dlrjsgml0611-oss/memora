import { IFlashcard } from '@/types';
import { calculateSM2, initializeSM2 } from './sm2';

/**
 * Schedule a flashcard review based on user performance
 */
export function scheduleReview(
  flashcard: IFlashcard,
  rating: 1 | 2 | 3 | 4
): {
  srs: IFlashcard['srs'];
  stats: IFlashcard['stats'];
} {
  // Calculate new SRS parameters
  const sm2Result = calculateSM2({
    ease: flashcard.srs.ease,
    interval: flashcard.srs.interval,
    repetitions: flashcard.srs.repetitions,
    rating,
  });

  // Update stats
  const isCorrect = rating >= 3;
  const totalReviews = flashcard.stats.totalReviews + 1;
  const correctCount = flashcard.stats.correctCount + (isCorrect ? 1 : 0);
  const incorrectCount = flashcard.stats.incorrectCount + (isCorrect ? 0 : 1);

  return {
    srs: {
      ease: sm2Result.ease,
      interval: sm2Result.interval,
      repetitions: sm2Result.repetitions,
      nextReview: sm2Result.nextReview,
      lastReviewed: new Date(),
      state: sm2Result.state,
    },
    stats: {
      ...flashcard.stats,
      totalReviews,
      correctCount,
      incorrectCount,
    },
  };
}

/**
 * Get flashcards due for review
 */
export function getDueCards(flashcards: IFlashcard[]): IFlashcard[] {
  const now = new Date();

  return flashcards
    .filter((card) => card.srs.nextReview <= now)
    .sort((a, b) => a.srs.nextReview.getTime() - b.srs.nextReview.getTime());
}

/**
 * Get new flashcards for learning
 */
export function getNewCards(flashcards: IFlashcard[], limit: number = 10): IFlashcard[] {
  return flashcards
    .filter((card) => card.srs.state === 'new')
    .slice(0, limit);
}

/**
 * Get review statistics for a set of flashcards
 */
export function getReviewStats(flashcards: IFlashcard[]): {
  total: number;
  new: number;
  learning: number;
  review: number;
  relearning: number;
  dueToday: number;
  accuracy: number;
} {
  const now = new Date();
  now.setHours(23, 59, 59, 999); // End of today

  const total = flashcards.length;
  const new_ = flashcards.filter((c) => c.srs.state === 'new').length;
  const learning = flashcards.filter((c) => c.srs.state === 'learning').length;
  const review = flashcards.filter((c) => c.srs.state === 'review').length;
  const relearning = flashcards.filter((c) => c.srs.state === 'relearning').length;
  const dueToday = flashcards.filter((c) => c.srs.nextReview <= now).length;

  // Calculate overall accuracy
  let totalReviews = 0;
  let totalCorrect = 0;

  flashcards.forEach((card) => {
    totalReviews += card.stats.totalReviews;
    totalCorrect += card.stats.correctCount;
  });

  const accuracy = totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0;

  return {
    total,
    new: new_,
    learning,
    review,
    relearning,
    dueToday,
    accuracy: Math.round(accuracy * 100) / 100,
  };
}

/**
 * Calculate projected workload for upcoming days
 */
export function getProjectedWorkload(
  flashcards: IFlashcard[],
  days: number = 7
): Array<{ date: Date; count: number }> {
  const workload: Array<{ date: Date; count: number }> = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + i);
    targetDate.setHours(23, 59, 59, 999);

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const count = flashcards.filter((card) => {
      const reviewDate = card.srs.nextReview;
      return reviewDate >= startOfDay && reviewDate <= targetDate;
    }).length;

    workload.push({
      date: startOfDay,
      count,
    });
  }

  return workload;
}

/**
 * Calculate study streak
 */
export function calculateStreak(reviewDates: Date[]): {
  currentStreak: number;
  longestStreak: number;
} {
  if (reviewDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Sort dates in descending order
  const sortedDates = reviewDates
    .map((d) => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date;
    })
    .sort((a, b) => b.getTime() - a.getTime());

  // Remove duplicates
  const uniqueDates = sortedDates.filter(
    (date, index, array) =>
      index === 0 || date.getTime() !== array[index - 1].getTime()
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Calculate current streak
  if (uniqueDates[0].getTime() === today.getTime() ||
      uniqueDates[0].getTime() === yesterday.getTime()) {
    currentStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const diffDays = Math.floor(
        (uniqueDates[i - 1].getTime() - uniqueDates[i].getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  longestStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const diffDays = Math.floor(
      (uniqueDates[i - 1].getTime() - uniqueDates[i].getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  return { currentStreak, longestStreak };
}

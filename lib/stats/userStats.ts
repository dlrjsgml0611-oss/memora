import { MemoryPalaceReview, Review, User } from '@/lib/db/models';
import { calculateStreak } from '@/lib/srs/scheduler';

interface RefreshOptions {
  reviewedIncrement?: number;
  studyTimeIncrementSeconds?: number;
}

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function refreshUserLearningStats(userId: string, options: RefreshOptions = {}) {
  const { reviewedIncrement = 0, studyTimeIncrementSeconds = 0 } = options;

  const user = await User.findById(userId);
  if (!user) return null;

  const [reviewRows, memoryReviewRows] = await Promise.all([
    Review.find(
      { userId },
      { reviewedAt: 1, _id: 0 }
    )
      .sort({ reviewedAt: -1 })
      .limit(5000)
      .lean(),
    MemoryPalaceReview.find(
      { userId },
      { finishedAt: 1, _id: 0 }
    )
      .sort({ finishedAt: -1 })
      .limit(5000)
      .lean(),
  ]);

  const reviewDates = reviewRows.map((row: any) => new Date(row.reviewedAt));
  const memoryReviewDates = memoryReviewRows.map((row: any) => new Date(row.finishedAt));
  const allActivityDates = [...reviewDates, ...memoryReviewDates].sort(
    (a, b) => b.getTime() - a.getTime()
  );
  const streak = calculateStreak(allActivityDates);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);

  const weeklyDateSet = new Set<string>();
  for (const date of allActivityDates) {
    if (date < sevenDaysAgo) continue;
    weeklyDateSet.add(toDateKey(date));
  }

  const weeklyActiveDays = weeklyDateSet.size;
  const sevenDayRetention = Math.round((weeklyActiveDays / 7) * 100);
  const lastStudiedAt = allActivityDates.length > 0 ? allActivityDates[0] : user.stats?.lastStudiedAt;

  user.stats.currentStreak = streak.currentStreak;
  user.stats.longestStreak = Math.max(user.stats.longestStreak || 0, streak.longestStreak);
  user.stats.weeklyActiveDays = weeklyActiveDays;
  user.stats.sevenDayRetention = sevenDayRetention;

  if (lastStudiedAt) {
    user.stats.lastStudiedAt = lastStudiedAt;
  }

  if (reviewedIncrement > 0) {
    user.stats.cardsReviewed = (user.stats.cardsReviewed || 0) + reviewedIncrement;
  }

  if (studyTimeIncrementSeconds > 0) {
    user.stats.totalStudyTime = (user.stats.totalStudyTime || 0) + studyTimeIncrementSeconds;
  }

  await user.save();

  return user.stats;
}

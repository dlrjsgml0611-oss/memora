import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Review, Flashcard, User } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { getReviewStats, calculateStreak } from '@/lib/srs/scheduler';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/response';

// GET /api/reviews/stats - Get review statistics
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '7'; // days
    const periodDays = parseInt(period, 10);

    if (isNaN(periodDays) || periodDays < 1) {
      return errorResponse('Invalid period parameter', 400);
    }

    // Get user
    const user = await User.findById(authUser.userId);
    if (!user) {
      return unauthorizedResponse();
    }

    // Get all user's flashcards
    const allFlashcards = await Flashcard.find({ userId: authUser.userId });

    // Get flashcard stats
    const flashcardStats = getReviewStats(allFlashcards);

    // Get recent reviews
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const recentReviews = await Review.find({
      userId: authUser.userId,
      reviewedAt: { $gte: startDate },
    }).sort({ reviewedAt: -1 });

    // Calculate daily review counts
    const dailyCounts: { [key: string]: { total: number; correct: number } } = {};

    recentReviews.forEach((review) => {
      const date = review.reviewedAt.toISOString().split('T')[0];
      if (!dailyCounts[date]) {
        dailyCounts[date] = { total: 0, correct: 0 };
      }
      dailyCounts[date].total++;
      if (review.rating >= 3) {
        dailyCounts[date].correct++;
      }
    });

    // Get all review dates for streak calculation
    const allReviews = await Review.find({ userId: authUser.userId });
    const reviewDates = allReviews.map((r) => r.reviewedAt);
    const streakData = calculateStreak(reviewDates);

    // Calculate accuracy by period
    const correctReviews = recentReviews.filter((r) => r.rating >= 3).length;
    const totalReviews = recentReviews.length;
    const accuracy = totalReviews > 0 ? (correctReviews / totalReviews) * 100 : 0;

    // Calculate average response time
    const avgResponseTime =
      recentReviews.length > 0
        ? recentReviews.reduce((sum, r) => sum + r.responseTime, 0) / recentReviews.length
        : 0;

    // Group reviews by rating
    const ratingCounts = {
      again: recentReviews.filter((r) => r.rating === 1).length,
      hard: recentReviews.filter((r) => r.rating === 2).length,
      good: recentReviews.filter((r) => r.rating === 3).length,
      easy: recentReviews.filter((r) => r.rating === 4).length,
    };

    const stats = {
      flashcards: flashcardStats,
      reviews: {
        total: totalReviews,
        correct: correctReviews,
        accuracy: Math.round(accuracy * 10) / 10,
        avgResponseTime: Math.round(avgResponseTime),
        ratingCounts,
      },
      daily: Object.entries(dailyCounts).map(([date, counts]) => ({
        date,
        total: counts.total,
        correct: counts.correct,
        accuracy: Math.round((counts.correct / counts.total) * 100),
      })),
      streak: streakData,
      user: {
        totalStudyTime: user.stats.totalStudyTime,
        cardsReviewed: user.stats.cardsReviewed,
      },
    };

    return successResponse(stats);
  } catch (error) {
    console.error('Get review stats error:', error);
    return errorResponse('Failed to get review statistics', 500);
  }
}

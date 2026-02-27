import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Review, User } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils/response';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const user = await User.findById(authUser.userId).select('preferences.dailyReviewTarget');

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '14', 10);

    if (Number.isNaN(days) || days < 1 || days > 365) {
      return errorResponse('Invalid days parameter', 400);
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await Review.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(authUser.userId),
          reviewedAt: { $gte: since },
        },
      },
      {
        $lookup: {
          from: 'flashcards',
          localField: 'flashcardId',
          foreignField: '_id',
          as: 'flashcard',
        },
      },
      { $unwind: '$flashcard' },
      {
        $project: {
          rating: 1,
          tags: {
            $cond: [
              {
                $gt: [
                  {
                    $size: {
                      $ifNull: ['$flashcard.tags', []],
                    },
                  },
                  0,
                ],
              },
              '$flashcard.tags',
              ['미분류'],
            ],
          },
        },
      },
      { $unwind: '$tags' },
      {
        $group: {
          _id: '$tags',
          totalReviews: { $sum: 1 },
          weakCount: {
            $sum: {
              $cond: [{ $lte: ['$rating', 2] }, 1, 0],
            },
          },
          correctReviews: {
            $sum: {
              $cond: [{ $gte: ['$rating', 3] }, 1, 0],
            },
          },
          avgRating: { $avg: '$rating' },
        },
      },
      { $sort: { weakCount: -1, totalReviews: -1 } },
      { $limit: 20 },
    ]);

    const goalTarget = Math.max(
      10,
      Math.min(user?.preferences?.dailyReviewTarget || 20, 40)
    );

    const topics = rows
      .filter((row: any) => row.weakCount > 0)
      .slice(0, 10)
      .map((row: any) => {
        const accuracy =
          row.totalReviews > 0
            ? Math.round((row.correctReviews / row.totalReviews) * 1000) / 10
            : 0;
        const ratingScore = Math.max(
          0,
          Math.min(100, ((row.avgRating - 1) / 3) * 100)
        );
        const masteryRate = Math.round((accuracy * 0.7 + ratingScore * 0.3) * 10) / 10;
        const goalProgress = Math.min(
          Math.round((row.totalReviews / goalTarget) * 100),
          100
        );
        const goalRemaining = Math.max(goalTarget - row.totalReviews, 0);
        const achieved = row.totalReviews >= goalTarget && masteryRate >= 80;

        return {
          topic: row._id,
          weakCount: row.weakCount,
          totalReviews: row.totalReviews,
          correctReviews: row.correctReviews,
          avgRating: Math.round(row.avgRating * 100) / 100,
          accuracy,
          masteryRate,
          goalTarget,
          goalProgress,
          goalRemaining,
          achieved,
        };
      });

    const trackedTopics = topics.length;
    const masteredTopics = topics.filter((topic: any) => topic.achieved).length;
    const progressRate =
      trackedTopics > 0
        ? Math.round(
            topics.reduce((sum: number, topic: any) => sum + topic.goalProgress, 0) / trackedTopics
          )
        : 0;

    return successResponse({
      periodDays: days,
      goal: {
        targetReviewsPerTopic: goalTarget,
        trackedTopics,
        masteredTopics,
        progressRate,
      },
      topics,
    });
  } catch (error) {
    console.error('Get weakness topics error:', error);
    return errorResponse('Failed to load weakness topics', 500);
  }
}

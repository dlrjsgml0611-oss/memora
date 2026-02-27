import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { MemoryPalace, MemoryPalaceReview } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { createMemoryPalaceReviewSchema } from '@/lib/utils/validators';
import { refreshUserLearningStats } from '@/lib/stats/userStats';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/utils/response';

// GET /api/memory-palaces/reviews - Get memory palace review history and summary
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || '20'), 1), 100);

    const [items, summaryRows, recentRows] = await Promise.all([
      MemoryPalaceReview.find({ userId: authUser.userId })
        .sort({ finishedAt: -1 })
        .limit(limit)
        .lean(),
      MemoryPalaceReview.aggregate([
        {
          $match: {
            userId: authUser.userId,
          },
        },
        {
          $group: {
            _id: null,
            sessions: { $sum: 1 },
            totalItems: { $sum: '$totalItems' },
            correctItems: { $sum: '$correctItems' },
            totalDurationSec: { $sum: '$durationSec' },
          },
        },
      ]),
      MemoryPalaceReview.aggregate([
        {
          $match: {
            userId: authUser.userId,
            finishedAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
        {
          $group: {
            _id: null,
            sessions: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = summaryRows[0] || {
      sessions: 0,
      totalItems: 0,
      correctItems: 0,
      totalDurationSec: 0,
    };

    const totalItems = summary.totalItems || 0;
    const accuracy = totalItems > 0
      ? Math.round(((summary.correctItems || 0) / totalItems) * 1000) / 10
      : 0;

    return successResponse({
      items,
      summary: {
        sessions: summary.sessions || 0,
        totalItems,
        correctItems: summary.correctItems || 0,
        accuracy,
        totalDurationSec: summary.totalDurationSec || 0,
        last7DaysSessions: recentRows[0]?.sessions || 0,
      },
    });
  } catch (error) {
    console.error('Get memory palace reviews error:', error);
    return errorResponse('Failed to get memory palace reviews', 500);
  }
}

// POST /api/memory-palaces/reviews - Save memory palace review result
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body = await req.json().catch(() => ({}));
    const validation = createMemoryPalaceReviewSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }

    const {
      palaceId,
      palaceTitle,
      totalItems,
      correctItems,
      wrongItems,
      durationSec,
      finishedAt,
    } = validation.data;

    const palace = await MemoryPalace.findById(palaceId).select('_id userId title');
    if (!palace) {
      return notFoundResponse('Memory palace');
    }
    if (palace.userId.toString() !== authUser.userId) {
      return forbiddenResponse('You cannot record reviews for this memory palace');
    }

    const accuracy = totalItems > 0 ? Math.round((correctItems / totalItems) * 1000) / 10 : 0;

    const review = await MemoryPalaceReview.create({
      userId: authUser.userId,
      palaceId,
      palaceTitle: palaceTitle || palace.title,
      totalItems,
      correctItems,
      wrongItems,
      accuracy,
      durationSec,
      finishedAt: finishedAt || new Date(),
    });

    await refreshUserLearningStats(authUser.userId, {
      studyTimeIncrementSeconds: durationSec,
    });

    return successResponse(review, 'Memory palace review saved', 201);
  } catch (error) {
    console.error('Save memory palace review error:', error);
    return errorResponse('Failed to save memory palace review', 500);
  }
}

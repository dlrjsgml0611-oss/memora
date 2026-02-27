import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { MemoryPalaceReview, Review } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils/response';

// GET /api/stats/activity - Get activity heatmap data (last 365 days)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);

    const [reviews, palaceDailyRows, palaceSummaryRows] = await Promise.all([
      Review.aggregate([
        {
          $match: {
            userId: authUser.userId,
            reviewedAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$reviewedAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      MemoryPalaceReview.aggregate([
        {
          $match: {
            userId: authUser.userId,
            finishedAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$finishedAt' },
            },
            count: { $sum: '$totalItems' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      MemoryPalaceReview.aggregate([
        {
          $match: {
            userId: authUser.userId,
            finishedAt: { $gte: startDate, $lte: endDate },
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
    ]);

    const activityMap: Record<string, number> = {};
    reviews.forEach((r: any) => {
      activityMap[r._id] = r.count;
    });
    palaceDailyRows.forEach((row: any) => {
      activityMap[row._id] = (activityMap[row._id] || 0) + row.count;
    });

    const palaceSummary = palaceSummaryRows[0] || {
      sessions: 0,
      totalItems: 0,
      correctItems: 0,
      totalDurationSec: 0,
    };
    const palaceAccuracy = palaceSummary.totalItems > 0
      ? Math.round((palaceSummary.correctItems / palaceSummary.totalItems) * 1000) / 10
      : 0;

    return successResponse({
      activity: activityMap,
      memoryPalace: {
        sessions: palaceSummary.sessions || 0,
        totalItems: palaceSummary.totalItems || 0,
        correctItems: palaceSummary.correctItems || 0,
        accuracy: palaceAccuracy,
        totalDurationSec: palaceSummary.totalDurationSec || 0,
      },
    });
  } catch (error) {
    console.error('Get activity error:', error);
    return errorResponse('Failed to get activity data', 500);
  }
}

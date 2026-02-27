import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Flashcard, Review, StudySession } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/utils/response';

function toPercent(value: number) {
  return Math.round(value * 10) / 10;
}

function getMasteryRate(accuracy: number, avgRating: number) {
  const ratingScore = Math.max(0, Math.min(100, ((avgRating - 1) / 3) * 100));
  return toPercent(accuracy * 0.7 + ratingScore * 0.3);
}

function getGrade(score: number): 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 82) return 'B+';
  if (score >= 74) return 'B';
  if (score >= 65) return 'C';
  return 'D';
}

function buildWeaknessHref(topic?: string) {
  if (!topic || topic === '미분류') return '/weakness';
  return `/review?tag=${encodeURIComponent(topic)}&count=20`;
}

function buildExamHref(topic?: string) {
  if (!topic || topic === '미분류') return '/review?mode=exam&count=20';
  return `/review?mode=exam&tag=${encodeURIComponent(topic)}&count=20`;
}

// GET /api/reviews/sessions/:id/summary - Fetch session summary
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const session: any = await StudySession.findById(id);

    if (!session) {
      return notFoundResponse('StudySession');
    }

    if (session.userId.toString() !== authUser.userId) {
      return forbiddenResponse();
    }

    const [ratingRows, topicRows, tomorrowDue] = await Promise.all([
      Review.aggregate([
        {
          $match: {
            userId: session.userId,
            sessionId: session._id,
          },
        },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
      ]),
      Review.aggregate([
        {
          $match: {
            userId: session.userId,
            sessionId: session._id,
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
            responseTime: 1,
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
            correctReviews: {
              $sum: {
                $cond: [{ $gte: ['$rating', 3] }, 1, 0],
              },
            },
            avgRating: { $avg: '$rating' },
            avgResponseTime: { $avg: '$responseTime' },
          },
        },
        { $sort: { totalReviews: -1 } },
        { $limit: 8 },
      ]),
      (async () => {
        const tomorrowStart = new Date();
        tomorrowStart.setDate(tomorrowStart.getDate() + 1);
        tomorrowStart.setHours(0, 0, 0, 0);

        const tomorrowEnd = new Date(tomorrowStart);
        tomorrowEnd.setHours(23, 59, 59, 999);

        return Flashcard.countDocuments({
          userId: authUser.userId,
          'srs.nextReview': {
            $gte: tomorrowStart,
            $lte: tomorrowEnd,
          },
        });
      })(),
    ]);

    const ratingCounts = { again: 0, hard: 0, good: 0, easy: 0 };
    for (const row of ratingRows) {
      if (row._id === 1) ratingCounts.again = row.count;
      if (row._id === 2) ratingCounts.hard = row.count;
      if (row._id === 3) ratingCounts.good = row.count;
      if (row._id === 4) ratingCounts.easy = row.count;
    }

    const completedAt = session.completedAt ? new Date(session.completedAt) : new Date();
    const startedAt = new Date(session.startedAt);

    const durationSeconds = Math.max(
      session.duration || Math.round((completedAt.getTime() - startedAt.getTime()) / 1000),
      0
    );

    const metrics = session.metrics || {
      totalCards: (session.cardQueue || []).length,
      reviewedCards: 0,
      correctCount: 0,
      incorrectCount: 0,
      avgResponseTime: 0,
      accuracy: 0,
    };

    const topicBreakdown = topicRows.map((row: any) => {
      const accuracy =
        row.totalReviews > 0
          ? toPercent((row.correctReviews / row.totalReviews) * 100)
          : 0;
      const masteryRate = getMasteryRate(accuracy, row.avgRating);

      return {
        topic: row._id,
        totalReviews: row.totalReviews,
        correctReviews: row.correctReviews,
        accuracy,
        avgRating: toPercent(row.avgRating),
        avgResponseTime: Math.round(row.avgResponseTime || 0),
        masteryRate,
      };
    });

    const focusTopics = [...topicBreakdown]
      .sort((a, b) => a.masteryRate - b.masteryRate || b.totalReviews - a.totalReviews)
      .slice(0, 3);

    const strengthTopics = [...topicBreakdown]
      .sort((a, b) => b.masteryRate - a.masteryRate || b.totalReviews - a.totalReviews)
      .slice(0, 3);

    const avgResponseSeconds = toPercent((metrics.avgResponseTime || 0) / 1000);
    const speedScore =
      avgResponseSeconds <= 8
        ? 100
        : avgResponseSeconds >= 35
        ? 40
        : toPercent(100 - ((avgResponseSeconds - 8) / 27) * 60);
    const consistencyScore = metrics.reviewedCards
      ? toPercent(((ratingCounts.good + ratingCounts.easy) / metrics.reviewedCards) * 100)
      : 0;
    const examScore = toPercent(
      (metrics.accuracy || 0) * 0.7 + speedScore * 0.2 + consistencyScore * 0.1
    );
    const examGrade = getGrade(examScore);
    const pass = examScore >= 70;

    const recommendedActions = session.mode === 'exam'
      ? [
          {
            type: 'weakness-drill',
            label: '약점 보강 세션',
            description: '점수가 낮은 주제를 집중 복습합니다.',
            href: buildWeaknessHref(focusTopics[0]?.topic),
          },
          {
            type: 'exam-retry',
            label: '시험 재도전',
            description: '약점 보강 후 동일 조건으로 다시 점검합니다.',
            href: buildExamHref(focusTopics[0]?.topic),
          },
          {
            type: 'loop-home',
            label: '대시보드 학습 루프',
            description: '오늘 학습 루프 진행 상태를 확인합니다.',
            href: '/dashboard',
          },
        ]
      : [
          {
            type: 'next-review',
            label: '다음 복습 시작',
            description: '연속 세션으로 학습 리듬을 이어갑니다.',
            href: '/review',
          },
          {
            type: 'loop-home',
            label: '대시보드 이동',
            description: '오늘 미션과 약점 훈련 단계를 확인합니다.',
            href: '/dashboard',
          },
        ];

    return successResponse({
      session: {
        id: session._id,
        status: session.status,
        mode: session.mode,
        totalCards: metrics.totalCards,
        reviewedCards: metrics.reviewedCards,
        correctCount: metrics.correctCount,
        incorrectCount: metrics.incorrectCount,
        accuracy: metrics.accuracy,
        avgResponseTime: metrics.avgResponseTime,
        durationSeconds,
        startedAt: session.startedAt,
        completedAt: session.completedAt,
      },
      weaknessTopics: (session.weaknessTags || []).map((topic: string) => ({ topic })),
      ratingCounts,
      topicBreakdown,
      examReport: session.mode === 'exam'
        ? {
            score: examScore,
            grade: examGrade,
            pass,
            speedScore,
            consistencyScore,
            avgResponseSeconds,
            focusTopics,
            strengthTopics,
          }
        : null,
      recommendedActions,
      nextDay: {
        dueCount: tomorrowDue,
      },
    });
  } catch (error) {
    console.error('Get review session summary error:', error);
    return errorResponse('Failed to get review session summary', 500);
  }
}

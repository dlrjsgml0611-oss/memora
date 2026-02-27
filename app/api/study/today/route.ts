import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Flashcard, MemoryPalace, MemoryPalaceReview, Review, StudySession, User } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, unauthorizedResponse, notFoundResponse } from '@/lib/utils/response';

function buildWeaknessHref(topic?: string, mode: 'review' | 'exam' = 'review') {
  if (!topic || topic === '미분류') {
    return mode === 'exam' ? '/review?mode=exam&count=20' : '/weakness';
  }

  const encodedTopic = encodeURIComponent(topic);
  return mode === 'exam'
    ? `/review?mode=exam&tag=${encodedTopic}&count=20`
    : `/review?tag=${encodedTopic}&count=20`;
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const user = await User.findById(authUser.userId).select('preferences stats');
    if (!user) {
      return notFoundResponse('User');
    }

    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const [
      dueCount,
      newAvailable,
      todayReviews,
      weakTopicsRaw,
      todayTagPracticeRaw,
      todayExamCompleted,
      todayPalaceSessions,
      totalPalaces,
    ] = await Promise.all([
      Flashcard.countDocuments({
        userId: authUser.userId,
        'srs.nextReview': { $lte: now },
        'srs.state': { $ne: 'new' },
      }),
      Flashcard.countDocuments({
        userId: authUser.userId,
        'srs.state': 'new',
      }),
      Review.countDocuments({
        userId: authUser.userId,
        reviewedAt: { $gte: startOfToday },
      }),
      Review.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(authUser.userId),
            rating: { $lte: 2 },
            reviewedAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
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
          $unwind: {
            path: '$flashcard.tags',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$flashcard.tags', null] },
                    { $eq: ['$flashcard.tags', ''] },
                  ],
                },
                '미분류',
                '$flashcard.tags',
              ],
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      Review.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(authUser.userId),
            reviewedAt: { $gte: startOfToday },
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
            total: { $sum: 1 },
            correct: {
              $sum: {
                $cond: [{ $gte: ['$rating', 3] }, 1, 0],
              },
            },
          },
        },
      ]),
      StudySession.countDocuments({
        userId: authUser.userId,
        mode: 'exam',
        status: 'completed',
        startedAt: { $gte: startOfToday },
      }),
      MemoryPalaceReview.countDocuments({
        userId: authUser.userId,
        finishedAt: { $gte: startOfToday },
      }),
      MemoryPalace.countDocuments({
        userId: authUser.userId,
      }),
    ]);

    const dailyTarget = user.preferences?.dailyReviewTarget || 20;
    const remainingReviews = Math.max(dailyTarget - todayReviews, 0);
    const completionRate = dailyTarget > 0 ? Math.min(Math.round((todayReviews / dailyTarget) * 100), 100) : 0;

    const weakTopics = weakTopicsRaw.map((row: any) => ({
      topic: row._id,
      count: row.count,
    }));

    const todayTagPracticeMap = new Map(
      todayTagPracticeRaw.map((row: any) => [
        row._id,
        {
          total: row.total,
          accuracy: row.total > 0 ? Math.round((row.correct / row.total) * 1000) / 10 : 0,
        },
      ])
    );

    const primaryWeakTopic = weakTopics.find((topic: any) => topic.topic !== '미분류') || weakTopics[0];
    const weakTopicTodayPractice = primaryWeakTopic
      ? todayTagPracticeMap.get(primaryWeakTopic.topic)
      : null;

    const reviewStepDone =
      todayReviews >= Math.min(dailyTarget, 12) || (dueCount === 0 && todayReviews > 0);
    const weaknessStepDone = !primaryWeakTopic
      ? true
      : (weakTopicTodayPractice?.total || 0) >= 10 && (weakTopicTodayPractice?.accuracy || 0) >= 65;
    const memoryPalaceStepDone = totalPalaces === 0 ? true : todayPalaceSessions > 0;
    const examStepDone = todayExamCompleted > 0;

    const learningLoopSteps = [
      {
        key: 'review',
        label: '기본 복습',
        description: dueCount > 0 ? `대기 카드 ${dueCount}개 처리` : '오늘 복습 흐름 시작',
        href: '/review',
        completed: reviewStepDone,
      },
      {
        key: 'weakness',
        label: '약점 집중 훈련',
        description: primaryWeakTopic
          ? `취약 주제 "${primaryWeakTopic.topic}" 보강`
          : '현재 탐지된 취약 주제 없음',
        href: buildWeaknessHref(primaryWeakTopic?.topic, 'review'),
        completed: weaknessStepDone,
      },
      {
        key: 'memory-palace',
        label: '기억의 궁전 회상',
        description: totalPalaces === 0
          ? '생성된 궁전 없음 (선택 학습)'
          : todayPalaceSessions > 0
          ? `오늘 ${todayPalaceSessions}회 회상 완료`
          : '핵심 궁전 1회 빠른 회상',
        href: '/memory-palace',
        completed: memoryPalaceStepDone,
      },
      {
        key: 'exam',
        label: '시험 모드 점검',
        description: primaryWeakTopic
          ? '약점 주제 실전 점검'
          : '전반 실전 점검',
        href: buildWeaknessHref(primaryWeakTopic?.topic, 'exam'),
        completed: examStepDone,
      },
    ] as const;

    const currentStep =
      learningLoopSteps.find((step) => !step.completed)?.key || 'complete';

    const recommendedActions: Array<{
      type:
        | 'due-review'
        | 'new-learning'
        | 'weakness-drill'
        | 'memory-palace-drill'
        | 'exam-practice'
        | 'maintain-streak';
      label: string;
      description: string;
      href: string;
      priority: number;
    }> = [];

    if (!reviewStepDone || dueCount > 0) {
      recommendedActions.push({
        type: 'due-review',
        label: '복습 우선',
        description: `지금 복습할 카드 ${dueCount}개가 있습니다.`,
        href: '/review',
        priority: 1,
      });
    }

    if (!weaknessStepDone && weakTopics.length > 0) {
      recommendedActions.push({
        type: 'weakness-drill',
        label: '약점 보강',
        description: `최근 취약 주제: ${primaryWeakTopic.topic}`,
        href: buildWeaknessHref(primaryWeakTopic?.topic, 'review'),
        priority: 2,
      });
    }

    if (!memoryPalaceStepDone) {
      recommendedActions.push({
        type: 'memory-palace-drill',
        label: '기억의 궁전 회상',
        description: '오늘 최소 1회 회상 훈련으로 인출 감각을 고정하세요.',
        href: '/memory-palace',
        priority: 3,
      });
    }

    if (!examStepDone) {
      recommendedActions.push({
        type: 'exam-practice',
        label: '시험 모드 점검',
        description: '학습 루프 마지막 단계로 실전 점검을 진행하세요.',
        href: buildWeaknessHref(primaryWeakTopic?.topic, 'exam'),
        priority: 4,
      });
    }

    if (remainingReviews > 0 && newAvailable > 0) {
      recommendedActions.push({
        type: 'new-learning',
        label: '신규 학습',
        description: `오늘 목표까지 ${remainingReviews}개 남았습니다. 신규 카드로 채우세요.`,
        href: '/review',
        priority: 5,
      });
    }

    if (recommendedActions.length === 0) {
      recommendedActions.push({
        type: 'maintain-streak',
        label: '스트릭 유지',
        description: '오늘은 가볍게 5분 복습으로 스트릭을 유지하세요.',
        href: '/review',
        priority: 5,
      });
    }

    return successResponse({
      missionDate: startOfToday.toISOString().split('T')[0],
      dailyTarget,
      todayReviews,
      remainingReviews,
      completionRate,
      dueCount,
      newAvailable,
      weakTopics,
      learningLoop: {
        currentStep,
        steps: learningLoopSteps,
        completedSteps: learningLoopSteps.filter((step) => step.completed).length,
        totalSteps: learningLoopSteps.length,
      },
      todayExamCompleted,
      todayPalaceSessions,
      totalPalaces,
      primaryWeakTopic: primaryWeakTopic?.topic || null,
      recommendedActions: recommendedActions.sort((a, b) => a.priority - b.priority),
      retention: user.stats?.sevenDayRetention || 0,
      weeklyActiveDays: user.stats?.weeklyActiveDays || 0,
    });
  } catch (error) {
    console.error('Get today study mission error:', error);
    return errorResponse('Failed to load today study mission', 500);
  }
}

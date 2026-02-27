import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Flashcard, Review, StudySession } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { answerReviewSessionSchema } from '@/lib/utils/validators';
import { scheduleReview } from '@/lib/srs/scheduler';
import { refreshUserLearningStats } from '@/lib/stats/userStats';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  validationErrorResponse,
} from '@/lib/utils/response';

// POST /api/reviews/sessions/:id/answer - Submit one answer in a session
export async function POST(
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
    const session = await StudySession.findById(id);

    if (!session) {
      return notFoundResponse('StudySession');
    }

    if (session.userId.toString() !== authUser.userId) {
      return forbiddenResponse();
    }

    if (session.status !== 'active') {
      return errorResponse('Session is already closed', 400);
    }

    if (!session.metrics) {
      session.metrics = {
        totalCards: (session.cardQueue || []).length,
        reviewedCards: 0,
        correctCount: 0,
        incorrectCount: 0,
        avgResponseTime: 0,
        accuracy: 0,
      };
    }

    const body = await req.json();
    const validation = answerReviewSessionSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }

    const {
      flashcardId,
      rating,
      responseTime,
      aiScore,
      recommendedRating,
      errorType,
    } = validation.data;

    const queueIds = (session.cardQueue || []).map((cardId: any) => cardId.toString());
    if (!queueIds.includes(flashcardId)) {
      return errorResponse('Flashcard is not part of this session', 400);
    }

    const reviewedIdSet = new Set((session.reviewedCardIds || []).map((cardId: any) => cardId.toString()));
    if (reviewedIdSet.has(flashcardId)) {
      return errorResponse('Flashcard already reviewed in this session', 400);
    }

    const flashcard = await Flashcard.findById(flashcardId);
    if (!flashcard) {
      return notFoundResponse('Flashcard');
    }

    if (flashcard.userId.toString() !== authUser.userId) {
      return forbiddenResponse();
    }

    const previousInterval = flashcard.srs.interval;
    const { srs, stats } = scheduleReview(flashcard as any, rating as 1 | 2 | 3 | 4);

    flashcard.srs = srs;
    flashcard.stats = stats;

    const totalTime = flashcard.stats.averageResponseTime * (flashcard.stats.totalReviews - 1) + responseTime;
    flashcard.stats.averageResponseTime = Math.round(totalTime / flashcard.stats.totalReviews);

    if (rating <= 2) {
      flashcard.mistakeCount = (flashcard.mistakeCount || 0) + 1;
      if (errorType) {
        flashcard.lastErrorType = errorType;
      }
      flashcard.examWeight = Math.min((flashcard.examWeight || 1) + 0.1, 5);
    } else {
      flashcard.mistakeCount = Math.max((flashcard.mistakeCount || 0) - 1, 0);
      flashcard.examWeight = Math.max((flashcard.examWeight || 1) - 0.05, 0.2);
    }

    await flashcard.save();

    await Review.create({
      userId: authUser.userId,
      flashcardId,
      sessionId: session._id,
      rating,
      responseTime,
      aiScore,
      recommendedRating,
      finalRatingDiff:
        recommendedRating && Number.isFinite(recommendedRating)
          ? Math.abs(recommendedRating - rating)
          : undefined,
      previousInterval,
      newInterval: srs.interval,
      reviewedAt: new Date(),
    });

    session.reviewedCardIds = [...(session.reviewedCardIds || []), flashcard._id];
    session.metrics.reviewedCards += 1;
    session.metrics.correctCount += rating >= 3 ? 1 : 0;
    session.metrics.incorrectCount += rating <= 2 ? 1 : 0;

    const prevCount = session.metrics.reviewedCards - 1;
    session.metrics.avgResponseTime = Math.round(
      (session.metrics.avgResponseTime * prevCount + responseTime) / session.metrics.reviewedCards
    );
    session.metrics.accuracy =
      session.metrics.reviewedCards > 0
        ? Math.round((session.metrics.correctCount / session.metrics.reviewedCards) * 1000) / 10
        : 0;

    session.cardsReviewed = session.metrics.reviewedCards;
    session.accuracy = session.metrics.accuracy;
    session.duration = Math.max(
      Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000),
      0
    );

    if (rating <= 2) {
      const currentWeakness = new Set(session.weaknessTags || []);
      const tags = Array.isArray(flashcard.tags) ? flashcard.tags.slice(0, 3) : [];
      if (tags.length > 0) {
        tags.forEach((tag: string) => currentWeakness.add(tag));
      } else {
        currentWeakness.add('미분류');
      }
      session.weaknessTags = Array.from(currentWeakness).slice(0, 20);
    }

    if (session.metrics.reviewedCards >= session.metrics.totalCards) {
      session.status = 'completed';
      session.completionReason = 'completed';
      session.completedAt = new Date();
    }

    await session.save();

    await refreshUserLearningStats(authUser.userId, {
      reviewedIncrement: 1,
      studyTimeIncrementSeconds: Math.round(responseTime / 1000),
    });

    const updatedReviewedIds = new Set((session.reviewedCardIds || []).map((cardId: any) => cardId.toString()));
    const nextCardId = queueIds.find((cardId: string) => !updatedReviewedIds.has(cardId)) || null;

    return successResponse({
      session: {
        id: session._id,
        status: session.status,
        reviewedCards: session.metrics.reviewedCards,
        totalCards: session.metrics.totalCards,
        accuracy: session.metrics.accuracy,
        remainingCards: Math.max(session.metrics.totalCards - session.metrics.reviewedCards, 0),
      },
      flashcard: {
        id: flashcard._id,
        srs: flashcard.srs,
        stats: flashcard.stats,
      },
      nextCardId,
    });
  } catch (error) {
    console.error('Submit review session answer error:', error);
    return errorResponse('Failed to submit answer', 500);
  }
}

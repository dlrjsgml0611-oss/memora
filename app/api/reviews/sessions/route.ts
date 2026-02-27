import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Flashcard, StudySession } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { createReviewSessionSchema } from '@/lib/utils/validators';
import { buildReviewQueue, buildExamQueue } from '@/lib/study/session';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/response';

function mapSessionCard(card: any) {
  return {
    _id: card._id,
    conceptId: card.conceptId,
    type: card.type,
    front: card.front,
    back: card.back,
    hint: card.hint,
    tags: card.tags || [],
    srs: card.srs,
    stats: card.stats,
    mistakeCount: card.mistakeCount || 0,
    examWeight: card.examWeight || 1,
  };
}

// POST /api/reviews/sessions - Create a new review or exam session
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body = await req.json().catch(() => ({}));
    const validation = createReviewSessionSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }

    const {
      mode,
      source,
      maxCards,
      maxNew,
      weaknessBoost,
      conceptId,
      tag,
    } = validation.data;

    const query: any = { userId: authUser.userId };
    if (conceptId) {
      query.conceptId = conceptId;
    }
    if (tag) {
      query.tags = tag;
    }

    const flashcards = await Flashcard.find(query)
      .sort({ 'srs.nextReview': 1 })
      .lean();

    const queueResult =
      mode === 'exam'
        ? {
            queue: buildExamQueue(flashcards as any, { count: maxCards }),
            stats: {
              dueCount: 0,
              weakCount: 0,
              newIncluded: 0,
            },
          }
        : buildReviewQueue(flashcards as any, {
            maxCards,
            maxNew,
            weaknessBoost,
          });

    const queueCards = queueResult.queue;

    const session = await StudySession.create({
      userId: authUser.userId,
      type: mode === 'exam' ? 'exam' : 'review',
      mode,
      source,
      status: 'active',
      cardQueue: queueCards.map((card: any) => card._id),
      reviewedCardIds: [],
      sessionMeta: {
        maxCards,
        maxNew,
        weaknessBoost,
        filters: {
          conceptId,
          tag,
        },
      },
      metrics: {
        totalCards: queueCards.length,
        reviewedCards: 0,
        correctCount: 0,
        incorrectCount: 0,
        avgResponseTime: 0,
        accuracy: 0,
      },
      weaknessTags: [],
      cardsReviewed: 0,
      duration: 0,
      accuracy: 0,
      startedAt: new Date(),
    });

    return successResponse(
      {
        session: {
          id: session._id,
          mode: session.mode,
          source: session.source,
          status: session.status,
          totalCards: session.metrics.totalCards,
          startedAt: session.startedAt,
        },
        cards: queueCards.map(mapSessionCard),
        queueStats: queueResult.stats,
      },
      'Session created successfully',
      201
    );
  } catch (error) {
    console.error('Create review session error:', error);
    return errorResponse('Failed to create review session', 500);
  }
}

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Flashcard, StudySession } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { createExamSessionSchema } from '@/lib/utils/validators';
import { buildExamQueue } from '@/lib/study/session';
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

// POST /api/exams/sessions - Create exam practice session
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body = await req.json().catch(() => ({}));
    const validation = createExamSessionSchema.safeParse(body);

    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }

    const { count, conceptId, tag, timeLimitMinutes } = validation.data;

    const flashcards = await Flashcard.find({ userId: authUser.userId }).lean();
    const queue = buildExamQueue(flashcards as any, { count, conceptId, tag });

    if (queue.length === 0) {
      return errorResponse('No eligible flashcards found for exam session', 400);
    }

    const session = await StudySession.create({
      userId: authUser.userId,
      type: 'exam',
      mode: 'exam',
      source: 'exam',
      status: 'active',
      cardQueue: queue.map((card: any) => card._id),
      reviewedCardIds: [],
      sessionMeta: {
        maxCards: count,
        timeLimitMinutes,
        filters: {
          conceptId,
          tag,
        },
      },
      metrics: {
        totalCards: queue.length,
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
          status: session.status,
          totalCards: session.metrics.totalCards,
          timeLimitMinutes,
          startedAt: session.startedAt,
        },
        cards: queue.map(mapSessionCard),
      },
      'Exam session created successfully',
      201
    );
  } catch (error) {
    console.error('Create exam session error:', error);
    return errorResponse('Failed to create exam session', 500);
  }
}

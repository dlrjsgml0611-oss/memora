import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Concept, Curriculum, Flashcard } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { aiRouter } from '@/lib/ai/router';
import { initializeSM2 } from '@/lib/srs/sm2';
import { generateConceptFlashcardsSchema } from '@/lib/utils/validators';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  rateLimitResponse,
  validationErrorResponse,
} from '@/lib/utils/response';
import { attachRateLimitHeaders, consumeUserRateLimit } from '@/lib/rate-limit';

// Increase timeout for AI generation (5 minutes)
export const maxDuration = 300;
const AI_GENERATION_RATE_LIMIT = {
  routeKey: 'ai:concept-flashcards',
  maxPerMinute: 10,
  maxPerDay: 100,
} as const;

// POST /api/concepts/:id/flashcards - Generate flashcards from concept
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const concept = await Concept.findById(id);
    if (!concept) {
      return notFoundResponse('Concept');
    }

    const curriculum = await Curriculum.findById(concept.curriculumId).select('userId');
    if (!curriculum) {
      return notFoundResponse('Curriculum');
    }
    if (curriculum.userId.toString() !== authUser.userId) {
      return forbiddenResponse('You cannot generate flashcards for this concept');
    }

    const body = await req.json().catch(() => ({}));
    const validation = generateConceptFlashcardsSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }
    const { count } = validation.data;

    const rateLimit = consumeUserRateLimit(authUser.userId, AI_GENERATION_RATE_LIMIT);
    if (!rateLimit.allowed) {
      console.info('[ai.generate]', {
        route: '/api/concepts/[id]/flashcards',
        userId: authUser.userId,
        costType: 'flashcards',
        result: 'deny',
      });
      const blocked = rateLimitResponse(
        'AI flashcard generation limit exceeded. Please try again later.',
        rateLimit.retryAfterSec
      );
      return attachRateLimitHeaders(blocked, rateLimit.headers);
    }

    console.info('[ai.generate]', {
      route: '/api/concepts/[id]/flashcards',
      userId: authUser.userId,
      costType: 'flashcards',
      result: 'allow',
    });

    // Generate flashcards using AI
    const flashcardsData = await aiRouter.generateFlashcards(
      concept.content.text,
      count
    );

    // Create flashcards in database
    const srsData = initializeSM2();
    const flashcards = await Promise.all(
      flashcardsData.map((cardData: any) =>
        Flashcard.create({
          userId: authUser.userId,
          conceptId: concept._id,
          type: 'basic',
          front: cardData.front,
          back: cardData.back,
          hint: cardData.hint || '',
          srs: srsData,
          stats: {
            totalReviews: 0,
            correctCount: 0,
            incorrectCount: 0,
            averageResponseTime: 0,
          },
        })
      )
    );

    const response = successResponse(
      { flashcards, count: flashcards.length },
      `${flashcards.length}개의 플래시카드가 생성되었습니다`,
      201
    );
    return attachRateLimitHeaders(response, rateLimit.headers);
  } catch (error) {
    console.error('Generate flashcards error:', error);
    if (
      typeof (error as any)?.message === 'string' &&
      (error as any).message.startsWith('Missing required environment variable:')
    ) {
      return errorResponse((error as any).message, 400);
    }
    return errorResponse('Failed to generate flashcards', 500);
  }
}

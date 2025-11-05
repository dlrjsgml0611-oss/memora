import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Concept, Flashcard } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { aiRouter } from '@/lib/ai/router';
import { initializeSM2 } from '@/lib/srs/sm2';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/utils/response';

// Increase timeout for AI generation (5 minutes)
export const maxDuration = 300;

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

    const body = await req.json();
    const { count = 5 } = body;

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

    return successResponse(
      { flashcards, count: flashcards.length },
      `${flashcards.length}개의 플래시카드가 생성되었습니다`,
      201
    );
  } catch (error) {
    console.error('Generate flashcards error:', error);
    return errorResponse('Failed to generate flashcards', 500);
  }
}

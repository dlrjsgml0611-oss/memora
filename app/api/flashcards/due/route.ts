import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Flashcard } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { getDueCards, getNewCards } from '@/lib/srs/scheduler';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/response';

// GET /api/flashcards/due - Get cards due for review today
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const includeNew = searchParams.get('includeNew') === 'true';
    const newLimit = parseInt(searchParams.get('newLimit') || '10', 10);

    if (isNaN(newLimit) || newLimit < 1) {
      return errorResponse('Invalid newLimit parameter', 400);
    }

    // Get all user's flashcards
    const allCards = await Flashcard.find({ userId: authUser.userId })
      .populate('conceptId', 'title');

    // Get due cards
    const dueCards = getDueCards(allCards);

    // Optionally include new cards
    let cards = dueCards;
    if (includeNew) {
      const newCards = getNewCards(allCards, newLimit);
      cards = [...dueCards, ...newCards];
    }

    return successResponse({
      total: cards.length,
      dueCount: dueCards.length,
      cards: cards,
    });
  } catch (error) {
    console.error('Get due cards error:', error);
    return errorResponse('Failed to get due cards', 500);
  }
}

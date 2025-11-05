import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Flashcard } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { createFlashcardSchema } from '@/lib/utils/validators';
import { initializeSM2 } from '@/lib/srs/sm2';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
  paginatedResponse,
} from '@/lib/utils/response';

// GET /api/flashcards - Get all flashcards for the user
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const conceptId = searchParams.get('conceptId');

    if (isNaN(page) || page < 1) {
      return errorResponse('Invalid page parameter', 400);
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return errorResponse('Invalid limit parameter (must be 1-100)', 400);
    }

    const query: any = { userId: authUser.userId };
    if (conceptId) {
      query.conceptId = conceptId;
    }

    const total = await Flashcard.countDocuments(query);
    const flashcards = await Flashcard.find(query)
      .sort({ 'srs.nextReview': 1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('conceptId', 'title');

    return paginatedResponse(flashcards, total, page, limit);
  } catch (error) {
    console.error('Get flashcards error:', error);
    return errorResponse('Failed to get flashcards', 500);
  }
}

// POST /api/flashcards - Create a new flashcard
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body = await req.json();

    // Validate input
    const validation = createFlashcardSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }

    const { front, back, hint, type, conceptId } = validation.data;

    // Initialize SRS data
    const srsData = initializeSM2();

    // Create flashcard
    const flashcard = await Flashcard.create({
      userId: authUser.userId,
      conceptId: conceptId || undefined,
      type: type || 'basic',
      front,
      back,
      hint: hint || '',
      srs: srsData,
      stats: {
        totalReviews: 0,
        correctCount: 0,
        incorrectCount: 0,
        averageResponseTime: 0,
      },
    });

    return successResponse(flashcard, 'Flashcard created successfully', 201);
  } catch (error) {
    console.error('Create flashcard error:', error);
    return errorResponse('Failed to create flashcard', 500);
  }
}

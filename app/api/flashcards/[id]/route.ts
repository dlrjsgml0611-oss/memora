import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Flashcard } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
  noContentResponse,
} from '@/lib/utils/response';

// GET /api/flashcards/:id - Get a single flashcard
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
    const flashcard = await Flashcard.findById(id).populate('conceptId', 'title');

    if (!flashcard) {
      return notFoundResponse('Flashcard');
    }

    // Check ownership
    if (flashcard.userId.toString() !== authUser.userId) {
      return forbiddenResponse();
    }

    return successResponse(flashcard);
  } catch (error) {
    console.error('Get flashcard error:', error);
    return errorResponse('Failed to get flashcard', 500);
  }
}

// PUT /api/flashcards/:id - Update a flashcard
export async function PUT(
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
    const flashcard = await Flashcard.findById(id);

    if (!flashcard) {
      return notFoundResponse('Flashcard');
    }

    // Check ownership
    if (flashcard.userId.toString() !== authUser.userId) {
      return forbiddenResponse();
    }

    const body = await req.json();
    const {
      front,
      back,
      hint,
      type,
      tags,
      isFavorite,
      lastErrorType,
      mistakeCount,
      examWeight,
    } = body;

    // Update fields
    if (front !== undefined) flashcard.front = front;
    if (back !== undefined) flashcard.back = back;
    if (hint !== undefined) flashcard.hint = hint;
    if (type !== undefined) flashcard.type = type;
    if (tags !== undefined) flashcard.tags = tags;
    if (isFavorite !== undefined) flashcard.isFavorite = isFavorite;
    if (lastErrorType !== undefined) flashcard.lastErrorType = lastErrorType;
    if (mistakeCount !== undefined) flashcard.mistakeCount = mistakeCount;
    if (examWeight !== undefined) flashcard.examWeight = examWeight;

    await flashcard.save();

    return successResponse(flashcard, 'Flashcard updated successfully');
  } catch (error) {
    console.error('Update flashcard error:', error);
    return errorResponse('Failed to update flashcard', 500);
  }
}

// DELETE /api/flashcards/:id - Delete a flashcard
export async function DELETE(
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
    const flashcard = await Flashcard.findById(id);

    if (!flashcard) {
      return notFoundResponse('Flashcard');
    }

    // Check ownership
    if (flashcard.userId.toString() !== authUser.userId) {
      return forbiddenResponse();
    }

    await flashcard.deleteOne();

    return noContentResponse();
  } catch (error) {
    console.error('Delete flashcard error:', error);
    return errorResponse('Failed to delete flashcard', 500);
  }
}

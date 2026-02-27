import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db/mongodb';
import { Flashcard } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/utils/response';

// GET /api/flashcards/print - Get flashcards for printing
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'due'; // due, all, random
    const count = Math.min(parseInt(searchParams.get('count') || '20', 10), 50);
    const userId = new mongoose.Types.ObjectId(authUser.userId);

    let flashcards;

    if (mode === 'due') {
      flashcards = await Flashcard.find({
        userId,
        'srs.nextReview': { $lte: new Date() }
      }).sort({ 'srs.nextReview': 1 }).limit(count);
    } else if (mode === 'random') {
      flashcards = await Flashcard.aggregate([
        { $match: { userId } },
        { $sample: { size: count } }
      ]);
    } else {
      flashcards = await Flashcard.find({ userId }).sort({ createdAt: -1 }).limit(count);
    }

    return successResponse(flashcards);
  } catch (error) {
    console.error('Get print flashcards error:', error);
    return errorResponse('Failed to get flashcards', 500);
  }
}

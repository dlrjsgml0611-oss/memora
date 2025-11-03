import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Flashcard, Review, User } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { reviewFlashcardSchema } from '@/lib/utils/validators';
import { scheduleReview } from '@/lib/srs/scheduler';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  validationErrorResponse,
  forbiddenResponse,
} from '@/lib/utils/response';

// POST /api/reviews - Record a flashcard review
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body = await req.json();

    // Validate input
    const validation = reviewFlashcardSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }

    const { flashcardId, rating, responseTime } = validation.data;

    // Find flashcard
    const flashcard = await Flashcard.findById(flashcardId);

    if (!flashcard) {
      return notFoundResponse('Flashcard');
    }

    // Check ownership
    if (flashcard.userId.toString() !== authUser.userId) {
      return forbiddenResponse();
    }

    // Record previous interval
    const previousInterval = flashcard.srs.interval;

    // Calculate new SRS parameters
    const { srs, stats } = scheduleReview(flashcard, rating as 1 | 2 | 3 | 4);

    // Update flashcard
    flashcard.srs = srs;
    flashcard.stats = stats;

    // Update average response time
    const totalTime = flashcard.stats.averageResponseTime * (flashcard.stats.totalReviews - 1) + responseTime;
    flashcard.stats.averageResponseTime = Math.round(totalTime / flashcard.stats.totalReviews);

    await flashcard.save();

    // Create review record
    const review = await Review.create({
      userId: authUser.userId,
      flashcardId,
      rating,
      responseTime,
      previousInterval,
      newInterval: srs.interval,
      reviewedAt: new Date(),
    });

    // Update user stats
    await User.findByIdAndUpdate(authUser.userId, {
      $inc: {
        'stats.cardsReviewed': 1,
        'stats.totalStudyTime': Math.round(responseTime / 1000),
      },
    });

    return successResponse(
      {
        review,
        flashcard: {
          id: flashcard._id,
          srs: flashcard.srs,
          stats: flashcard.stats,
        },
      },
      'Review recorded successfully',
      201
    );
  } catch (error) {
    console.error('Create review error:', error);
    return errorResponse('Failed to record review', 500);
  }
}

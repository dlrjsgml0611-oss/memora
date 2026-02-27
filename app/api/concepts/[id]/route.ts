import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Concept, Curriculum, Flashcard } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import {
  codedErrorResponse,
  forbiddenResponse,
  noContentResponse,
  notFoundResponse,
  unauthorizedResponse,
} from '@/lib/utils/response';

// DELETE /api/concepts/:id - Delete concept owned by current user
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
    const concept = await Concept.findById(id).select('_id curriculumId');
    if (!concept) {
      return notFoundResponse('Concept');
    }

    const curriculum = await Curriculum.findOne({
      _id: concept.curriculumId,
      userId: authUser.userId,
    }).select('_id');

    if (!curriculum) {
      return forbiddenResponse('You cannot delete this concept');
    }

    await Promise.all([
      Concept.findByIdAndDelete(id),
      Concept.updateMany({ relatedConcepts: id }, { $pull: { relatedConcepts: id } }),
      Flashcard.deleteMany({ userId: authUser.userId, conceptId: id }),
    ]);

    return noContentResponse();
  } catch (error) {
    console.error('Delete concept error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to delete concept', 500);
  }
}

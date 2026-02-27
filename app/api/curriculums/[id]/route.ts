import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Curriculum } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import {
  getCurriculumTopicIds,
  normalizeCurriculumDocumentV2,
} from '@/lib/curriculum/v2';
import { updateCurriculumProgressSchema } from '@/lib/utils/validators';
import {
  codedErrorResponse,
  forbiddenResponse,
  noContentResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/response';

// GET /api/curriculums/:id - Get a single curriculum
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
    const curriculum = await Curriculum.findOne({ _id: id }).lean();

    if (!curriculum || Array.isArray(curriculum)) {
      return notFoundResponse('Curriculum');
    }

    const curriculumRecord = curriculum as Record<string, unknown>;
    if (String(curriculumRecord.userId || '') !== authUser.userId) {
      return forbiddenResponse();
    }

    return successResponse(normalizeCurriculumDocumentV2(curriculumRecord));
  } catch (error) {
    console.error('Get curriculum error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to get curriculum', 500);
  }
}

// PATCH /api/curriculums/:id - Toggle topic completion
export async function PATCH(
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
    const body = await req.json().catch(() => ({}));
    const validation = updateCurriculumProgressSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }

    const { topicId, completed } = validation.data;

    const curriculum = await Curriculum.findById(id);
    if (!curriculum) {
      return notFoundResponse('Curriculum');
    }

    if (curriculum.userId.toString() !== authUser.userId) {
      return forbiddenResponse();
    }

    const source = curriculum.toObject();
    const topicIds = getCurriculumTopicIds(source);
    if (!topicIds.includes(topicId)) {
      return codedErrorResponse('BAD_REQUEST', 'Topic does not belong to this curriculum', 400);
    }

    const completedSet = new Set<string>(curriculum.progress.completedTopics || []);
    if (completed) {
      completedSet.add(topicId);
    } else {
      completedSet.delete(topicId);
    }

    const completedTopics = Array.from(completedSet);
    const totalTopics = topicIds.length;
    const overallPercentage = totalTopics > 0
      ? Math.round((completedTopics.length / totalTopics) * 100)
      : 0;

    const normalized = normalizeCurriculumDocumentV2({ ...source, progress: curriculum.progress });
    const firstIncompleteModule = normalized.structure.find((module) =>
      module.topics.some((topic) => !completedSet.has(topic.topicId))
    );

    curriculum.progress.completedTopics = completedTopics;
    curriculum.progress.overallPercentage = overallPercentage;
    curriculum.progress.currentModule =
      firstIncompleteModule?.moduleId || normalized.structure.at(-1)?.moduleId || '';

    await curriculum.save();

    return successResponse({
      completedTopics,
      overallPercentage,
      currentModule: curriculum.progress.currentModule,
    });
  } catch (error) {
    console.error('Update curriculum progress error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to update progress', 500);
  }
}

// DELETE /api/curriculums/:id - Delete a curriculum
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
    const curriculum = await Curriculum.findById(id);

    if (!curriculum) {
      return notFoundResponse('Curriculum');
    }

    if (curriculum.userId.toString() !== authUser.userId) {
      return forbiddenResponse();
    }

    await curriculum.deleteOne();

    return noContentResponse();
  } catch (error) {
    console.error('Delete curriculum error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to delete curriculum', 500);
  }
}

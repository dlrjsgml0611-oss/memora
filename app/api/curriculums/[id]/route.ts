import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Curriculum } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  forbiddenResponse,
  noContentResponse,
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
    const curriculum = await Curriculum.findById(id);

    if (!curriculum) {
      return notFoundResponse('Curriculum');
    }

    // Check ownership
    if (curriculum.userId.toString() !== authUser.userId) {
      return forbiddenResponse();
    }

    return successResponse(curriculum);
  } catch (error) {
    console.error('Get curriculum error:', error);
    return errorResponse('Failed to get curriculum', 500);
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

    // Check ownership
    if (curriculum.userId.toString() !== authUser.userId) {
      return forbiddenResponse();
    }

    await curriculum.deleteOne();

    return noContentResponse();
  } catch (error) {
    console.error('Delete curriculum error:', error);
    return errorResponse('Failed to delete curriculum', 500);
  }
}

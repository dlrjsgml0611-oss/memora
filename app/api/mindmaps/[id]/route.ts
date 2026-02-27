import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Mindmap } from '@/lib/db/models/Mindmap';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { normalizeMindmapDocumentV2, normalizeMindmapV2 } from '@/lib/mindmap/v2';
import { updateMindmapSchema } from '@/lib/utils/validators';
import {
  codedErrorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/response';

// GET - Get specific mindmap
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    await connectDB();

    const mindmap = await Mindmap.findOne({
      _id: id,
      userId: authUser.userId,
    });

    if (!mindmap) {
      return notFoundResponse('Mindmap');
    }

    return successResponse(normalizeMindmapDocumentV2(mindmap.toObject()));
  } catch (error) {
    console.error('Get mindmap error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to get mindmap', 500);
  }
}

// PATCH - Update mindmap
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const validation = updateMindmapSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }
    const mindmapV2 = normalizeMindmapV2(validation.data.mindmap ?? validation.data.structure);

    await connectDB();

    const mindmap = await Mindmap.findOneAndUpdate(
      {
        _id: id,
        userId: authUser.userId,
      },
      { structure: mindmapV2 },
      { new: true }
    );

    if (!mindmap) {
      return notFoundResponse('Mindmap');
    }

    return successResponse(normalizeMindmapDocumentV2(mindmap.toObject()));
  } catch (error) {
    console.error('Update mindmap error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to update mindmap', 500);
  }
}

// DELETE - Delete mindmap
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    await connectDB();

    const mindmap = await Mindmap.findOneAndDelete({
      _id: id,
      userId: authUser.userId,
    });

    if (!mindmap) {
      return notFoundResponse('Mindmap');
    }

    return successResponse({ deleted: true }, 'Mindmap deleted successfully');
  } catch (error) {
    console.error('Delete mindmap error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to delete mindmap', 500);
  }
}

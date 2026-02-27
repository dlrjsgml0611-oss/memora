import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Mindmap } from '@/lib/db/models/Mindmap';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { normalizeMindmapDocumentV2, normalizeMindmapV2 } from '@/lib/mindmap/v2';
import { createMindmapSchema } from '@/lib/utils/validators';
import {
  codedErrorResponse,
  createdResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/response';

// GET - Get all mindmaps for user
export async function GET(req: NextRequest) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    await connectDB();

    const mindmaps = await Mindmap.find({ userId: authUser.userId })
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(mindmaps.map((mindmap) => normalizeMindmapDocumentV2(mindmap)));
  } catch (error) {
    console.error('Get mindmaps error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to get mindmaps', 500);
  }
}

// POST - Create new mindmap
export async function POST(req: NextRequest) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body = await req.json().catch(() => ({}));
    const validation = createMindmapSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }
    const { title } = validation.data;
    const mindmapV2 = normalizeMindmapV2(validation.data.mindmap ?? validation.data.structure);

    await connectDB();

    const mindmap = await Mindmap.create({
      userId: authUser.userId,
      title,
      structure: mindmapV2,
    });

    return createdResponse(normalizeMindmapDocumentV2(mindmap.toObject()));
  } catch (error) {
    console.error('Create mindmap error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to create mindmap', 500);
  }
}

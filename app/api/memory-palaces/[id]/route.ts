import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { MemoryPalace } from '@/lib/db/models/MemoryPalace';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { normalizeMemoryPalaceDocumentV2, normalizePalaceV2 } from '@/lib/memory-palace/v2';
import { updateMemoryPalaceSchema } from '@/lib/utils/validators';
import {
  codedErrorResponse,
  notFoundResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/response';

// GET - Get specific memory palace
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

    const palace = await MemoryPalace.findOne({
      _id: id,
      userId: authUser.userId,
    });

    if (!palace) {
      return notFoundResponse('Memory palace');
    }

    return successResponse(normalizeMemoryPalaceDocumentV2(palace.toObject()));
  } catch (error) {
    console.error('Get memory palace error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to get memory palace', 500);
  }
}

// PATCH - Update memory palace
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
    const validation = updateMemoryPalaceSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }
    const palaceV2 = normalizePalaceV2(validation.data.palace ?? validation.data.rooms);

    await connectDB();

    const existingPalace = await MemoryPalace.findOne({
      _id: id,
      userId: authUser.userId,
    });

    if (!existingPalace) {
      return notFoundResponse('Memory palace');
    }

    const palace = await MemoryPalace.findOneAndUpdate(
      {
        _id: id,
        userId: authUser.userId,
      },
      { rooms: palaceV2 },
      { new: true }
    );

    if (!palace) {
      return notFoundResponse('Memory palace');
    }

    return successResponse(normalizeMemoryPalaceDocumentV2(palace.toObject()));
  } catch (error) {
    console.error('Update memory palace error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to update memory palace', 500);
  }
}

// DELETE - Delete memory palace
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

    const palace = await MemoryPalace.findOneAndDelete({
      _id: id,
      userId: authUser.userId,
    });

    if (!palace) {
      return notFoundResponse('Memory palace');
    }

    return successResponse({ deleted: true }, 'Memory palace deleted successfully');
  } catch (error) {
    console.error('Delete memory palace error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to delete memory palace', 500);
  }
}

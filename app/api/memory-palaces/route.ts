import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { MemoryPalace } from '@/lib/db/models/MemoryPalace';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { normalizeMemoryPalaceDocumentV2, normalizePalaceV2 } from '@/lib/memory-palace/v2';
import { createMemoryPalaceSchema } from '@/lib/utils/validators';
import {
  codedErrorResponse,
  createdResponse,
  successResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/response';

// GET - Get all memory palaces for user
export async function GET(req: NextRequest) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    await connectDB();

    const palaces = await MemoryPalace.find({ userId: authUser.userId })
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(palaces.map((palace) => normalizeMemoryPalaceDocumentV2(palace)));
  } catch (error) {
    console.error('Get memory palaces error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to get memory palaces', 500);
  }
}

// POST - Create new memory palace
export async function POST(req: NextRequest) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body = await req.json().catch(() => ({}));
    const validation = createMemoryPalaceSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }
    const { title } = validation.data;
    const palaceV2 = normalizePalaceV2(validation.data.palace ?? validation.data.rooms);

    await connectDB();

    const palace = await MemoryPalace.create({
      userId: authUser.userId,
      title,
      rooms: palaceV2,
    });

    return createdResponse(normalizeMemoryPalaceDocumentV2(palace.toObject()));
  } catch (error) {
    console.error('Create memory palace error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to create memory palace', 500);
  }
}

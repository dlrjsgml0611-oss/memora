import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { MemoryPalace } from '@/lib/db/models/MemoryPalace';
import { getUserFromRequest } from '@/lib/auth/middleware';

// GET - Get all memory palaces for user
export async function GET(req: NextRequest) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const palaces = await MemoryPalace.find({ userId: authUser.userId })
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: palaces,
    });
  } catch (error: any) {
    console.error('Get memory palaces error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get memory palaces' },
      { status: 500 }
    );
  }
}

// POST - Create new memory palace
export async function POST(req: NextRequest) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, rooms } = body;

    if (!title || !rooms) {
      return NextResponse.json(
        { success: false, error: 'Title and rooms are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const palace = await MemoryPalace.create({
      userId: authUser.userId,
      title,
      rooms,
    });

    return NextResponse.json({
      success: true,
      data: palace,
    });
  } catch (error: any) {
    console.error('Create memory palace error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create memory palace' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Mindmap } from '@/lib/db/models/Mindmap';
import { getUserFromRequest } from '@/lib/auth/middleware';

// GET - Get all mindmaps for user
export async function GET(req: NextRequest) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const mindmaps = await Mindmap.find({ userId: authUser.userId })
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: mindmaps,
    });
  } catch (error: any) {
    console.error('Get mindmaps error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get mindmaps' },
      { status: 500 }
    );
  }
}

// POST - Create new mindmap
export async function POST(req: NextRequest) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, structure } = body;

    if (!title || !structure) {
      return NextResponse.json(
        { success: false, error: 'Title and structure are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const mindmap = await Mindmap.create({
      userId: authUser.userId,
      title,
      structure,
    });

    return NextResponse.json({
      success: true,
      data: mindmap,
    });
  } catch (error: any) {
    console.error('Create mindmap error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create mindmap' },
      { status: 500 }
    );
  }
}

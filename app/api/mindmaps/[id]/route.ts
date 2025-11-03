import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Mindmap } from '@/lib/db/models/Mindmap';
import { getUserFromRequest } from '@/lib/auth/middleware';

// GET - Get specific mindmap
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    const mindmap = await Mindmap.findOne({
      _id: id,
      userId: authUser.userId,
    });

    if (!mindmap) {
      return NextResponse.json(
        { success: false, error: 'Mindmap not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mindmap,
    });
  } catch (error: any) {
    console.error('Get mindmap error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get mindmap' },
      { status: 500 }
    );
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { structure } = body;

    if (!structure) {
      return NextResponse.json(
        { success: false, error: 'Structure is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const mindmap = await Mindmap.findOneAndUpdate(
      {
        _id: id,
        userId: authUser.userId,
      },
      { structure },
      { new: true }
    );

    if (!mindmap) {
      return NextResponse.json(
        { success: false, error: 'Mindmap not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mindmap,
    });
  } catch (error: any) {
    console.error('Update mindmap error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update mindmap' },
      { status: 500 }
    );
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    const mindmap = await Mindmap.findOneAndDelete({
      _id: id,
      userId: authUser.userId,
    });

    if (!mindmap) {
      return NextResponse.json(
        { success: false, error: 'Mindmap not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mindmap deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete mindmap error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete mindmap' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { MemoryPalace } from '@/lib/db/models/MemoryPalace';
import { getUserFromRequest } from '@/lib/auth/middleware';

// GET - Get specific memory palace
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

    const palace = await MemoryPalace.findOne({
      _id: id,
      userId: authUser.userId,
    });

    if (!palace) {
      return NextResponse.json(
        { success: false, error: 'Memory palace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: palace,
    });
  } catch (error: any) {
    console.error('Get memory palace error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get memory palace' },
      { status: 500 }
    );
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { rooms } = body;

    if (!rooms) {
      return NextResponse.json(
        { success: false, error: 'Rooms are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const palace = await MemoryPalace.findOneAndUpdate(
      {
        _id: id,
        userId: authUser.userId,
      },
      { rooms },
      { new: true }
    );

    if (!palace) {
      return NextResponse.json(
        { success: false, error: 'Memory palace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: palace,
    });
  } catch (error: any) {
    console.error('Update memory palace error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update memory palace' },
      { status: 500 }
    );
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await connectDB();

    const palace = await MemoryPalace.findOneAndDelete({
      _id: id,
      userId: authUser.userId,
    });

    if (!palace) {
      return NextResponse.json(
        { success: false, error: 'Memory palace not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Memory palace deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete memory palace error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete memory palace' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { AIMnemonic } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const deleted = await AIMnemonic.findOneAndDelete({
      _id: id,
      userId: authUser.userId,
    });

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Mnemonic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mnemonic deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete mnemonic error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete mnemonic' },
      { status: 500 }
    );
  }
}

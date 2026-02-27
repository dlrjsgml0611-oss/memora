import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { StudySession } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from '@/lib/utils/response';

// POST /api/reviews/sessions/:id/complete - Complete active session
export async function POST(
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
    const session: any = await StudySession.findById(id);

    if (!session) {
      return notFoundResponse('StudySession');
    }

    if (session.userId.toString() !== authUser.userId) {
      return forbiddenResponse();
    }

    const body = await req.json().catch(() => ({}));
    const reason = ['completed', 'user-exit', 'timeout', 'abandoned'].includes(body.reason)
      ? body.reason
      : 'user-exit';

    if (session.status !== 'active') {
      return successResponse({
        id: session._id,
        status: session.status,
        completionReason: session.completionReason,
      });
    }

    session.status = 'completed';
    session.completionReason = reason;
    session.completedAt = new Date();
    session.duration = Math.max(
      Math.round((new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000),
      0
    );

    await session.save();

    return successResponse({
      id: session._id,
      status: session.status,
      completionReason: session.completionReason,
      duration: session.duration,
    });
  } catch (error) {
    console.error('Complete review session error:', error);
    return errorResponse('Failed to complete session', 500);
  }
}

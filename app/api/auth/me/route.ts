import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
} from '@/lib/utils/response';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const user = await User.findById(authUser.userId).select('-password');
    if (!user) {
      return notFoundResponse('User');
    }

    return successResponse({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      profile: user.profile,
      preferences: user.preferences,
      stats: user.stats,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse('Failed to get user information', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { username, profile, preferences } = body;

    const user = await User.findById(authUser.userId);
    if (!user) {
      return notFoundResponse('User');
    }

    // Update fields
    if (username) user.username = username;
    if (profile) user.profile = { ...user.profile, ...profile };
    if (preferences) user.preferences = { ...user.preferences, ...preferences };

    await user.save();

    return successResponse(
      {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        profile: user.profile,
        preferences: user.preferences,
      },
      'Profile updated successfully'
    );
  } catch (error) {
    console.error('Update user error:', error);
    return errorResponse('Failed to update profile', 500);
  }
}

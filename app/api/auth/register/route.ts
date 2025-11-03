import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { hashPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import { registerSchema } from '@/lib/utils/validators';
import {
  successResponse,
  errorResponse,
  conflictResponse,
  validationErrorResponse,
} from '@/lib/utils/response';
import { AuthResponse } from '@/types';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    // Validate input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }

    const { email, password, username } = validation.data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return conflictResponse('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      username,
      profile: {
        timezone: 'UTC',
        learningGoals: [],
      },
      preferences: {
        dailyReviewTarget: 20,
        preferredAI: 'openai',
        notificationsEnabled: true,
      },
      stats: {
        totalStudyTime: 0,
        cardsReviewed: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
    });

    // Generate JWT token
    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
    });

    const response: AuthResponse = {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
      },
    };

    return successResponse(response, 'User registered successfully', 201);
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse('Failed to register user', 500);
  }
}

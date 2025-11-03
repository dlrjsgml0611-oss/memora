import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { User } from '@/lib/db/models';
import { comparePassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import { loginSchema } from '@/lib/utils/validators';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/response';
import { AuthResponse } from '@/types';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    // Validate input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }

    const { email, password } = validation.data;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return unauthorizedResponse('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return unauthorizedResponse('Invalid email or password');
    }

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

    return successResponse(response, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('Failed to login', 500);
  }
}

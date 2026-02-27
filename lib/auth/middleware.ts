import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';
import { JWTPayload } from '@/types';
import { getAuthTokenFromRequest } from './cookies';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const token = getAuthToken(req);
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No session token provided' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Attach user data to request
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.user = payload;

    return handler(authenticatedReq);
  };
}

export function getAuthToken(req: NextRequest): string | null {
  return getAuthTokenFromRequest(req);
}

export function getUserFromRequest(req: NextRequest): JWTPayload | null {
  const token = getAuthToken(req);

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

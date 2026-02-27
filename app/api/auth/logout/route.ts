import { clearAuthCookie } from '@/lib/auth/cookies';
import { successResponse } from '@/lib/utils/response';

export async function POST() {
  const response = successResponse(null, 'Logged out');
  clearAuthCookie(response);
  return response;
}

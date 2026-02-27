import type { NextRequest, NextResponse } from 'next/server';

export const AUTH_COOKIE_NAME = 'memora_auth';

function shouldUseSecureCookies() {
  return process.env.NODE_ENV === 'production';
}

function getCookieMaxAgeSeconds() {
  const raw = process.env.JWT_EXPIRES_IN;
  if (!raw) return 60 * 60 * 24 * 7; // 7d default

  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  const matched = raw.match(/^(\d+)([smhd])$/i);
  if (!matched) return 60 * 60 * 24 * 7;

  const value = Number(matched[1]);
  const unit = matched[2].toLowerCase();

  if (unit === 's') return value;
  if (unit === 'm') return value * 60;
  if (unit === 'h') return value * 60 * 60;
  if (unit === 'd') return value * 60 * 60 * 24;
  return 60 * 60 * 24 * 7;
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: getCookieMaxAgeSeconds(),
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function getAuthTokenFromRequest(req: NextRequest): string | null {
  const fromCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (fromCookie) return fromCookie;

  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

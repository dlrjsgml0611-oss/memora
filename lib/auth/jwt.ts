import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { JWTPayload } from '@/types';

const JWT_SECRET: Secret =
  process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production';

function resolveExpiresIn(value?: string): SignOptions['expiresIn'] {
  if (!value) {
    return '7d';
  }

  const numericValue = Number(value);
  if (!Number.isNaN(numericValue)) {
    return numericValue;
  }

  return value as SignOptions['expiresIn'];
}

const JWT_EXPIRES_IN = resolveExpiresIn(process.env.JWT_EXPIRES_IN);

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  JWT_SECRET not set in environment variables. Using fallback (insecure).');
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('JWT decode failed:', error);
    return null;
  }
}

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindOne, mockComparePassword, mockSignToken, mockSetAuthCookie } = vi.hoisted(() => ({
  mockFindOne: vi.fn(),
  mockComparePassword: vi.fn(),
  mockSignToken: vi.fn(),
  mockSetAuthCookie: vi.fn(),
}));

vi.mock('@/lib/db/mongodb', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/db/models', () => ({
  User: {
    findOne: mockFindOne,
  },
}));

vi.mock('@/lib/auth/password', () => ({
  comparePassword: mockComparePassword,
}));

vi.mock('@/lib/auth/jwt', () => ({
  signToken: mockSignToken,
}));

vi.mock('@/lib/auth/cookies', () => ({
  setAuthCookie: mockSetAuthCookie,
}));

import { POST } from '@/app/api/auth/login/route';

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user payload and sets auth cookie on success', async () => {
    mockFindOne.mockResolvedValue({
      _id: { toString: () => 'u1' },
      email: 'test@example.com',
      username: 'tester',
      password: 'hashed',
    });
    mockComparePassword.mockResolvedValue(true);
    mockSignToken.mockReturnValue('signed-token');

    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'secret123' }),
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data.user).toEqual({
      id: 'u1',
      email: 'test@example.com',
      username: 'tester',
    });
    expect(mockSetAuthCookie).toHaveBeenCalledTimes(1);
  });

  it('returns 401 for unknown user', async () => {
    mockFindOne.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'missing@example.com', password: 'secret123' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});

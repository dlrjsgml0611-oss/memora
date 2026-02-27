import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetUserFromRequest, mockCreate } = vi.hoisted(() => ({
  mockGetUserFromRequest: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock('@/lib/db/mongodb', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth/middleware', () => ({
  getUserFromRequest: mockGetUserFromRequest,
}));

vi.mock('@/lib/db/models', () => ({
  Flashcard: {
    create: mockCreate,
  },
}));

vi.mock('@/lib/srs/sm2', () => ({
  initializeSM2: vi.fn(() => ({
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: new Date('2026-01-01T00:00:00.000Z'),
    state: 'new',
  })),
}));

import { GET, POST } from '@/app/api/flashcards/route';

describe('flashcards routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when page query is invalid', async () => {
    mockGetUserFromRequest.mockReturnValue({ userId: 'u1' });

    const req = new NextRequest('http://localhost/api/flashcards?page=0', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('creates a flashcard on valid POST', async () => {
    mockGetUserFromRequest.mockReturnValue({ userId: 'u1' });
    mockCreate.mockResolvedValue({
      _id: 'f1',
      front: 'Q',
      back: 'A',
    });

    const req = new NextRequest('http://localhost/api/flashcards', {
      method: 'POST',
      body: JSON.stringify({
        front: 'Q',
        back: 'A',
        type: 'basic',
      }),
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

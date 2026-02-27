import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetUserFromRequest,
  mockFlashcardFind,
  mockStudySessionCreate,
  mockBuildReviewQueue,
  mockBuildExamQueue,
} = vi.hoisted(() => ({
  mockGetUserFromRequest: vi.fn(),
  mockFlashcardFind: vi.fn(),
  mockStudySessionCreate: vi.fn(),
  mockBuildReviewQueue: vi.fn(),
  mockBuildExamQueue: vi.fn(),
}));

vi.mock('@/lib/db/mongodb', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth/middleware', () => ({
  getUserFromRequest: mockGetUserFromRequest,
}));

vi.mock('@/lib/study/session', () => ({
  buildReviewQueue: mockBuildReviewQueue,
  buildExamQueue: mockBuildExamQueue,
}));

vi.mock('@/lib/db/models', () => ({
  Flashcard: {
    find: mockFlashcardFind,
  },
  StudySession: {
    create: mockStudySessionCreate,
  },
}));

import { POST } from '@/app/api/reviews/sessions/route';

describe('POST /api/reviews/sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockGetUserFromRequest.mockReturnValue(null);

    const req = new NextRequest('http://localhost/api/reviews/sessions', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('creates review session and returns queue', async () => {
    mockGetUserFromRequest.mockReturnValue({ userId: 'u1' });

    const dbCards = [{ _id: 'f1', front: 'Q', back: 'A', srs: {}, stats: {}, type: 'basic', hint: '' }];
    mockFlashcardFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(dbCards),
      }),
    });

    mockBuildReviewQueue.mockReturnValue({
      queue: dbCards,
      stats: { dueCount: 1, weakCount: 0, newIncluded: 0 },
    });
    mockStudySessionCreate.mockResolvedValue({
      _id: 's1',
      mode: 'review',
      source: 'manual',
      status: 'active',
      metrics: { totalCards: 1 },
      startedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const req = new NextRequest('http://localhost/api/reviews/sessions', {
      method: 'POST',
      body: JSON.stringify({ mode: 'review', source: 'manual', maxCards: 20 }),
    });

    const res = await POST(req);
    const payload = await res.json();

    expect(res.status).toBe(201);
    expect(payload.success).toBe(true);
    expect(payload.data.cards).toHaveLength(1);
    expect(mockStudySessionCreate).toHaveBeenCalledTimes(1);
  });
});

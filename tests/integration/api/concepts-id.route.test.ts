import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetUserFromRequest,
  mockConceptFindById,
  mockConceptFindByIdAndDelete,
  mockConceptUpdateMany,
  mockCurriculumFindOne,
  mockFlashcardDeleteMany,
} = vi.hoisted(() => ({
  mockGetUserFromRequest: vi.fn(),
  mockConceptFindById: vi.fn(),
  mockConceptFindByIdAndDelete: vi.fn(),
  mockConceptUpdateMany: vi.fn(),
  mockCurriculumFindOne: vi.fn(),
  mockFlashcardDeleteMany: vi.fn(),
}));

vi.mock('@/lib/db/mongodb', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth/middleware', () => ({
  getUserFromRequest: mockGetUserFromRequest,
}));

vi.mock('@/lib/db/models', () => ({
  Concept: {
    findById: mockConceptFindById,
    findByIdAndDelete: mockConceptFindByIdAndDelete,
    updateMany: mockConceptUpdateMany,
  },
  Curriculum: {
    findOne: mockCurriculumFindOne,
  },
  Flashcard: {
    deleteMany: mockFlashcardDeleteMany,
  },
}));

import { DELETE } from '@/app/api/concepts/[id]/route';

describe('DELETE /api/concepts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockGetUserFromRequest.mockReturnValue(null);

    const req = new NextRequest('http://localhost/api/concepts/c1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'c1' }) });

    expect(res.status).toBe(401);
  });

  it('returns 404 when concept does not exist', async () => {
    mockGetUserFromRequest.mockReturnValue({ userId: 'u1' });
    mockConceptFindById.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const req = new NextRequest('http://localhost/api/concepts/c1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'c1' }) });

    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own curriculum', async () => {
    mockGetUserFromRequest.mockReturnValue({ userId: 'u1' });
    mockConceptFindById.mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: 'c1', curriculumId: 'cur1' }),
    });
    mockCurriculumFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const req = new NextRequest('http://localhost/api/concepts/c1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'c1' }) });

    expect(res.status).toBe(403);
  });

  it('deletes concept and returns 204 on success', async () => {
    mockGetUserFromRequest.mockReturnValue({ userId: 'u1' });
    mockConceptFindById.mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: 'c1', curriculumId: 'cur1' }),
    });
    mockCurriculumFindOne.mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: 'cur1' }),
    });
    mockConceptFindByIdAndDelete.mockResolvedValue({ _id: 'c1' });
    mockConceptUpdateMany.mockResolvedValue({ acknowledged: true });
    mockFlashcardDeleteMany.mockResolvedValue({ deletedCount: 2 });

    const req = new NextRequest('http://localhost/api/concepts/c1', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'c1' }) });

    expect(res.status).toBe(204);
    expect(mockConceptFindByIdAndDelete).toHaveBeenCalledWith('c1');
    expect(mockFlashcardDeleteMany).toHaveBeenCalledWith({ userId: 'u1', conceptId: 'c1' });
  });
});

import { getDueCards, getNewCards, getReviewStats, scheduleReview } from '@/lib/srs/scheduler';

function makeCard(overrides: Record<string, any> = {}) {
  return {
    _id: overrides._id || 'card-1',
    front: overrides.front || 'front',
    back: overrides.back || 'back',
    srs: {
      ease: 2.5,
      interval: 0,
      repetitions: 0,
      nextReview: new Date(),
      lastReviewed: undefined,
      state: 'new',
      ...(overrides.srs || {}),
    },
    stats: {
      totalReviews: 0,
      correctCount: 0,
      incorrectCount: 0,
      averageResponseTime: 0,
      ...(overrides.stats || {}),
    },
  } as any;
}

describe('scheduleReview', () => {
  it('updates stats and schedules card after review', () => {
    const card = makeCard();
    const result = scheduleReview(card, 3);

    expect(result.stats.totalReviews).toBe(1);
    expect(result.stats.correctCount).toBe(1);
    expect(result.stats.incorrectCount).toBe(0);
    expect(result.srs.repetitions).toBe(1);
    expect(result.srs.state).toBe('learning');
  });
});

describe('getDueCards', () => {
  it('returns cards due now sorted by nextReview ascending', () => {
    const now = Date.now();
    const cards = [
      makeCard({ _id: 'late', srs: { nextReview: new Date(now - 10_000) } }),
      makeCard({ _id: 'soon', srs: { nextReview: new Date(now - 1_000) } }),
      makeCard({ _id: 'future', srs: { nextReview: new Date(now + 30_000) } }),
    ];

    const due = getDueCards(cards as any);

    expect(due).toHaveLength(2);
    expect(due[0]._id).toBe('late');
    expect(due[1]._id).toBe('soon');
  });
});

describe('getNewCards', () => {
  it('returns only new cards up to limit', () => {
    const cards = [
      makeCard({ _id: 'n1', srs: { state: 'new' } }),
      makeCard({ _id: 'n2', srs: { state: 'new' } }),
      makeCard({ _id: 'r1', srs: { state: 'review' } }),
    ];

    const result = getNewCards(cards as any, 1);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('n1');
  });
});

describe('getReviewStats', () => {
  it('calculates distribution and accuracy', () => {
    const cards = [
      makeCard({
        srs: { state: 'new', nextReview: new Date() },
        stats: { totalReviews: 4, correctCount: 3, incorrectCount: 1 },
      }),
      makeCard({
        srs: { state: 'review', nextReview: new Date() },
        stats: { totalReviews: 6, correctCount: 4, incorrectCount: 2 },
      }),
    ];

    const stats = getReviewStats(cards as any);

    expect(stats.total).toBe(2);
    expect(stats.new).toBe(1);
    expect(stats.review).toBe(1);
    expect(stats.dueToday).toBe(2);
    expect(stats.accuracy).toBe(70);
  });
});

interface SessionCard {
  _id: any;
  front: string;
  back: string;
  hint?: string;
  type: 'basic' | 'cloze' | 'image' | 'code';
  tags?: string[];
  createdAt?: Date;
  conceptId?: any;
  srs: {
    nextReview: Date;
    state: 'new' | 'learning' | 'review' | 'relearning';
  };
  stats: {
    totalReviews: number;
    correctCount: number;
  };
  mistakeCount?: number;
  examWeight?: number;
}

export interface BuildReviewQueueOptions {
  maxCards: number;
  maxNew: number;
  weaknessBoost: number;
}

function toId(value: any): string {
  return typeof value === 'string' ? value : value?.toString?.() || '';
}

function getAccuracy(card: SessionCard): number {
  const total = card.stats?.totalReviews || 0;
  if (!total) return 0;
  return (card.stats?.correctCount || 0) / total;
}

function addUnique(queue: SessionCard[], cards: SessionCard[]) {
  const used = new Set(queue.map((card) => toId(card._id)));
  for (const card of cards) {
    const id = toId(card._id);
    if (!id || used.has(id)) continue;
    queue.push(card);
    used.add(id);
  }
}

export function buildReviewQueue(cards: SessionCard[], options: BuildReviewQueueOptions): {
  queue: SessionCard[];
  stats: {
    dueCount: number;
    weakCount: number;
    newIncluded: number;
  };
} {
  const { maxCards, maxNew, weaknessBoost } = options;
  const now = new Date();

  const reviewDue = cards
    .filter((card) => card.srs.state !== 'new' && new Date(card.srs.nextReview) <= now)
    .sort((a, b) => new Date(a.srs.nextReview).getTime() - new Date(b.srs.nextReview).getTime());

  const weakCards = cards
    .filter((card) => {
      const reviews = card.stats?.totalReviews || 0;
      if (reviews < 3 && (card.mistakeCount || 0) < 2) return false;
      return getAccuracy(card) < 0.75 || (card.mistakeCount || 0) >= 2;
    })
    .sort((a, b) => {
      const aScore = (a.mistakeCount || 0) * 10 + (1 - getAccuracy(a)) * 100;
      const bScore = (b.mistakeCount || 0) * 10 + (1 - getAccuracy(b)) * 100;
      return bScore - aScore;
    })
    .slice(0, weaknessBoost);

  const newCards = cards
    .filter((card) => card.srs.state === 'new')
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    .slice(0, maxNew);

  const queue: SessionCard[] = [];
  addUnique(queue, reviewDue);
  addUnique(queue, weakCards);
  addUnique(queue, newCards);

  const trimmed = queue.slice(0, maxCards);
  const includedNew = trimmed.filter((card) => card.srs.state === 'new').length;

  return {
    queue: trimmed,
    stats: {
      dueCount: reviewDue.length,
      weakCount: weakCards.length,
      newIncluded: includedNew,
    },
  };
}

export interface BuildExamQueueOptions {
  count: number;
  conceptId?: string;
  tag?: string;
}

export function buildExamQueue(cards: SessionCard[], options: BuildExamQueueOptions): SessionCard[] {
  const { count, conceptId, tag } = options;

  const filtered = cards.filter((card: any) => {
    if (conceptId && toId(card.conceptId) !== conceptId) return false;
    if (tag && !Array.isArray(card.tags)) return false;
    if (tag && !card.tags.includes(tag)) return false;
    return card.srs.state !== 'new';
  });

  const prioritized = [...filtered].sort((a, b) => {
    const aScore = (a.examWeight || 1) * 10 + (a.mistakeCount || 0) * 5 + (1 - getAccuracy(a)) * 100;
    const bScore = (b.examWeight || 1) * 10 + (b.mistakeCount || 0) * 5 + (1 - getAccuracy(b)) * 100;
    return bScore - aScore;
  });

  return prioritized.slice(0, count);
}

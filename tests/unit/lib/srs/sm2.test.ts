import { calculateSM2, initializeSM2 } from '@/lib/srs/sm2';

describe('calculateSM2', () => {
  it('resets progress on rating=1 for new cards', () => {
    const result = calculateSM2({
      ease: 2.5,
      interval: 6,
      repetitions: 0,
      rating: 1,
    });

    expect(result.interval).toBe(0);
    expect(result.repetitions).toBe(0);
    expect(result.state).toBe('new');
    expect(result.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('moves card to relearning on rating=1 after prior repetitions', () => {
    const result = calculateSM2({
      ease: 2.3,
      interval: 12,
      repetitions: 3,
      rating: 1,
    });

    expect(result.interval).toBe(0);
    expect(result.repetitions).toBe(0);
    expect(result.state).toBe('relearning');
  });

  it('keeps ease at minimum floor 1.3', () => {
    const result = calculateSM2({
      ease: 1.3,
      interval: 1,
      repetitions: 1,
      rating: 2,
    });

    expect(result.ease).toBe(1.3);
  });

  it('applies easy multiplier and transitions to review', () => {
    const result = calculateSM2({
      ease: 2.5,
      interval: 6,
      repetitions: 2,
      rating: 4,
    });

    expect(result.state).toBe('review');
    expect(result.interval).toBeGreaterThan(6);
  });
});

describe('initializeSM2', () => {
  it('creates default schedule values', () => {
    const initial = initializeSM2();

    expect(initial.ease).toBe(2.5);
    expect(initial.interval).toBe(0);
    expect(initial.repetitions).toBe(0);
    expect(initial.state).toBe('new');
  });
});

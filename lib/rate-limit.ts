import type { NextResponse } from 'next/server';

interface RateLimitBucket {
  timestamps: number[];
  dayKey: string;
  dayCount: number;
}

interface RateLimitStore {
  buckets: Map<string, RateLimitBucket>;
}

declare global {
  // eslint-disable-next-line no-var
  var __memoraRateLimitStore: RateLimitStore | undefined;
}

function getStore(): RateLimitStore {
  if (!global.__memoraRateLimitStore) {
    global.__memoraRateLimitStore = {
      buckets: new Map(),
    };
  }
  return global.__memoraRateLimitStore;
}

function toDayKey(nowMs: number) {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function getDayResetEpochSeconds(nowMs: number) {
  const d = new Date(nowMs);
  d.setUTCHours(24, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export interface RateLimitPolicy {
  routeKey: string;
  maxPerMinute: number;
  maxPerDay: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
  headers: Record<string, string>;
}

export function consumeUserRateLimit(
  userId: string,
  policy: RateLimitPolicy
): RateLimitResult {
  const nowMs = Date.now();
  const minuteWindowStart = nowMs - 60_000;
  const minuteResetSec = Math.ceil((nowMs + 60_000) / 1000);
  const dayResetSec = getDayResetEpochSeconds(nowMs);
  const key = `${policy.routeKey}:${userId}`;

  const store = getStore();
  const dayKey = toDayKey(nowMs);
  const bucket = store.buckets.get(key) || {
    timestamps: [],
    dayKey,
    dayCount: 0,
  };

  if (bucket.dayKey !== dayKey) {
    bucket.dayKey = dayKey;
    bucket.dayCount = 0;
  }

  bucket.timestamps = bucket.timestamps.filter((ts) => ts > minuteWindowStart);

  const minuteExceeded = bucket.timestamps.length >= policy.maxPerMinute;
  const dayExceeded = bucket.dayCount >= policy.maxPerDay;

  if (minuteExceeded || dayExceeded) {
    const oldestInWindow = bucket.timestamps[0];
    const retryFromMinute = oldestInWindow
      ? Math.max(1, Math.ceil((oldestInWindow + 60_000 - nowMs) / 1000))
      : 1;
    const retryFromDay = Math.max(1, dayResetSec - Math.floor(nowMs / 1000));
    const retryAfterSec = minuteExceeded ? retryFromMinute : retryFromDay;

    return {
      allowed: false,
      retryAfterSec,
      headers: {
        'X-RateLimit-Limit-Minute': String(policy.maxPerMinute),
        'X-RateLimit-Remaining-Minute': String(Math.max(0, policy.maxPerMinute - bucket.timestamps.length)),
        'X-RateLimit-Reset-Minute': String(minuteResetSec),
        'X-RateLimit-Limit-Day': String(policy.maxPerDay),
        'X-RateLimit-Remaining-Day': String(Math.max(0, policy.maxPerDay - bucket.dayCount)),
        'X-RateLimit-Reset-Day': String(dayResetSec),
      },
    };
  }

  bucket.timestamps.push(nowMs);
  bucket.dayCount += 1;
  store.buckets.set(key, bucket);

  return {
    allowed: true,
    retryAfterSec: 0,
    headers: {
      'X-RateLimit-Limit-Minute': String(policy.maxPerMinute),
      'X-RateLimit-Remaining-Minute': String(Math.max(0, policy.maxPerMinute - bucket.timestamps.length)),
      'X-RateLimit-Reset-Minute': String(minuteResetSec),
      'X-RateLimit-Limit-Day': String(policy.maxPerDay),
      'X-RateLimit-Remaining-Day': String(Math.max(0, policy.maxPerDay - bucket.dayCount)),
      'X-RateLimit-Reset-Day': String(dayResetSec),
    },
  };
}

export function attachRateLimitHeaders(response: NextResponse, headers: Record<string, string>) {
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

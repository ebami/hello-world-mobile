/**
 * @fileoverview Tests for the in-memory rate limiter, connection tracker, and
 * metrics hooks (MFP-06).
 */

import {
  rateLimiter,
  connectionTracker,
  resetAbuseControls,
} from './rateLimiter';
import { recordMetric, getMetricCount, onMetric, resetMetrics } from './metricsHooks';

describe('rateLimiter (MFP-06)', () => {
  beforeEach(() => resetAbuseControls());

  it('allows up to the limit within a window, then blocks', () => {
    const now = 1_000;
    expect(rateLimiter.tryConsume('k', 3, 1000, now)).toBe(true);
    expect(rateLimiter.tryConsume('k', 3, 1000, now)).toBe(true);
    expect(rateLimiter.tryConsume('k', 3, 1000, now)).toBe(true);
    expect(rateLimiter.tryConsume('k', 3, 1000, now)).toBe(false); // 4th blocked
  });

  it('resets after the window elapses', () => {
    expect(rateLimiter.tryConsume('k', 1, 1000, 1_000)).toBe(true);
    expect(rateLimiter.tryConsume('k', 1, 1000, 1_500)).toBe(false); // same window
    expect(rateLimiter.tryConsume('k', 1, 1000, 2_000)).toBe(true); // window elapsed
  });

  it('tracks keys independently', () => {
    expect(rateLimiter.tryConsume('a', 1, 1000, 0)).toBe(true);
    expect(rateLimiter.tryConsume('a', 1, 1000, 0)).toBe(false);
    expect(rateLimiter.tryConsume('b', 1, 1000, 0)).toBe(true); // different key
  });

  it('reset clears all buckets', () => {
    rateLimiter.tryConsume('k', 1, 1000, 0);
    resetAbuseControls();
    expect(rateLimiter.tryConsume('k', 1, 1000, 0)).toBe(true);
  });
});

describe('connectionTracker (MFP-06)', () => {
  beforeEach(() => resetAbuseControls());

  it('enforces the global maximum', () => {
    expect(connectionTracker.acquire('ip1', 2, 10)).toEqual({ ok: true });
    expect(connectionTracker.acquire('ip2', 2, 10)).toEqual({ ok: true });
    expect(connectionTracker.acquire('ip3', 2, 10)).toEqual({
      ok: false,
      reason: 'SERVER_CAPACITY_REACHED',
    });
  });

  it('enforces the per-IP maximum', () => {
    expect(connectionTracker.acquire('ip1', 100, 2)).toEqual({ ok: true });
    expect(connectionTracker.acquire('ip1', 100, 2)).toEqual({ ok: true });
    expect(connectionTracker.acquire('ip1', 100, 2)).toEqual({
      ok: false,
      reason: 'IP_CAPACITY_REACHED',
    });
  });

  it('release frees capacity', () => {
    connectionTracker.acquire('ip1', 1, 1);
    expect(connectionTracker.acquire('ip1', 1, 1).ok).toBe(false);
    connectionTracker.release('ip1');
    expect(connectionTracker.acquire('ip1', 1, 1).ok).toBe(true);
  });

  it('tracks active totals', () => {
    connectionTracker.acquire('ip1', 10, 10);
    connectionTracker.acquire('ip1', 10, 10);
    expect(connectionTracker.activeTotal).toBe(2);
    expect(connectionTracker.activeForIp('ip1')).toBe(2);
    connectionTracker.release('ip1');
    expect(connectionTracker.activeForIp('ip1')).toBe(1);
  });
});

describe('metricsHooks (MFP-06)', () => {
  beforeEach(() => resetMetrics());

  it('counts recorded metrics', () => {
    recordMetric('room_created');
    recordMetric('room_created');
    recordMetric('rate_limited');
    expect(getMetricCount('room_created')).toBe(2);
    expect(getMetricCount('rate_limited')).toBe(1);
  });

  it('notifies listeners and supports unsubscribe', () => {
    const seen: string[] = [];
    const off = onMetric((name) => seen.push(name));
    recordMetric('origin_rejected');
    off();
    recordMetric('origin_rejected');
    expect(seen).toEqual(['origin_rejected']);
  });

  it('isolates a throwing listener from the caller', () => {
    onMetric(() => {
      throw new Error('boom');
    });
    expect(() => recordMetric('room_created')).not.toThrow();
    expect(getMetricCount('room_created')).toBe(1);
  });
});

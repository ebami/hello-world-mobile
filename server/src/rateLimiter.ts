/**
 * @fileoverview In-memory abuse controls: a fixed-window rate limiter and a
 * connection-concurrency tracker (MFP-06).
 *
 * Both are suitable for the single-instance MVP deployment and sit behind small
 * interfaces so a distributed backend (e.g. Redis) can replace them later
 * without touching call sites. All limits are server-owned — a client can never
 * raise them.
 *
 * @module server/rateLimiter
 */

/** A minimal rate limiter contract (Redis-replaceable). */
export interface RateLimiter {
  /**
   * Attempt to consume one unit against `key` within a fixed window. Returns
   * true if allowed, false if the limit for the current window is exceeded.
   * `now` is injectable for deterministic tests.
   */
  tryConsume(key: string, limit: number, windowMs: number, now?: number): boolean;
  /** Clear all state (tests / shutdown). */
  reset(): void;
}

class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  tryConsume(key: string, limit: number, windowMs: number, now: number = Date.now()): boolean {
    const bucket = this.buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (bucket.count < limit) {
      bucket.count += 1;
      return true;
    }
    return false;
  }

  reset(): void {
    this.buckets.clear();
  }
}

/** Process-wide rate limiter singleton. */
export const rateLimiter: RateLimiter = new InMemoryRateLimiter();

/** Reason a connection was refused by the concurrency tracker. */
export type ConnectionRejection = 'SERVER_CAPACITY_REACHED' | 'IP_CAPACITY_REACHED';

/**
 * Tracks concurrently-connected sockets, in total and per client IP, enforcing
 * server-owned hard caps. Acquire on connect, release on disconnect.
 */
class ConnectionTracker {
  private total = 0;
  private perIp = new Map<string, number>();

  acquire(
    ip: string,
    maxTotal: number,
    maxPerIp: number,
  ): { ok: true } | { ok: false; reason: ConnectionRejection } {
    if (this.total >= maxTotal) {
      return { ok: false, reason: 'SERVER_CAPACITY_REACHED' };
    }
    const ipCount = this.perIp.get(ip) ?? 0;
    if (ipCount >= maxPerIp) {
      return { ok: false, reason: 'IP_CAPACITY_REACHED' };
    }
    this.total += 1;
    this.perIp.set(ip, ipCount + 1);
    return { ok: true };
  }

  release(ip: string): void {
    if (this.total > 0) this.total -= 1;
    const ipCount = this.perIp.get(ip) ?? 0;
    if (ipCount <= 1) {
      this.perIp.delete(ip);
    } else {
      this.perIp.set(ip, ipCount - 1);
    }
  }

  get activeTotal(): number {
    return this.total;
  }

  activeForIp(ip: string): number {
    return this.perIp.get(ip) ?? 0;
  }

  reset(): void {
    this.total = 0;
    this.perIp.clear();
  }
}

/** Process-wide connection tracker singleton. */
export const connectionTracker = new ConnectionTracker();

/** Reset all abuse-control state (tests / shutdown). */
export function resetAbuseControls(): void {
  rateLimiter.reset();
  connectionTracker.reset();
}

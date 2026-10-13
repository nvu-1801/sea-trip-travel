import "server-only";

/**
 * Best-effort rate limiting.
 *
 * ⚠️ LIMITATION: this counter lives in the memory of a single server instance.
 * On a serverless/edge deployment each cold instance starts from zero, so an
 * attacker distributing requests across instances can exceed the intended
 * limit. It still stops the common case (a script hammering one endpoint).
 *
 * Where the deployment can be scaled, replace `getRateLimiter()` with an
 * adapter backed by shared storage (Upstash Redis, Vercel KV, DynamoDB). The
 * interface below is the seam — no caller changes when that happens.
 */

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export interface RateLimiter {
  check(key: string): Promise<RateLimitDecision>;
}

type Bucket = { count: number; resetAt: number };

export class InMemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private lastSweep = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  async check(key: string): Promise<RateLimitDecision> {
    const now = Date.now();
    this.sweep(now);

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (bucket.count >= this.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    }

    bucket.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
  }

  /** Drop expired buckets so the map cannot grow without bound. */
  private sweep(now: number): void {
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

let cached: RateLimiter | null = null;

export function getRateLimiter(limit: number, windowMs: number): RateLimiter {
  if (!cached) cached = new InMemoryRateLimiter(limit, windowMs);
  return cached;
}

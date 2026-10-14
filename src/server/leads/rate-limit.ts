import "server-only";

import { getLeadStore, type LeadStore } from "./store";

/**
 * Fixed-window rate limiting, backed by a `LeadStore`.
 *
 * The decision logic is identical whichever store is active; only the counter's
 * home changes. `getRateLimiter()` is cached per (limit, window) pair so the
 * store is not rebuilt on every request.
 */

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export interface RateLimiter {
  check(key: string): Promise<RateLimitDecision>;
}

export class WindowRateLimiter implements RateLimiter {
  constructor(
    private readonly store: LeadStore,
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  async check(key: string): Promise<RateLimitDecision> {
    const result = await this.store.increment(key, this.windowMs);

    /**
     * When the backing store is unreachable we let the request through.
     *
     * Losing a genuine lead is a worse failure than letting a spam burst slip
     * past a single layer whose siblings (honeypot, payload cap, schema
     * validation) are still in force. Failing closed would turn a Redis blip
     * into "the contact form is broken", which is not a trade this site should
     * make. The event is logged so it is visible in operations.
     */
    if (!result) {
      console.warn(
        `[rate-limit] store "${this.store.kind}" unavailable — allowing request (fail-open)`,
      );
      return { allowed: true, retryAfterSeconds: 0 };
    }

    if (result.count > this.limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(result.resetInMs / 1000)),
      };
    }

    return { allowed: true, retryAfterSeconds: 0 };
  }
}

/** Build a limiter around an explicit store. Used by the app and by tests. */
export function createRateLimiter(
  store: LeadStore,
  limit: number,
  windowMs: number,
): RateLimiter {
  return new WindowRateLimiter(store, limit, windowMs);
}

let cached: RateLimiter | null = null;
let cachedKey = "";

export function getRateLimiter(limit: number, windowMs: number): RateLimiter {
  const key = `${limit}|${windowMs}`;
  if (!cached || cachedKey !== key) {
    cached = createRateLimiter(getLeadStore(), limit, windowMs);
    cachedKey = key;
  }
  return cached;
}

import "server-only";
import { db, transaction } from "@/server/cms/db";

/**
 * Shared state for lead intake.
 *
 * The rate limiter and the idempotency cache both need state that outlives a
 * single request. Where that state lives decides whether those protections
 * actually work:
 *
 *   memory — a Map in this process. Fine for one long-lived instance (a VPS, or
 *            `next dev`). On serverless/multi-instance it silently degrades: a
 *            burst spread across N instances gets N× the intended allowance, and
 *            a retry routed to another instance sends a second email.
 *
 *   rest   — any Redis reachable over HTTP (Upstash, Vercel KV, …). Shared by
 *            every instance, so both protections hold.
 *
 * Selection is a config change, not a code change:
 *   LEAD_RATE_LIMIT_STORE=rest
 *   LEAD_RATE_LIMIT_URL=https://<db>.upstash.io
 *   LEAD_RATE_LIMIT_TOKEN=<token>
 *
 * `getLeadStore()` warns once in production when it falls back to memory, so the
 * limitation is visible in the logs instead of being a silent assumption.
 */

export type CounterResult = { count: number; resetInMs: number };

export interface LeadStore {
  readonly kind: "memory" | "rest" | "sqlite";
  /**
   * Atomically `INCR` a counter and apply the window TTL on first write.
   * Returns null when the store is unreachable — callers must decide whether to
   * fail open (availability) or closed (protection).
   */
  increment(key: string, windowMs: number): Promise<CounterResult | null>;
  get(key: string): Promise<string | null>;
  /** Set only if absent. Returns true when this call created the key. */
  setIfAbsent(key: string, value: string, ttlMs: number): Promise<boolean>;
}

/* -------------------------------------------------------------------------- */
/* In-process store                                                           */
/* -------------------------------------------------------------------------- */

class MemoryStore implements LeadStore {
  readonly kind = "memory" as const;

  private readonly counters = new Map<
    string,
    { count: number; resetAt: number }
  >();
  private readonly values = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  private lastSweep = 0;

  async increment(
    key: string,
    windowMs: number,
  ): Promise<CounterResult | null> {
    const now = Date.now();
    this.sweep(now);

    const existing = this.counters.get(key);
    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowMs;
      this.counters.set(key, { count: 1, resetAt });
      return { count: 1, resetInMs: windowMs };
    }

    existing.count += 1;
    return { count: existing.count, resetInMs: existing.resetAt - now };
  }

  async get(key: string): Promise<string | null> {
    const now = Date.now();
    const entry = this.values.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= now) {
      this.values.delete(key);
      return null;
    }
    return entry.value;
  }

  async setIfAbsent(
    key: string,
    value: string,
    ttlMs: number,
  ): Promise<boolean> {
    const now = Date.now();
    const entry = this.values.get(key);
    if (entry && entry.expiresAt > now) return false;
    this.values.set(key, { value, expiresAt: now + ttlMs });
    return true;
  }

  /** Drop expired keys so neither map can grow without bound. */
  private sweep(now: number): void {
    if (now - this.lastSweep < 60_000) return;
    this.lastSweep = now;

    for (const [key, entry] of this.counters) {
      if (entry.resetAt <= now) this.counters.delete(key);
    }
    for (const [key, entry] of this.values) {
      if (entry.expiresAt <= now) this.values.delete(key);
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Redis-over-HTTP store                                                      */
/* -------------------------------------------------------------------------- */

type FetchLike = typeof fetch;

class RestStore implements LeadStore {
  readonly kind = "rest" as const;

  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 2_000,
  ) {}

  private headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
  }

  /** Run a command pipeline. Returns null on any transport/parse failure. */
  private async pipeline(
    commands: (string | number)[][],
  ): Promise<unknown[] | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(
        `${this.url.replace(/\/+$/, "")}/pipeline`,
        {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify(commands),
          signal: controller.signal,
        },
      );
      if (!response.ok) return null;

      const payload = (await response.json()) as {
        result?: unknown;
        error?: string;
      }[];
      if (!Array.isArray(payload)) return null;
      if (payload.some((entry) => entry?.error)) return null;

      return payload.map((entry) => entry?.result ?? null);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  private async command(command: (string | number)[]): Promise<unknown | null> {
    const results = await this.pipeline([command]);
    return results ? results[0] : null;
  }

  async increment(
    key: string,
    windowMs: number,
  ): Promise<CounterResult | null> {
    // PEXPIRE … NX only sets the TTL on the first write, so the window is fixed
    // from the first request rather than sliding with every hit.
    const results = await this.pipeline([
      ["INCR", key],
      ["PEXPIRE", key, windowMs, "NX"],
      ["PTTL", key],
    ]);
    if (!results) return null;

    const [count, , pttl] = results;
    if (typeof count !== "number") return null;

    const resetInMs = typeof pttl === "number" && pttl > 0 ? pttl : windowMs;
    return { count, resetInMs };
  }

  async get(key: string): Promise<string | null> {
    const result = await this.command(["GET", key]);
    return typeof result === "string" ? result : null;
  }

  async setIfAbsent(
    key: string,
    value: string,
    ttlMs: number,
  ): Promise<boolean> {
    // SET key value PX ttl NX → "OK" when it created the key, null otherwise.
    const result = await this.command(["SET", key, value, "PX", ttlMs, "NX"]);
    return result === "OK";
  }
}

/* -------------------------------------------------------------------------- */
/* Selection                                                                  */
/* -------------------------------------------------------------------------- */

let cached: LeadStore | null = null;
let cachedKey = "";
let warnedAboutMemory = false;
class SqliteStore implements LeadStore {
  readonly kind = "sqlite" as const;
  async increment(key: string, windowMs: number) {
    return transaction(() => {
      const now = Date.now();
      db().prepare("DELETE FROM attempts WHERE expires<?").run(now);
      db()
        .prepare(
          "INSERT INTO attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
        )
        .run(`lead:${key}`, now + windowMs);
      const row = db()
        .prepare("SELECT count,expires FROM attempts WHERE key=?")
        .get(`lead:${key}`) as { count: number; expires: number };
      return { count: row.count, resetInMs: row.expires - now };
    });
  }
  async get(key: string) {
    const row = db()
      .prepare("SELECT value FROM lead_kv WHERE key=? AND expires>?")
      .get(key, Date.now()) as { value: string } | undefined;
    return row?.value ?? null;
  }
  async setIfAbsent(key: string, value: string, ttlMs: number) {
    return transaction(() => {
      db().prepare("DELETE FROM lead_kv WHERE expires<?").run(Date.now());
      return (
        db()
          .prepare(
            "INSERT OR IGNORE INTO lead_kv(key,value,expires) VALUES(?,?,?)",
          )
          .run(key, value, Date.now() + ttlMs).changes > 0
      );
    });
  }
}
const sqliteStore = new SqliteStore();

export function getLeadStore(): LeadStore {
  if (
    process.env.CMS_ENABLED === "1" &&
    process.env.LEAD_RATE_LIMIT_STORE !== "rest"
  )
    return sqliteStore;
  const kind = (process.env.LEAD_RATE_LIMIT_STORE ?? "memory").toLowerCase();
  const url = process.env.LEAD_RATE_LIMIT_URL ?? "";
  const token = process.env.LEAD_RATE_LIMIT_TOKEN ?? "";
  const key = `${kind}|${url}|${token ? "token" : ""}`;

  if (cached && key === cachedKey) return cached;

  const useRest = kind === "rest" && url.length > 0 && token.length > 0;

  if (kind === "rest" && !useRest) {
    console.error(
      "[lead-store] LEAD_RATE_LIMIT_STORE=rest but LEAD_RATE_LIMIT_URL/TOKEN are missing — falling back to in-memory.",
    );
  }

  if (!useRest && process.env.NODE_ENV === "production" && !warnedAboutMemory) {
    warnedAboutMemory = true;
    console.warn(
      "[lead-store] Using the IN-MEMORY store. Rate limiting and idempotency are per-instance and will NOT hold across serverless invocations or multiple instances. Set LEAD_RATE_LIMIT_STORE=rest with LEAD_RATE_LIMIT_URL/TOKEN for a shared store.",
    );
  }

  cached = useRest ? new RestStore(url, token) : new MemoryStore();
  cachedKey = key;
  return cached;
}

/** Exposed for tests: build a store from explicit values, bypassing env. */
export function createRestStore(
  url: string,
  token: string,
  fetchImpl?: FetchLike,
): LeadStore {
  return new RestStore(url, token, fetchImpl);
}

/** Exposed for tests: a fresh in-process store. */
export function createMemoryStore(): LeadStore {
  return new MemoryStore();
}

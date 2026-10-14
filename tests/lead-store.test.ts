import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRateLimiter } from "@/server/leads/rate-limit";
import { createMemoryStore, createRestStore } from "@/server/leads/store";

/**
 * Lead store + rate limiter.
 *
 * The point of these tests is that the in-memory store is no longer the only
 * option: the shared Redis-over-HTTP store is the same interface, and its command
 * pipeline is asserted against a fetch stub. The fail-open path is covered too,
 * because "what happens when Redis is down" is a decision, not an accident.
 */

describe("in-memory store", () => {
  it("counts within a window and reports the remaining time", async () => {
    const store = createMemoryStore();
    const first = await store.increment("k", 60_000);
    const second = await store.increment("k", 60_000);

    assert.equal(first?.count, 1);
    assert.equal(second?.count, 2);
    assert.ok((second?.resetInMs ?? 0) > 0);
    assert.ok((second?.resetInMs ?? 0) <= 60_000);
  });

  it("keeps separate windows per key", async () => {
    const store = createMemoryStore();
    await store.increment("a", 60_000);
    await store.increment("a", 60_000);
    const other = await store.increment("b", 60_000);
    assert.equal(other?.count, 1);
  });

  it("starts a fresh window once the previous one has expired", async () => {
    const store = createMemoryStore();
    // A 1 ms window: the second call lands after it has elapsed.
    await store.increment("k", 1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    const after = await store.increment("k", 60_000);
    assert.equal(after?.count, 1, "expired window must reset to 1");
  });
});

describe("in-memory store — idempotency values", () => {
  it("sets a value only when absent", async () => {
    const store = createMemoryStore();
    assert.equal(await store.setIfAbsent("idem", "first", 60_000), true);
    assert.equal(await store.setIfAbsent("idem", "second", 60_000), false);
    assert.equal(await store.get("idem"), "first");
  });

  it("returns null for a missing or expired key", async () => {
    const store = createMemoryStore();
    assert.equal(await store.get("nope"), null);

    await store.setIfAbsent("short", "v", 1);
    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(await store.get("short"), null);
  });
});

describe("rest store (Redis over HTTP)", () => {
  type Call = { url: string; body: unknown; headers: Record<string, string> };

  function fetchStub(
    responder: (call: Call) => { ok: boolean; status?: number; json?: unknown } | "throw",
  ) {
    const calls: Call[] = [];
    const impl = (async (url: string | URL, init?: RequestInit) => {
      const call: Call = {
        url: String(url),
        body: init?.body ? JSON.parse(String(init.body)) : null,
        headers: (init?.headers ?? {}) as Record<string, string>,
      };
      calls.push(call);

      const outcome = responder(call);
      if (outcome === "throw") throw new Error("network down");

      return {
        ok: outcome.ok,
        status: outcome.status ?? (outcome.ok ? 200 : 500),
        json: async () => outcome.json,
      } as unknown as Response;
    }) as unknown as typeof fetch;

    return { impl, calls };
  }

  it("increments via a single pipeline (INCR + PEXPIRE NX + PTTL)", async () => {
    const { impl, calls } = fetchStub(() => ({ ok: true, json: [{ result: 3 }, { result: 1 }, { result: 42_000 }] }));
    const store = createRestStore("https://redis.example/", "tok", impl);

    const result = await store.increment("lead:rl:abc", 600_000);

    assert.deepEqual(result, { count: 3, resetInMs: 42_000 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://redis.example/pipeline");
    assert.equal(calls[0].headers.Authorization, "Bearer tok");
    assert.deepEqual(calls[0].body, [
      ["INCR", "lead:rl:abc"],
      ["PEXPIRE", "lead:rl:abc", 600_000, "NX"],
      ["PTTL", "lead:rl:abc"],
    ]);
  });

  it("falls back to the window length when PTTL is not usable", async () => {
    const { impl } = fetchStub(() => ({ ok: true, json: [{ result: 1 }, { result: 1 }, { result: -1 }] }));
    const store = createRestStore("https://redis.example", "tok", impl);

    const result = await store.increment("k", 30_000);
    assert.deepEqual(result, { count: 1, resetInMs: 30_000 });
  });

  it("returns null (so the caller can fail open) on a transport error", async () => {
    const { impl } = fetchStub(() => "throw");
    const store = createRestStore("https://redis.example", "tok", impl);
    assert.equal(await store.increment("k", 1000), null);
  });

  it("returns null on a non-2xx response", async () => {
    const { impl } = fetchStub(() => ({ ok: false, status: 401 }));
    const store = createRestStore("https://redis.example", "tok", impl);
    assert.equal(await store.increment("k", 1000), null);
  });

  it("returns null when Redis reports a command-level error", async () => {
    const { impl } = fetchStub(() => ({ ok: true, json: [{ error: "WRONGTYPE" }] }));
    const store = createRestStore("https://redis.example", "tok", impl);
    assert.equal(await store.increment("k", 1000), null);
  });

  it("uses SET … PX … NX for idempotency and reports whether it created the key", async () => {
    const created = fetchStub(() => ({ ok: true, json: [{ result: "OK" }] }));
    const createdStore = createRestStore("https://redis.example", "tok", created.impl);
    assert.equal(await createdStore.setIfAbsent("lead:idem:x", "{}", 600_000), true);
    assert.deepEqual(created.calls[0].body, [["SET", "lead:idem:x", "{}", "PX", 600_000, "NX"]]);

    const existing = fetchStub(() => ({ ok: true, json: [{ result: null }] }));
    const existingStore = createRestStore("https://redis.example", "tok", existing.impl);
    assert.equal(await existingStore.setIfAbsent("lead:idem:x", "{}", 600_000), false);
  });

  it("reads idempotency values with GET", async () => {
    const { impl, calls } = fetchStub(() => ({ ok: true, json: [{ result: "{\"ok\":true}" }] }));
    const store = createRestStore("https://redis.example", "tok", impl);
    assert.equal(await store.get("lead:idem:x"), '{"ok":true}');
    assert.deepEqual(calls[0].body, [["GET", "lead:idem:x"]]);
  });
});

describe("rate limiter", () => {
  it("allows up to the limit, then blocks with a retry hint", async () => {
    const limiter = createRateLimiter(createMemoryStore(), 3, 60_000);

    const results = [];
    for (let i = 0; i < 5; i += 1) results.push(await limiter.check("client-a"));

    assert.deepEqual(
      results.map((r) => r.allowed),
      [true, true, true, false, false],
    );
    const blocked = results[3];
    assert.ok(blocked.retryAfterSeconds > 0 && blocked.retryAfterSeconds <= 60);
  });

  it("does not mix up clients", async () => {
    const limiter = createRateLimiter(createMemoryStore(), 1, 60_000);
    assert.equal((await limiter.check("a")).allowed, true);
    assert.equal((await limiter.check("b")).allowed, true);
    assert.equal((await limiter.check("a")).allowed, false);
  });

  it("fails open when the store is unavailable, and says so", async () => {
    const brokenStore = {
      kind: "rest" as const,
      increment: async () => null,
      get: async () => null,
      setIfAbsent: async () => false,
    };
    const limiter = createRateLimiter(brokenStore, 1, 60_000);

    // Far past the limit, but the store cannot count: requests must still pass.
    for (let i = 0; i < 10; i += 1) {
      assert.equal((await limiter.check("client")).allowed, true);
    }
  });
});

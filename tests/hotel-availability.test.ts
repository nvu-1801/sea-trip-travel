import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveAvailability,
  vietnamToday,
  type AvailabilityRow,
} from "@/domain/hotel-availability";

/**
 * The nightly count is a reference the owner typed, never a live inventory.
 * These cases pin the SPEC rules: tightest night wins, checkout is not part of
 * the stay, and missing data is "unknown" rather than "available".
 */

const TODAY = "2026-10-01";

function row(
  date: string,
  rooms: number,
  overrides: Partial<AvailabilityRow> = {},
): AvailabilityRow {
  return {
    date,
    rooms,
    closed: false,
    updatedAt: "2026-09-28T03:00:00.000Z",
    ...overrides,
  };
}

describe("resolveAvailability", () => {
  it("never claims a number for on_request hotels", () => {
    const result = resolveAvailability(
      "on_request",
      [row("2026-10-01", 5)],
      "2026-10-01",
      "2026-10-02",
      TODAY,
    );
    assert.deepEqual(result, { kind: "on_request" });
  });

  it("returns unknown when no dates are chosen", () => {
    const result = resolveAvailability(
      "manual_daily",
      [row("2026-10-01", 5)],
      null,
      null,
      TODAY,
    );
    assert.equal(result.kind, "unknown");
    if (result.kind !== "unknown") return;
    assert.equal(result.reason, "no_dates");
  });

  it("uses the tightest night of the stay", () => {
    const result = resolveAvailability(
      "manual_daily",
      [row("2026-10-01", 5), row("2026-10-02", 2), row("2026-10-03", 4)],
      "2026-10-01",
      "2026-10-04",
      TODAY,
    );
    assert.equal(result.kind, "available");
    if (result.kind !== "available") return;
    assert.equal(result.rooms, 2);
  });

  it("ignores the checkout date", () => {
    const result = resolveAvailability(
      "manual_daily",
      [row("2026-10-01", 5), row("2026-10-02", 4), row("2026-10-03", 0)],
      "2026-10-01",
      "2026-10-03",
      TODAY,
    );
    assert.equal(result.kind, "available");
    if (result.kind !== "available") return;
    assert.equal(result.rooms, 4);
  });

  it("treats a missing night as unknown, not as available", () => {
    const result = resolveAvailability(
      "manual_daily",
      [row("2026-10-01", 5), row("2026-10-03", 4)],
      "2026-10-01",
      "2026-10-04",
      TODAY,
    );
    assert.equal(result.kind, "unknown");
    if (result.kind !== "unknown") return;
    assert.equal(result.reason, "missing_nights");
    assert.deepEqual(result.missingDates, ["2026-10-02"]);
  });

  it("blocks the room when a night has 0 rooms", () => {
    const result = resolveAvailability(
      "manual_daily",
      [row("2026-10-01", 5), row("2026-10-02", 0)],
      "2026-10-01",
      "2026-10-03",
      TODAY,
    );
    assert.equal(result.kind, "closed");
    if (result.kind !== "closed") return;
    assert.equal(result.reason, "sold_out");
    assert.equal(result.date, "2026-10-02");
  });

  it("distinguishes a paused arrival date from sold out", () => {
    const result = resolveAvailability(
      "manual_daily",
      [row("2026-10-01", 5, { closed: true })],
      "2026-10-01",
      "2026-10-02",
      TODAY,
    );
    assert.equal(result.kind, "closed");
    if (result.kind !== "closed") return;
    assert.equal(result.reason, "closed");
  });

  it("does not present stale counts for a past stay", () => {
    const result = resolveAvailability(
      "manual_daily",
      [row("2026-01-01", 5)],
      "2026-01-01",
      "2026-01-02",
      TODAY,
    );
    assert.equal(result.kind, "unknown");
    if (result.kind !== "unknown") return;
    assert.equal(result.reason, "past_dates");
  });

  it("rejects an inverted range", () => {
    const result = resolveAvailability(
      "manual_daily",
      [row("2026-10-01", 5)],
      "2026-10-03",
      "2026-10-01",
      TODAY,
    );
    assert.equal(result.kind, "unknown");
    if (result.kind !== "unknown") return;
    assert.equal(result.reason, "invalid_dates");
  });

  it("treats a negative or fractional count as unusable instead of available", () => {
    for (const rooms of [-1, 1.5, Number.NaN]) {
      const result = resolveAvailability(
        "manual_daily",
        [row("2026-10-01", rooms)],
        "2026-10-01",
        "2026-10-02",
        TODAY,
      );
      assert.equal(result.kind, "closed", `rooms=${rooms}`);
    }
  });

  it("reports the oldest update among the nights it used", () => {
    const result = resolveAvailability(
      "manual_daily",
      [
        row("2026-10-01", 5, { updatedAt: "2026-09-20T01:00:00.000Z" }),
        row("2026-10-02", 4, { updatedAt: "2026-09-27T01:00:00.000Z" }),
      ],
      "2026-10-01",
      "2026-10-03",
      TODAY,
    );
    assert.equal(result.kind, "available");
    if (result.kind !== "available") return;
    assert.equal(result.updatedAt, "2026-09-20T01:00:00.000Z");
  });
});

describe("vietnamToday", () => {
  it("uses the Vietnam calendar day, not UTC", () => {
    // 2026-10-01T17:30Z is already 2026-10-02 in Vietnam (UTC+7).
    assert.equal(
      vietnamToday(new Date("2026-10-01T17:30:00.000Z")),
      "2026-10-02",
    );
  });
});

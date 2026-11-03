import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_NIGHTLY_AMOUNT,
  priceStay,
  quoteStay,
  rateRuleSchema,
  rulesOverlap,
  stayDates,
  type StoredRateRule,
} from "@/domain/hotel-pricing";

/**
 * Money rules from SPEC.md. Every expectation is an integer VND amount; a
 * missing night is never turned into 0.
 */

function rule(
  overrides: Partial<StoredRateRule> & Pick<StoredRateRule, "id" | "kind">,
): StoredRateRule {
  return {
    weekdays: [],
    startDate: null,
    endDate: null,
    amount: 1_000_000,
    includesBreakfast: false,
    includesTax: false,
    feesNote: "",
    label: "",
    ...overrides,
  };
}

const base = rule({ id: "base", kind: "base", amount: 1_000_000 });

describe("stayDates", () => {
  it("counts [checkIn, checkOut) nights across a month end", () => {
    assert.deepEqual(stayDates("2026-01-30", "2026-02-02"), [
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
    ]);
  });

  it("counts across the year end without a UTC shift", () => {
    assert.deepEqual(stayDates("2026-12-31", "2027-01-02"), [
      "2026-12-31",
      "2027-01-01",
    ]);
  });

  it("rejects a checkout on or before the check-in date", () => {
    assert.equal(stayDates("2026-03-10", "2026-03-10"), null);
    assert.equal(stayDates("2026-03-10", "2026-03-09"), null);
    assert.equal(stayDates("2026-02-30", "2026-03-02"), null);
  });

  it("caps an unreasonably long stay", () => {
    assert.equal(stayDates("2026-01-01", "2026-06-01"), null);
  });
});

describe("priceStay", () => {
  it("uses a date-range rule before a weekday rule before the base rate", () => {
    const rules = [
      base,
      rule({ id: "tue", kind: "weekday", weekdays: [1], amount: 1_200_000 }),
      rule({
        id: "holiday",
        kind: "date_range",
        startDate: "2026-09-01",
        endDate: "2026-09-03",
        amount: 1_500_000,
      }),
    ];
    const priced = priceStay(rules, "2026-09-01", "2026-09-03");
    assert.equal(priced.ok, true);
    if (!priced.ok) return;
    assert.deepEqual(
      priced.nights.map((night) => [night.date, night.amount, night.ruleId]),
      [
        ["2026-09-01", 1_500_000, "holiday"],
        ["2026-09-02", 1_500_000, "holiday"],
      ],
    );
    assert.equal(priced.total, 3_000_000);
  });

  it("falls back to the weekday rule outside the special range", () => {
    const rules = [
      base,
      rule({ id: "tue", kind: "weekday", weekdays: [1], amount: 1_200_000 }),
      rule({
        id: "holiday",
        kind: "date_range",
        startDate: "2026-09-01",
        endDate: "2026-09-03",
        amount: 1_500_000,
      }),
    ];
    // 2026-09-08 is a Tuesday (weekday index 1).
    const priced = priceStay(rules, "2026-09-08", "2026-09-09");
    assert.equal(priced.ok, true);
    if (!priced.ok) return;
    assert.equal(priced.nights[0].amount, 1_200_000);
  });

  it("never picks one of two equally specific rules", () => {
    const rules = [
      base,
      rule({
        id: "a",
        kind: "date_range",
        startDate: "2026-09-01",
        endDate: "2026-09-05",
        amount: 1_500_000,
      }),
      rule({
        id: "b",
        kind: "date_range",
        startDate: "2026-09-03",
        endDate: "2026-09-07",
        amount: 1_700_000,
      }),
    ];
    const priced = priceStay(rules, "2026-09-03", "2026-09-04");
    assert.equal(priced.ok, false);
    if (priced.ok) return;
    assert.equal(priced.issue, "ambiguous_rule");
  });

  it("reports the exact nights with no price instead of using 0", () => {
    const priced = priceStay([], "2026-09-01", "2026-09-03");
    assert.equal(priced.ok, false);
    if (priced.ok) return;
    assert.equal(priced.issue, "missing_rate");
    assert.deepEqual(priced.missingDates, ["2026-09-01", "2026-09-02"]);
  });

  it("rejects a stored amount that is zero, negative or above the cap", () => {
    for (const amount of [0, -1_000, MAX_NIGHTLY_AMOUNT + 1, Number.NaN]) {
      const priced = priceStay(
        [{ ...base, amount }],
        "2026-09-01",
        "2026-09-02",
      );
      assert.equal(priced.ok, false, `amount ${amount} must be rejected`);
      if (priced.ok) continue;
      assert.equal(priced.issue, "amount_out_of_range");
    }
  });

  it("rejects invalid dates before touching the rules", () => {
    const priced = priceStay([base], "2026-09-03", "2026-09-01");
    assert.equal(priced.ok, false);
    if (priced.ok) return;
    assert.equal(priced.issue, "invalid_dates");
  });
});

describe("rateRuleSchema", () => {
  it("accepts the three supported shapes", () => {
    assert.equal(
      rateRuleSchema.safeParse({
        id: "a",
        hotelId: "hotel_a",
        roomId: "room_a",
        kind: "base",
        amount: 1_000_000,
      }).success,
      true,
    );
    assert.equal(
      rateRuleSchema.safeParse({
        id: "b",
        hotelId: "hotel_a",
        roomId: "room_a",
        kind: "weekday",
        weekdays: [5, 6],
        amount: 1_200_000,
      }).success,
      true,
    );
    assert.equal(
      rateRuleSchema.safeParse({
        id: "c",
        hotelId: "hotel_a",
        roomId: "room_a",
        kind: "date_range",
        startDate: "2026-12-24",
        endDate: "2027-01-02",
        amount: 2_000_000,
      }).success,
      true,
    );
  });

  it("rejects negative/zero/float money and mixed rule shapes", () => {
    const invalid = [
      { kind: "base", amount: 0 },
      { kind: "base", amount: -5 },
      { kind: "base", amount: 1.5 },
      { kind: "base", weekdays: [1] },
      { kind: "weekday", weekdays: [] },
      { kind: "weekday", weekdays: [1, 1] },
      { kind: "date_range" },
      { kind: "date_range", startDate: "2026-01-02", endDate: "2026-01-01" },
    ];
    for (const value of invalid) {
      const parsed = rateRuleSchema.safeParse({
        id: "x",
        hotelId: "hotel_a",
        roomId: "room_a",
        amount: 1_000_000,
        ...value,
      });
      assert.equal(parsed.success, false, JSON.stringify(value));
    }
  });
});

describe("rulesOverlap", () => {
  it("treats two base rules as a conflict", () => {
    assert.equal(rulesOverlap(base, base), true);
  });

  it("detects shared weekdays and touching date ranges", () => {
    assert.equal(
      rulesOverlap(
        { kind: "weekday", weekdays: [5, 6], startDate: null, endDate: null },
        { kind: "weekday", weekdays: [0, 6], startDate: null, endDate: null },
      ),
      true,
    );
    assert.equal(
      rulesOverlap(
        { kind: "weekday", weekdays: [5], startDate: null, endDate: null },
        { kind: "weekday", weekdays: [6], startDate: null, endDate: null },
      ),
      false,
    );
    assert.equal(
      rulesOverlap(
        {
          kind: "date_range",
          weekdays: [],
          startDate: "2026-01-01",
          endDate: "2026-01-05",
        },
        {
          kind: "date_range",
          weekdays: [],
          startDate: "2026-01-05",
          endDate: "2026-01-08",
        },
      ),
      true,
    );
  });
});

describe("quoteStay", () => {
  it("multiplies nightly prices by room quantity", () => {
    const rules = [
      base,
      rule({
        id: "second-night",
        kind: "date_range",
        startDate: "2026-10-02",
        endDate: "2026-10-02",
        amount: 1_500_000,
      }),
    ];
    const quote = quoteStay(
      [{ roomId: "room_a", quantity: 2, rules }],
      "2026-10-01",
      "2026-10-03",
      null,
    );
    assert.equal(quote.status, "quoted");
    assert.equal(quote.nights, 2);
    assert.equal(quote.rooms[0].perRoomTotal, 2_500_000);
    assert.equal(quote.rooms[0].total, 5_000_000);
    assert.equal(quote.lodgingTotal, 5_000_000);
  });

  it("sums several room types", () => {
    const quote = quoteStay(
      [
        { roomId: "room_a", quantity: 1, rules: [base] },
        {
          roomId: "room_b",
          quantity: 2,
          rules: [{ ...base, amount: 800_000 }],
        },
      ],
      "2026-10-01",
      "2026-10-02",
      null,
    );
    assert.equal(quote.lodgingTotal, 1_000_000 + 1_600_000);
  });

  it("returns needs_quote without a total when one night has no price", () => {
    const quote = quoteStay(
      [{ roomId: "room_a", quantity: 1, rules: [base] }],
      "2026-10-01",
      "2026-10-03",
      null,
    );
    // The base rule covers both nights, so this one is complete.
    assert.equal(quote.status, "quoted");
    const partial = quoteStay(
      [{ roomId: "room_a", quantity: 1, rules: [] }],
      "2026-10-01",
      "2026-10-03",
      null,
    );
    assert.equal(partial.status, "needs_quote");
    assert.equal(partial.lodgingTotal, null);
    assert.deepEqual(partial.rooms[0].missingDates, [
      "2026-10-01",
      "2026-10-02",
    ]);
  });

  it("does not charge the room again when the tour includes it", () => {
    const quote = quoteStay(
      [{ roomId: "room_a", quantity: 2, rules: [base] }],
      "2026-10-01",
      "2026-10-03",
      "included",
    );
    assert.equal(quote.includedByTour, true);
    assert.equal(quote.lodgingTotal, 0);
    assert.ok(quote.reasons.includes("included_by_tour"));
  });

  it("never derives an upgrade surcharge from unrelated prices", () => {
    const quote = quoteStay(
      [{ roomId: "room_a", quantity: 1, rules: [base] }],
      "2026-10-01",
      "2026-10-02",
      "upgrade",
    );
    assert.equal(quote.status, "needs_quote");
    assert.ok(quote.reasons.includes("upgrade_needs_quote"));
    // The reference subtotal may still be shown as partial information.
    assert.equal(quote.lodgingTotal, 1_000_000);
  });

  it("flags an unconfirmed surcharge instead of presenting a final total", () => {
    const rules = [{ ...base, feesNote: "Phụ thu giường phụ chưa xác nhận" }];
    const quote = quoteStay(
      [{ roomId: "room_a", quantity: 1, rules }],
      "2026-10-01",
      "2026-10-02",
      "additional",
    );
    assert.equal(quote.status, "needs_quote");
    assert.equal(quote.lodgingTotal, 1_000_000);
    assert.ok(quote.reasons.includes("unknown_fees"));
  });

  it("returns no number at all without valid dates", () => {
    const quote = quoteStay(
      [{ roomId: "room_a", quantity: 1, rules: [base] }],
      "2026-10-03",
      "2026-10-01",
      null,
    );
    assert.equal(quote.status, "needs_quote");
    assert.equal(quote.lodgingTotal, null);
    assert.equal(quote.nights, 0);
  });
});

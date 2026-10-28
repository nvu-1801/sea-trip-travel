import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  bookingCreateSchema,
  financeEntryCreateSchema,
  financeMonthRange,
  financePresetRange,
  financeTotals,
  isFinanceAmount,
  isFinanceDate,
} from "../src/domain/tour-finance";

test("cash flow subtracts refunds and paid expenses, not estimates", () => {
  assert.deepEqual(financeTotals([
    { kind: "receipt", amount: 10_000_000, date: "2026-10-01", actual: true },
    { kind: "refund", amount: 1_000_000, date: "2026-10-02", actual: true },
    { kind: "expense", amount: 6_000_000, date: "2026-10-03", actual: true },
    { kind: "expense", amount: 9_000_000, date: "2026-10-03", actual: false },
    { kind: "receipt", amount: 2, date: "2026-11-01", actual: true },
  ], "2026-10-01", "2026-11-01"),
  { receipts: 10_000_000, refunds: 1_000_000, revenue: 9_000_000, expenses: 6_000_000, profit: 3_000_000 });
});

test("validates leap days and VND amounts", () => {
  assert.equal(isFinanceDate("2024-02-29"), true);
  assert.equal(isFinanceDate("2026-02-29"), false);
  assert.equal(isFinanceAmount(-1), false);
  assert.equal(isFinanceAmount(1.5), false);
  assert.equal(isFinanceAmount(Number.MAX_SAFE_INTEGER), false);
  assert.throws(() => financeTotals([], "2026-11-01", "2026-10-01"));
});

test("allows losses and excludes entries outside the period", () => {
  const totals = financeTotals([{ kind: "expense", amount: 100, date: "2026-01-01", actual: true }], "2026-01-01", "2027-01-01");
  assert.equal(totals.profit, -100);
});

test("month and preset ranges use exclusive end dates", () => {
  assert.deepEqual(financeMonthRange(2026, 12), {
    from: "2026-12-01",
    to: "2027-01-01",
  });
  assert.deepEqual(
    financePresetRange("last-month", new Date(2026, 0, 15)),
    { from: "2025-12-01", to: "2026-01-01" },
  );
  assert.deepEqual(financePresetRange("this-year", new Date(2026, 5, 1)), {
    from: "2026-01-01",
    to: "2027-01-01",
  });
});

test("booking and entry schemas reject unsafe money and missing links", () => {
  const base = {
    requestId: "req_test_123",
    tourSlug: "tour-test",
    tourTitle: "Tour test",
    travelDate: "2026-10-10",
    partySize: 2,
    saleAmount: 10_000_000,
    status: "confirmed" as const,
    note: "",
  };
  assert.equal(bookingCreateSchema.safeParse(base).success, true);
  assert.equal(
    bookingCreateSchema.safeParse({ ...base, saleAmount: 1.5 }).success,
    false,
  );
  assert.equal(
    bookingCreateSchema.safeParse({ ...base, travelDate: "2026-02-29" }).success,
    false,
  );
  const expense = {
    requestId: "req_entry_123",
    bookingId: null,
    kind: "expense" as const,
    amount: 2_000_000,
    date: "2026-10-10",
    method: "cash" as const,
    category: "transport" as const,
    description: "",
    actual: true,
  };
  assert.equal(financeEntryCreateSchema.safeParse(expense).success, true);
  assert.equal(
    financeEntryCreateSchema.safeParse({ ...expense, kind: "receipt" }).success,
    false,
  );
  assert.equal(
    financeEntryCreateSchema.safeParse({ ...expense, actual: false }).success,
    true,
  );
});

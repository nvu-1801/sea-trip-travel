import { strict as assert } from "node:assert";
import { test } from "node:test";
import { financeTotals, isFinanceAmount, isFinanceDate } from "../src/domain/tour-finance";

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

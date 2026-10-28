/** Cash-flow amounts are integer VND. A contract or lead is not a payment. */
export type FinanceEntry = {
  kind: "receipt" | "refund" | "expense";
  amount: number;
  date: string;
  actual: boolean;
};

export function isFinanceDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isFinanceAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && value <= 1_000_000_000_000;
}

/** Dates are local calendar dates in Vietnam; the end date is exclusive. */
export function financeTotals(entries: FinanceEntry[], start: string, end: string) {
  if (!isFinanceDate(start) || !isFinanceDate(end) || start >= end)
    throw new Error("Invalid reporting period");
  let receipts = 0, refunds = 0, expenses = 0;
  for (const entry of entries) {
    if (!isFinanceDate(entry.date) || !isFinanceAmount(entry.amount) ||
        !["receipt", "refund", "expense"].includes(entry.kind))
      throw new Error("Invalid finance entry");
    if (!entry.actual || entry.date < start || entry.date >= end) continue;
    if (entry.kind === "receipt") receipts += entry.amount;
    else if (entry.kind === "refund") refunds += entry.amount;
    else expenses += entry.amount;
    if (![receipts, refunds, expenses].every(Number.isSafeInteger))
      throw new Error("Finance total exceeds safe integer range");
  }
  const revenue = receipts - refunds;
  const profit = revenue - expenses;
  if (!Number.isSafeInteger(profit)) throw new Error("Finance total exceeds safe integer range");
  return { receipts, refunds, revenue, expenses, profit };
}

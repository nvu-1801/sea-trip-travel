import { z } from "zod";

/** Cash-flow amounts are integer VND. A contract or lead is not a payment. */
export type FinanceEntry = {
  kind: "receipt" | "refund" | "expense";
  amount: number;
  date: string;
  actual: boolean;
};

export const MAX_FINANCE_AMOUNT = 1_000_000_000_000;

export const BOOKING_STATUSES = [
  "confirmed",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const FINANCE_KINDS = ["receipt", "refund", "expense"] as const;
export type FinanceKind = (typeof FINANCE_KINDS)[number];

export const EXPENSE_CATEGORIES = [
  "transport",
  "hotel",
  "meals",
  "tickets",
  "guide",
  "other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const PAYMENT_METHODS = ["cash", "bank", "card", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isFinanceDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isFinanceAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0 && value <= MAX_FINANCE_AMOUNT;
}

/** A contract can be zero while the owner has not agreed a sale price yet. */
export function isContractAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_FINANCE_AMOUNT;
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

export function financeMonthRange(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2200)
    throw new Error("Invalid year");
  if (!Number.isInteger(month) || month < 1 || month > 12)
    throw new Error("Invalid month");
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const to = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { from, to };
}

export function financeYearRange(year: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2200)
    throw new Error("Invalid year");
  return { from: `${year}-01-01`, to: `${year + 1}-01-01` };
}

/** Presets are calculated in the visitor's local timezone, then sent as dates. */
export function financePresetRange(
  preset: "this-month" | "last-month" | "this-year",
  now = new Date(),
) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (preset === "this-month") return financeMonthRange(year, month);
  if (preset === "last-month") {
    return month === 1
      ? financeMonthRange(year - 1, 12)
      : financeMonthRange(year, month - 1);
  }
  return financeYearRange(year);
}

const dateSchema = z
  .string()
  .refine(isFinanceDate, "Ngày không hợp lệ (YYYY-MM-DD)");

const requestIdSchema = z
  .string()
  .min(8)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/, "Mã yêu cầu không hợp lệ");

export const bookingCreateSchema = z.object({
  requestId: requestIdSchema,
  leadId: z.string().max(100).nullable().optional(),
  tourSlug: z.string().min(1).max(160),
  tourTitle: z.string().max(200).default(""),
  travelDate: dateSchema,
  partySize: z.number().int().min(1).max(100),
  saleAmount: z
    .number()
    .int()
    .refine(isContractAmount, "Giá bán phải là số VND hợp lệ"),
  status: z.enum(BOOKING_STATUSES).default("confirmed"),
  note: z.string().max(1000).default(""),
  confirmDuplicate: z.boolean().optional(),
});

export const bookingUpdateSchema = bookingCreateSchema
  .omit({ requestId: true, confirmDuplicate: true })
  .extend({
    id: z.string().min(1).max(80),
    revision: z.number().int().nonnegative(),
  });

const financeEntryBase = z.object({
  requestId: requestIdSchema,
  bookingId: z.string().max(80).nullable().default(null),
  kind: z.enum(FINANCE_KINDS),
  amount: z.number().int().refine(isFinanceAmount, "Số tiền phải là VND hợp lệ"),
  date: dateSchema,
  method: z.enum(PAYMENT_METHODS).default("cash"),
  category: z.enum(EXPENSE_CATEGORIES).default("other"),
  description: z.string().max(300).default(""),
  actual: z.boolean().default(true),
});

function validateEntry(
  value: {
    kind: FinanceKind;
    bookingId: string | null;
    actual: boolean;
  },
  context: z.RefinementCtx,
) {
  if (value.kind !== "expense" && !value.bookingId) {
    context.addIssue({
      code: "custom",
      path: ["bookingId"],
      message: "Khoản thu/hoàn tiền phải gắn với hồ sơ tour",
    });
  }
  if (value.kind !== "expense" && value.actual !== true) {
    context.addIssue({
      code: "custom",
      path: ["actual"],
      message: "Khoản thu/hoàn tiền phải là giao dịch thực tế",
    });
  }
}

export const financeEntryCreateSchema =
  financeEntryBase.superRefine(validateEntry);

export const financeEntryUpdateSchema = financeEntryBase
  .omit({ requestId: true })
  .extend({
    id: z.string().min(1).max(80),
    revision: z.number().int().nonnegative(),
  })
  .superRefine(validateEntry);

export const financeVoidSchema = z.object({
  id: z.string().min(1).max(80),
  reason: z.string().max(300).default(""),
});

export const bookingStatusFilterSchema = z.enum([
  "confirmed",
  "completed",
  "cancelled",
]);

export const financeReportSchema = z.object({
  from: dateSchema,
  to: dateSchema,
  tour: z.string().max(160).optional(),
  status: bookingStatusFilterSchema.optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;
export type BookingUpdateInput = z.infer<typeof bookingUpdateSchema>;
export type FinanceEntryCreateInput = z.infer<typeof financeEntryCreateSchema>;
export type FinanceEntryUpdateInput = z.infer<typeof financeEntryUpdateSchema>;
export type FinanceReportQuery = z.infer<typeof financeReportSchema>;

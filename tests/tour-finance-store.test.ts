import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

const directory = mkdtempSync(path.join(tmpdir(), "seatrip-finance-"));
process.env.CMS_DB_PATH = path.join(directory, "test.sqlite");
process.env.CMS_ENABLED = "1";
process.env.LEAD_ENCRYPTION_KEY = randomBytes(32).toString("hex");

import { db } from "../src/server/cms/db";
import { persistLead } from "../src/server/cms/leads";
import {
  createBooking,
  createEntry,
  findDuplicateBooking,
  getBookingDetail,
  getFinanceReport,
  getFinanceSummary,
  updateBooking,
  updateEntry,
  voidEntry,
} from "../src/server/cms/finance";

after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});

const now = new Date().toISOString();
db()
  .prepare(
    "INSERT OR IGNORE INTO records(collection,id,data,published,state,revision,updated_at) VALUES(?,?,?,?,?,?,?)",
  )
  .run(
    "tours",
    "tour_finance_test",
    JSON.stringify({
      id: "tour_finance_test",
      slug: "tour-finance-test",
      title: "Tour tài chính thử nghiệm",
    }),
    JSON.stringify({
      id: "tour_finance_test",
      slug: "tour-finance-test",
      title: "Tour tài chính thử nghiệm",
    }),
    "published",
    1,
    now,
  );
persistLead("lead_finance_test", {
  fullName: "Khách thử nghiệm",
  phone: "0900000000",
  tourSlug: "tour-finance-test",
  travelDate: "2026-10-15",
  partySize: 2,
});

let cashBookingId = "";

const bookingInput = {
  requestId: "req_booking_finance_1",
  leadId: "lead_finance_test",
  tourSlug: "tour-finance-test",
  tourTitle: "",
  travelDate: "2026-10-15",
  partySize: 2,
  saleAmount: 10_000_000,
  status: "confirmed" as const,
  note: "Ghi chú nội bộ",
};

test("booking is idempotent, keeps a tour snapshot and detects duplicates", () => {
  const first = createBooking(bookingInput, { actor: "qa" });
  const second = createBooking(bookingInput, { actor: "qa" });
  assert.equal(first.id, second.id);
  assert.equal(first.tourTitle, "Tour tài chính thử nghiệm");
  const duplicate = findDuplicateBooking(
    "lead_finance_test",
    "tour-finance-test",
    "2026-10-15",
  );
  assert.equal(duplicate?.id, first.id);
  const detail = getBookingDetail(first.id);
  assert.equal(detail?.entries.length, 0);
  assert.equal(detail?.booking.saleAmount, 10_000_000);
  assert.equal(detail?.history.length, 1);
});

test("cash-flow report excludes estimates and keeps contract value separate", () => {
  const booking = createBooking(
    {
      ...bookingInput,
      requestId: "req_booking_finance_2",
      leadId: null,
    },
    { actor: "qa" },
  );
  const completed = createBooking(
    {
      ...bookingInput,
      requestId: "req_booking_finance_3",
      leadId: null,
      saleAmount: 20_000_000,
      status: "completed",
    },
    { actor: "qa" },
  ).id;
  assert.ok(booking.id);
  assert.ok(completed);
  cashBookingId = booking.id;

  createEntry(
    {
      requestId: "req_entry_finance_receipt",
      bookingId: booking.id,
      kind: "receipt",
      amount: 10_000_000,
      date: "2026-10-01",
      method: "bank",
      category: "other",
      description: "Cọc",
      actual: true,
    },
    { actor: "qa" },
  );
  createEntry(
    {
      requestId: "req_entry_finance_refund",
      bookingId: booking.id,
      kind: "refund",
      amount: 1_000_000,
      date: "2026-10-02",
      method: "bank",
      category: "other",
      description: "Hoàn",
      actual: true,
    },
    { actor: "qa" },
  );
  createEntry(
    {
      requestId: "req_entry_finance_expense",
      bookingId: booking.id,
      kind: "expense",
      amount: 6_000_000,
      date: "2026-10-03",
      method: "cash",
      category: "transport",
      description: "Xe",
      actual: true,
    },
    { actor: "qa" },
  );
  createEntry(
    {
      requestId: "req_entry_finance_estimate",
      bookingId: booking.id,
      kind: "expense",
      amount: 9_000_000,
      date: "2026-10-03",
      method: "cash",
      category: "hotel",
      description: "Dự kiến",
      actual: false,
    },
    { actor: "qa" },
  );
  createEntry(
    {
      requestId: "req_entry_finance_general",
      bookingId: null,
      kind: "expense",
      amount: 500_000,
      date: "2026-10-04",
      method: "cash",
      category: "other",
      description: "Chi chung",
      actual: true,
    },
    { actor: "qa" },
  );

  const report = getFinanceReport({
    from: "2026-10-01",
    to: "2026-11-01",
    page: 1,
    pageSize: 20,
  });
  assert.deepEqual(report.totals, {
    receipts: 10_000_000,
    refunds: 1_000_000,
    revenue: 9_000_000,
    expenses: 6_500_000,
    profit: 2_500_000,
  });
  assert.equal(report.contractValue, 40_000_000);
  const summary = getFinanceSummary("2026-10-01", "2026-11-01");
  assert.equal(summary.profit, 2_500_000);
  assert.equal(report.bookings.length, 3);
  const row = report.bookings.find((item) => item.id === booking.id);
  assert.equal(row?.receipts, 10_000_000);
  assert.equal(row?.refunds, 1_000_000);
  assert.equal(row?.expenses, 6_000_000);
  assert.equal(row?.profit, 3_000_000);
  assert.equal(report.trend.length, 4);

  const detail = getBookingDetail(booking.id);
  assert.equal(detail?.totals.profit, 3_000_000);
  assert.equal(detail?.entries.length, 4);
  assert.equal(detail?.history.length, 5);
});

test("voiding an entry and editing with a stale revision are safe", () => {
  const report = getFinanceReport({
    from: "2026-10-01",
    to: "2026-11-01",
    page: 1,
    pageSize: 20,
  });
  const booking = report.bookings.find((item) => item.id === cashBookingId);
  assert.ok(booking);
  const detail = getBookingDetail(booking.id);
  const expense = detail?.entries.find(
    (entry) => entry.kind === "expense" && entry.actual,
  );
  assert.ok(expense);
  voidEntry(expense.id, "Nhập nhầm", { actor: "qa" });
  const afterVoid = getBookingDetail(booking.id);
  assert.equal(afterVoid?.totals.expenses, 0);
  assert.ok(
    afterVoid?.entries.some(
      (entry) => entry.id === expense.id && entry.deletedAt,
    ),
  );
  assert.equal(afterVoid?.history.length, 6);
  const afterVoidReport = getFinanceReport({
    from: "2026-10-01",
    to: "2026-11-01",
    page: 1,
    pageSize: 20,
  });
  assert.equal(afterVoidReport.totals.expenses, 500_000);

  const updated = updateBooking(
    {
      id: booking.id,
      revision: booking.revision,
      leadId: booking.leadId,
      tourSlug: booking.tourSlug,
      tourTitle: booking.tourTitle,
      travelDate: booking.travelDate,
      partySize: 3,
      saleAmount: 12_000_000,
      status: "completed",
      note: "",
    },
    { actor: "qa" },
  );
  assert.equal(updated.partySize, 3);
  assert.equal(updated.status, "completed");
  assert.throws(
    () =>
      updateBooking(
        {
          id: booking.id,
          revision: booking.revision,
          leadId: booking.leadId,
          tourSlug: booking.tourSlug,
          tourTitle: booking.tourTitle,
          travelDate: booking.travelDate,
          partySize: 2,
          saleAmount: 1,
          status: "confirmed",
          note: "",
        },
        { actor: "qa" },
      ),
    /thay đổi/,
  );

  const entry = createEntry(
    {
      requestId: "req_entry_finance_edit",
      bookingId: booking.id,
      kind: "receipt",
      amount: 2_000_000,
      date: "2026-10-05",
      method: "cash",
      category: "other",
      description: "",
      actual: true,
    },
    { actor: "qa" },
  );
  const edited = updateEntry(
    {
      id: entry.id,
      revision: entry.revision,
      bookingId: entry.bookingId,
      kind: entry.kind,
      amount: 2_500_000,
      date: entry.entryDate,
      method: entry.method,
      category: entry.category,
      description: "Sửa",
      actual: true,
    },
    { actor: "qa" },
  );
  assert.equal(edited.amount, 2_500_000);
  assert.throws(
    () =>
      updateEntry(
        {
          id: entry.id,
          revision: entry.revision,
          bookingId: entry.bookingId,
          kind: entry.kind,
          amount: 1,
          date: entry.entryDate,
          method: entry.method,
          category: entry.category,
          description: "",
          actual: true,
        },
        { actor: "qa" },
      ),
    /thay đổi/,
  );
});

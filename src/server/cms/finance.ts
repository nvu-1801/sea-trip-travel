import "server-only";
import { randomUUID } from "node:crypto";
import { db, transaction, audit, type AuditContext } from "./db";
import { list } from "./store";
import {
  type BookingCreateInput,
  type BookingStatus,
  type BookingUpdateInput,
  type FinanceEntryCreateInput,
  type FinanceEntryUpdateInput,
  type FinanceKind,
  type FinanceReportQuery,
  type PaymentMethod,
  type ExpenseCategory,
} from "@/domain/tour-finance";

/**
 * Tour finance is deliberately separate from leads and catalogue prices.
 *
 * A lead status or a tour price is never treated as revenue. Only the rows an
 * owner enters here become cash-flow numbers, and every mutation is audited.
 * The booking stores a minimal snapshot (tour title, dates and amounts) so a
 * later tour rename or lead purge cannot rewrite history or expose customer PII.
 */

export type BookingRecord = {
  id: string;
  requestId: string;
  leadId: string | null;
  tourSlug: string;
  tourTitle: string;
  travelDate: string;
  partySize: number;
  saleAmount: number;
  status: BookingStatus;
  note: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type EntryRecord = {
  id: string;
  requestId: string;
  bookingId: string | null;
  kind: FinanceKind;
  amount: number;
  entryDate: string;
  method: PaymentMethod;
  category: ExpenseCategory;
  description: string;
  actual: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  deletedReason: string;
};

export type BookingSummary = BookingRecord & {
  receipts: number;
  refunds: number;
  expenses: number;
  profit: number;
};

export type BookingDetail = {
  booking: BookingRecord;
  entries: EntryRecord[];
  totals: {
    receipts: number;
    refunds: number;
    revenue: number;
    expenses: number;
    profit: number;
  };
  history: {
    id: number;
    action: string;
    createdAt: string;
    actor: string | null;
    status: string;
    details: unknown;
  }[];
};

type BookingRow = {
  id: string;
  request_id: string;
  lead_id: string | null;
  tour_slug: string;
  tour_title: string;
  travel_date: string;
  party_size: number;
  sale_amount: number;
  status: BookingStatus;
  note: string;
  revision: number;
  created_at: string;
  updated_at: string;
};

type EntryRow = {
  id: string;
  request_id: string;
  booking_id: string | null;
  kind: FinanceKind;
  amount: number;
  entry_date: string;
  method: PaymentMethod;
  category: ExpenseCategory;
  description: string;
  actual: number;
  revision: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_reason: string;
};

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

function bookingOf(row: BookingRow): BookingRecord {
  return {
    id: row.id,
    requestId: row.request_id,
    leadId: row.lead_id,
    tourSlug: row.tour_slug,
    tourTitle: row.tour_title,
    travelDate: row.travel_date,
    partySize: row.party_size,
    saleAmount: row.sale_amount,
    status: row.status,
    note: row.note,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function entryOf(row: EntryRow): EntryRecord {
  return {
    id: row.id,
    requestId: row.request_id,
    bookingId: row.booking_id,
    kind: row.kind,
    amount: row.amount,
    entryDate: row.entry_date,
    method: row.method,
    category: row.category,
    description: row.description,
    actual: row.actual === 1,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    deletedReason: row.deleted_reason,
  };
}

function readBooking(id: string): BookingRow | undefined {
  return db().prepare("SELECT * FROM tour_bookings WHERE id=?").get(id) as
    | BookingRow
    | undefined;
}

function readEntry(id: string): EntryRow | undefined {
  return db()
    .prepare("SELECT * FROM tour_finance_entries WHERE id=?")
    .get(id) as EntryRow | undefined;
}

function assertPeriod(from: string, to: string) {
  if (from >= to) throw new Error("Khoảng ngày không hợp lệ");
}

function tourSnapshot(slug: string, title: string) {
  const row = list("tours").find(
    (item) => item.state !== "deleted" && String(item.data.slug ?? "") === slug,
  );
  if (!row) throw new Error("Tour không tồn tại hoặc đã bị xóa");
  return {
    slug,
    title: title.trim() || String(row.data.title ?? row.data.name ?? slug),
  };
}

/**
 * Duplicate detection is advisory: one lead may legitimately produce more than
 * one booking, so the owner confirms rather than being blocked outright.
 */
export function findDuplicateBooking(
  leadId: string | null | undefined,
  tourSlug: string,
  travelDate: string,
) {
  if (!leadId) return null;
  return (
    (db()
      .prepare(
        "SELECT * FROM tour_bookings WHERE lead_id=? AND tour_slug=? AND travel_date=? AND status!='cancelled' ORDER BY created_at DESC LIMIT 1",
      )
      .get(leadId, tourSlug, travelDate) as BookingRow | undefined) ?? null
  );
}

export function createBooking(
  input: BookingCreateInput,
  context: AuditContext = {},
) {
  const snapshot = tourSnapshot(input.tourSlug, input.tourTitle);
  if (input.leadId) {
    const lead = db()
      .prepare("SELECT id FROM leads WHERE id=? AND deleted_at IS NULL")
      .get(input.leadId);
    if (!lead) throw new Error("Yêu cầu tư vấn không tồn tại hoặc đã bị xóa");
  }
  const id = newId("bk");
  const now = nowIso();
  return transaction(() => {
    const existing = db()
      .prepare("SELECT * FROM tour_bookings WHERE request_id=?")
      .get(input.requestId) as BookingRow | undefined;
    if (existing) return bookingOf(existing);
    db()
      .prepare(
        "INSERT INTO tour_bookings(id,request_id,lead_id,tour_slug,tour_title,travel_date,party_size,sale_amount,status,note,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        input.requestId,
        input.leadId ?? null,
        snapshot.slug,
        snapshot.title,
        input.travelDate,
        input.partySize,
        input.saleAmount,
        input.status,
        input.note,
        1,
        now,
        now,
      );
    audit("finance-booking-create", `finance/booking/${id}`, {
      ...context,
      status: "success",
      details: {
        bookingId: id,
        tourSlug: snapshot.slug,
        travelDate: input.travelDate,
        saleAmount: input.saleAmount,
        status: input.status,
      },
    });
    const row = readBooking(id);
    if (!row) throw new Error("Không thể đọc hồ sơ vừa tạo");
    return bookingOf(row);
  });
}

export function updateBooking(
  input: BookingUpdateInput,
  context: AuditContext = {},
) {
  return transaction(() => {
    const before = readBooking(input.id);
    if (!before) throw new Error("Không tìm thấy hồ sơ tour");
    if (before.revision !== input.revision)
      throw new Error("Hồ sơ đã thay đổi. Tải lại trước khi lưu.");
    const snapshot = tourSnapshot(input.tourSlug, input.tourTitle);
    const now = nowIso();
    db()
      .prepare(
        "UPDATE tour_bookings SET tour_slug=?,tour_title=?,travel_date=?,party_size=?,sale_amount=?,status=?,note=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
      )
      .run(
        snapshot.slug,
        snapshot.title,
        input.travelDate,
        input.partySize,
        input.saleAmount,
        input.status,
        input.note,
        now,
        input.id,
        input.revision,
      );
    audit("finance-booking-update", `finance/booking/${input.id}`, {
      ...context,
      status: "success",
      details: {
        bookingId: input.id,
        before: {
          travelDate: before.travel_date,
          saleAmount: before.sale_amount,
          status: before.status,
        },
        after: {
          travelDate: input.travelDate,
          saleAmount: input.saleAmount,
          status: input.status,
        },
      },
    });
    const row = readBooking(input.id);
    if (!row) throw new Error("Không thể đọc hồ sơ vừa lưu");
    return bookingOf(row);
  });
}

function validateEntryBooking(input: { bookingId?: string | null }) {
  if (!input.bookingId) return;
  const booking = readBooking(input.bookingId);
  if (!booking) throw new Error("Hồ sơ tour không tồn tại");
}

export function createEntry(
  input: FinanceEntryCreateInput,
  context: AuditContext = {},
) {
  validateEntryBooking(input);
  const id = newId("fin");
  const now = nowIso();
  return transaction(() => {
    const existing = db()
      .prepare("SELECT * FROM tour_finance_entries WHERE request_id=?")
      .get(input.requestId) as EntryRow | undefined;
    if (existing) return entryOf(existing);
    db()
      .prepare(
        "INSERT INTO tour_finance_entries(id,request_id,booking_id,kind,amount,entry_date,method,category,description,actual,revision,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        input.requestId,
        input.bookingId,
        input.kind,
        input.amount,
        input.date,
        input.method,
        input.category,
        input.description,
        input.actual ? 1 : 0,
        1,
        now,
        now,
      );
    const target = input.bookingId
      ? `finance/booking/${input.bookingId}`
      : `finance/expense/${id}`;
    audit("finance-entry-create", target, {
      ...context,
      status: "success",
      details: {
        entryId: id,
        bookingId: input.bookingId,
        kind: input.kind,
        amount: input.amount,
        date: input.date,
        actual: input.actual,
      },
    });
    const row = readEntry(id);
    if (!row) throw new Error("Không thể đọc giao dịch vừa tạo");
    return entryOf(row);
  });
}

export function updateEntry(
  input: FinanceEntryUpdateInput,
  context: AuditContext = {},
) {
  return transaction(() => {
    const before = readEntry(input.id);
    if (!before) throw new Error("Không tìm thấy giao dịch");
    if (before.deleted_at) throw new Error("Giao dịch đã bị hủy");
    if (before.revision !== input.revision)
      throw new Error("Giao dịch đã thay đổi. Tải lại trước khi lưu.");
    validateEntryBooking(input);
    db()
      .prepare(
        "UPDATE tour_finance_entries SET booking_id=?,kind=?,amount=?,entry_date=?,method=?,category=?,description=?,actual=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
      )
      .run(
        input.bookingId,
        input.kind,
        input.amount,
        input.date,
        input.method,
        input.category,
        input.description,
        input.actual ? 1 : 0,
        nowIso(),
        input.id,
        input.revision,
      );
    const target = input.bookingId
      ? `finance/booking/${input.bookingId}`
      : `finance/expense/${before.id}`;
    audit("finance-entry-update", target, {
      ...context,
      status: "success",
      details: {
        entryId: input.id,
        before: {
          kind: before.kind,
          amount: before.amount,
          date: before.entry_date,
          actual: before.actual === 1,
        },
        after: {
          kind: input.kind,
          amount: input.amount,
          date: input.date,
          actual: input.actual,
        },
      },
    });
    const row = readEntry(input.id);
    if (!row) throw new Error("Không thể đọc giao dịch vừa lưu");
    return entryOf(row);
  });
}

export function voidEntry(
  id: string,
  reason: string,
  context: AuditContext = {},
) {
  return transaction(() => {
    const before = readEntry(id);
    if (!before) throw new Error("Không tìm thấy giao dịch");
    if (before.deleted_at) return entryOf(before);
    db()
      .prepare(
        "UPDATE tour_finance_entries SET deleted_at=?,deleted_reason=?,updated_at=? WHERE id=?",
      )
      .run(nowIso(), reason.slice(0, 300), nowIso(), id);
    const target = before.booking_id
      ? `finance/booking/${before.booking_id}`
      : `finance/expense/${id}`;
    audit("finance-entry-void", target, {
      ...context,
      status: "success",
      details: {
        entryId: id,
        kind: before.kind,
        amount: before.amount,
        reason: reason.slice(0, 200),
      },
    });
    const row = readEntry(id);
    if (!row) throw new Error("Không thể đọc giao dịch vừa hủy");
    return entryOf(row);
  });
}

export function getBookingDetail(id: string): BookingDetail | null {
  const row = readBooking(id);
  if (!row) return null;
  const entries = (
    db()
      .prepare(
        "SELECT * FROM tour_finance_entries WHERE booking_id=? ORDER BY entry_date DESC, created_at DESC",
      )
      .all(id) as EntryRow[]
  ).map(entryOf);
  const actual = entries.filter((entry) => entry.actual && !entry.deletedAt);
  const receipts = actual
    .filter((entry) => entry.kind === "receipt")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const refunds = actual
    .filter((entry) => entry.kind === "refund")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = actual
    .filter((entry) => entry.kind === "expense")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const history = (
    db()
      .prepare(
        "SELECT id,action,created_at,actor,status,details FROM audit WHERE target=? ORDER BY id DESC LIMIT 30",
      )
      .all(`finance/booking/${id}`) as {
      id: number;
      action: string;
      created_at: string;
      actor: string | null;
      status: string;
      details: string | null;
    }[]
  ).map((item) => ({
    id: item.id,
    action: item.action,
    createdAt: item.created_at,
    actor: item.actor,
    status: item.status,
    details: (() => {
      try {
        return item.details ? JSON.parse(item.details) : null;
      } catch {
        return null;
      }
    })(),
  }));
  return {
    booking: bookingOf(row),
    entries,
    totals: {
      receipts,
      refunds,
      revenue: receipts - refunds,
      expenses,
      profit: receipts - refunds - expenses,
    },
    history,
  };
}

type Totals = {
  receipts: number;
  refunds: number;
  revenue: number;
  expenses: number;
  profit: number;
};

function totalsForPeriod(
  from: string,
  to: string,
  tour?: string,
  status?: string,
): Totals {
  const filters = [
    "e.deleted_at IS NULL",
    "e.actual=1",
    "e.entry_date>=?",
    "e.entry_date<?",
  ];
  const params: string[] = [from, to];
  if (tour) {
    filters.push("b.tour_slug=?");
    params.push(tour);
  }
  if (status) {
    filters.push("b.status=?");
    params.push(status);
  }
  const join =
    tour || status
      ? "JOIN tour_bookings b ON b.id=e.booking_id"
      : "LEFT JOIN tour_bookings b ON b.id=e.booking_id";
  const row = db()
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN e.kind='receipt' THEN e.amount ELSE 0 END),0) AS receipts,
        COALESCE(SUM(CASE WHEN e.kind='refund' THEN e.amount ELSE 0 END),0) AS refunds,
        COALESCE(SUM(CASE WHEN e.kind='expense' THEN e.amount ELSE 0 END),0) AS expenses
      FROM tour_finance_entries e ${join}
      WHERE ${filters.join(" AND ")}`,
    )
    .get(...params) as { receipts: number; refunds: number; expenses: number };
  const receipts = Number(row.receipts);
  const refunds = Number(row.refunds);
  const expenses = Number(row.expenses);
  return {
    receipts,
    refunds,
    revenue: receipts - refunds,
    expenses,
    profit: receipts - refunds - expenses,
  };
}

export function getFinanceSummary(from: string, to: string) {
  assertPeriod(from, to);
  const totals = totalsForPeriod(from, to);
  const contract = db()
    .prepare(
      "SELECT COALESCE(SUM(sale_amount),0) AS total FROM tour_bookings WHERE status!='cancelled' AND travel_date>=? AND travel_date<?",
    )
    .get(from, to) as { total: number };
  return {
    from,
    to,
    ...totals,
    contractValue: Number(contract.total),
  };
}

export function getFinanceReport(query: FinanceReportQuery) {
  assertPeriod(query.from, query.to);
  const { from, to, page, pageSize } = query;
  const totals = totalsForPeriod(from, to, query.tour, query.status);
  const contract = db()
    .prepare(
      `SELECT COALESCE(SUM(sale_amount),0) AS total
       FROM tour_bookings
       WHERE status!='cancelled' AND travel_date>=? AND travel_date<?
       ${query.tour ? "AND tour_slug=?" : ""}
       ${query.status ? "AND status=?" : ""}`,
    )
    .get(
      ...[
        from,
        to,
        ...(query.tour ? [query.tour] : []),
        ...(query.status ? [query.status] : []),
      ],
    ) as { total: number };

  const bookingWhere = [
    "b.travel_date>=?",
    "b.travel_date<?",
    ...(query.tour ? ["b.tour_slug=?"] : []),
    ...(query.status ? ["b.status=?"] : []),
  ];
  const bookingParams = [
    from,
    to,
    ...(query.tour ? [query.tour] : []),
    ...(query.status ? [query.status] : []),
  ];
  const countRow = db()
    .prepare(
      `SELECT COUNT(*) AS count FROM tour_bookings b WHERE ${bookingWhere.join(" AND ")}`,
    )
    .get(...bookingParams) as { count: number };
  const total = Number(countRow.count);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;
  const rows = db()
    .prepare(
      `SELECT b.*,
        (SELECT COALESCE(SUM(e.amount),0) FROM tour_finance_entries e
          WHERE e.booking_id=b.id AND e.deleted_at IS NULL AND e.actual=1
            AND e.kind='receipt' AND e.entry_date>=? AND e.entry_date<?) AS receipts,
        (SELECT COALESCE(SUM(e.amount),0) FROM tour_finance_entries e
          WHERE e.booking_id=b.id AND e.deleted_at IS NULL AND e.actual=1
            AND e.kind='refund' AND e.entry_date>=? AND e.entry_date<?) AS refunds,
        (SELECT COALESCE(SUM(e.amount),0) FROM tour_finance_entries e
          WHERE e.booking_id=b.id AND e.deleted_at IS NULL AND e.actual=1
            AND e.kind='expense' AND e.entry_date>=? AND e.entry_date<?) AS expenses
       FROM tour_bookings b
       WHERE ${bookingWhere.join(" AND ")}
       ORDER BY b.travel_date DESC, b.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(
      from,
      to,
      from,
      to,
      from,
      to,
      ...bookingParams,
      pageSize,
      offset,
    ) as (BookingRow & {
    receipts: number;
    refunds: number;
    expenses: number;
  })[];

  const dayCount =
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
    86_400_000;
  const trendUnit = dayCount <= 62 ? "day" : "month";
  const bucket = (expr: string) =>
    trendUnit === "day" ? expr : `substr(${expr},1,7)`;
  const trendFilters = [
    "e.deleted_at IS NULL",
    "e.actual=1",
    "e.entry_date>=?",
    "e.entry_date<?",
  ];
  const trendParams: string[] = [from, to];
  if (query.tour) {
    trendFilters.push("b.tour_slug=?");
    trendParams.push(query.tour);
  }
  if (query.status) {
    trendFilters.push("b.status=?");
    trendParams.push(query.status);
  }
  const trendJoin =
    query.tour || query.status
      ? "JOIN tour_bookings b ON b.id=e.booking_id"
      : "LEFT JOIN tour_bookings b ON b.id=e.booking_id";
  const trend = db()
    .prepare(
      `SELECT ${bucket("e.entry_date")} AS bucket,
        COALESCE(SUM(CASE WHEN e.kind='receipt' THEN e.amount ELSE 0 END),0) AS receipts,
        COALESCE(SUM(CASE WHEN e.kind='refund' THEN e.amount ELSE 0 END),0) AS refunds,
        COALESCE(SUM(CASE WHEN e.kind='expense' THEN e.amount ELSE 0 END),0) AS expenses
       FROM tour_finance_entries e ${trendJoin}
       WHERE ${trendFilters.join(" AND ")}
       GROUP BY bucket ORDER BY bucket`,
    )
    .all(...trendParams) as {
    bucket: string;
    receipts: number;
    refunds: number;
    expenses: number;
  }[];

  const tours = db()
    .prepare(
      "SELECT DISTINCT tour_slug AS slug, tour_title AS title FROM tour_bookings WHERE status!='cancelled' ORDER BY tour_title",
    )
    .all() as { slug: string; title: string }[];

  return {
    period: { from, to },
    totals,
    contractValue: Number(contract.total),
    bookingCount: total,
    bookings: rows.map((row) => {
      const receipts = Number(row.receipts);
      const refunds = Number(row.refunds);
      const expenses = Number(row.expenses);
      return {
        ...bookingOf(row),
        receipts,
        refunds,
        expenses,
        profit: receipts - refunds - expenses,
      };
    }),
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
    },
    trendUnit,
    trend: trend.map((item) => {
      const receipts = Number(item.receipts);
      const refunds = Number(item.refunds);
      const expenses = Number(item.expenses);
      return {
        bucket: item.bucket,
        receipts,
        refunds,
        expenses,
        profit: receipts - refunds - expenses,
      };
    }),
    tours,
  };
}

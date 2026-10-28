"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BookingStatus,
  ExpenseCategory,
  FinanceKind,
  PaymentMethod,
} from "@/domain/tour-finance";
import { AdminIcon } from "./admin-icons";
import { ConfirmModal, type ConfirmRequest } from "./notify";

type Option = { value: string; label: string };

type LeadOption = {
  id: string;
  name: string;
  tourSlug: string;
  travelDate: string;
  partySize: number | null;
  status: string;
};

type Booking = {
  id: string;
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

type BookingSummary = Booking & {
  receipts: number;
  refunds: number;
  expenses: number;
  profit: number;
};

type Entry = {
  id: string;
  bookingId: string | null;
  kind: FinanceKind;
  amount: number;
  entryDate: string;
  method: PaymentMethod;
  category: ExpenseCategory;
  description: string;
  actual: boolean;
  revision: number;
  deletedAt: string | null;
  deletedReason: string;
};

type TrendPoint = {
  bucket: string;
  receipts: number;
  refunds: number;
  expenses: number;
  profit: number;
};

type Report = {
  period: { from: string; to: string };
  totals: {
    receipts: number;
    refunds: number;
    revenue: number;
    expenses: number;
    profit: number;
  };
  contractValue: number;
  bookingCount: number;
  bookings: BookingSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  trendUnit: "day" | "month";
  trend: TrendPoint[];
  tours: { slug: string; title: string }[];
};

type BookingDetail = {
  booking: Booking;
  entries: Entry[];
  totals: Report["totals"];
  history: {
    id: number;
    action: string;
    createdAt: string;
    actor: string | null;
    status: string;
    details: unknown;
  }[];
};

const VND = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });
const STATUS_LABEL: Record<BookingStatus, string> = {
  confirmed: "Đã xác nhận",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};
const KIND_LABEL: Record<FinanceKind, string> = {
  receipt: "Thu tiền",
  refund: "Hoàn tiền",
  expense: "Chi phí",
};
const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  transport: "Di chuyển",
  hotel: "Khách sạn",
  meals: "Ăn uống",
  tickets: "Vé",
  guide: "Hướng dẫn",
  other: "Khác",
};
const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Tiền mặt",
  bank: "Chuyển khoản",
  card: "Thẻ",
  other: "Khác",
};
const ACTION_LABEL: Record<string, string> = {
  "finance-booking-create": "Tạo hồ sơ",
  "finance-booking-update": "Sửa hồ sơ",
  "finance-entry-create": "Thêm giao dịch",
  "finance-entry-update": "Sửa giao dịch",
  "finance-entry-void": "Hủy giao dịch",
};

class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(message: string, status: number, body: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function money(value: number) {
  return `${VND.format(value)} ₫`;
}

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function monthRange(offset = 0) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  const from = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  const to = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`;
  return { from, to };
}

function yearRange() {
  const year = new Date().getFullYear();
  return { from: `${year}-01-01`, to: `${year + 1}-01-01` };
}

function requestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function dayLabel(value: string, unit: "day" | "month") {
  if (unit === "month") return `${value.slice(5, 7)}/${value.slice(0, 4)}`;
  return `${value.slice(8, 10)}/${value.slice(5, 7)}`;
}

function dateLabel(value: string) {
  if (!value) return "Chưa chọn";
  return `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}`;
}

function dateTimeLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

async function fetchJson(
  url: string,
  csrf: string,
  init: RequestInit = {},
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      "x-csrf-token": csrf,
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok) {
    throw new ApiError(
      typeof body.error === "string" ? body.error : "Không tải được dữ liệu",
      response.status,
      body,
    );
  }
  return body;
}

const WEEKDAYS = [
  "Chủ nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

/** "2026-10-28" → "Thứ Tư, 28/10/2026" — đọc ngày nhanh, không lệch múi giờ. */
function weekdayLabel(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  const [, month, day] = value.split("-");
  return `${WEEKDAYS[date.getUTCDay()]}, ${day}/${month}/${value.slice(0, 4)}`;
}

/** "12000000" → "= 12.000.000 đ" để thấy ngay số tiền đang gõ. */
function amountHint(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "";
  const amount = Number(digits);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return `= ${VND.format(amount)} đ`;
}

const FINANCE_GUIDE_STEPS = [
  "Chọn kỳ ở thanh trên (Tháng này / Tháng trước / Năm nay, hoặc tự nhập Từ ngày – Đến ngày) rồi lọc theo tour và trạng thái.",
  "Bấm Tạo hồ sơ tour: chọn tour, ngày đi, số khách, giá bán thực tế. Có thể bắt đầu từ một yêu cầu tư vấn để điền sẵn.",
  "Trong hồ sơ, ghi từng khoản Thu tiền / Hoàn tiền / Chi phí kèm ngày thực tế và phương thức thanh toán.",
  "Khoản chi chưa phát sinh thì bỏ chọn “Đã thực chi”. Chi phí không thuộc tour nào (marketing, lương, văn phòng) ghi ở nút Chi phí chung.",
  "Ghi nhầm thì bấm Sửa để cập nhật, hoặc Hủy để vô hiệu giao dịch — lịch sử vẫn được giữ để đối soát.",
  "Đối chiếu 4 thẻ KPI với bảng hồ sơ: Doanh thu thực thu − Chi thực tế = Lợi nhuận dòng tiền.",
];

const FINANCE_GUIDE_RULES = [
  [
    "Giá bán ≠ tiền đã thu",
    "Giá bán là giá trị hợp đồng dự kiến; chỉ khoản Thu tiền mới vào doanh thu thực thu.",
  ],
  [
    "Dự kiến không vào dòng tiền",
    "Chi phí dự kiến vẫn được lưu để theo dõi nhưng không bị trừ khỏi lợi nhuận.",
  ],
  [
    "Dòng tiền, không phải lãi kế toán",
    "Số liệu tính theo ngày thực thu/chi, chưa gồm công nợ, khấu hao hay thuế.",
  ],
];

/**
 * Hướng dẫn ngay trên trang: giữ mặc định đóng để bảng số liệu không bị đẩy
 * xuống, nhưng luôn hiện một dòng mời mở. Bản đầy đủ vẫn nằm ở panel Hướng dẫn
 * của Studio (nút ? trên masthead).
 */
function FinanceGuide() {
  return (
    <details className="adm-fin-guide">
      <summary>
        <span className="adm-fin-guide-badge" aria-hidden="true">
          ?
        </span>
        <span className="adm-fin-guide-summary">
          <strong>Hướng dẫn sử dụng Tài chính tour</strong>
          <small>6 bước nhập liệu · 3 điều cần nhớ</small>
        </span>
        <span className="adm-fin-guide-open" aria-hidden="true">
          Xem hướng dẫn
        </span>
      </summary>
      <div className="adm-fin-guide-body">
        <ol>
          {FINANCE_GUIDE_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <div className="adm-fin-guide-rules">
          {FINANCE_GUIDE_RULES.map(([title, body]) => (
            <p key={title}>
              <strong>{title}</strong>
              <span>{body}</span>
            </p>
          ))}
        </div>
      </div>
    </details>
  );
}

function Kpi({
  icon,
  tone,
  label,
  value,
  foot,
}: {
  icon: "money" | "chart" | "target" | "briefcase";
  tone: "rose" | "teal" | "violet" | "amber";
  label: string;
  value: string;
  foot: string;
}) {
  return (
    <article className="adm-kpi" data-tone={tone}>
      <div className="adm-kpi-head">
        <span className="adm-kpi-icon" aria-hidden="true">
          <AdminIcon name={icon} size={16} />
        </span>
        <span className="adm-kpi-label">{label}</span>
      </div>
      <strong>{value}</strong>
      <small>{foot}</small>
    </article>
  );
}

function TrendChart({ report }: { report: Report }) {
  if (!report.trend.length)
    return (
      <p className="adm-empty">
        Chưa có giao dịch thực tế trong kỳ này.
      </p>
    );
  const max = Math.max(
    1,
    ...report.trend.map((point) =>
      Math.max(point.receipts, point.expenses, Math.abs(point.profit)),
    ),
  );
  return (
    <div className="adm-fin-trend">
      <div className="adm-fin-legend" aria-hidden="true">
        <span>
          <i data-kind="receipt" /> Thu
        </span>
        <span>
          <i data-kind="expense" /> Chi
        </span>
        <span>
          <i data-kind="profit" /> Lợi nhuận
        </span>
      </div>
      <div
        className="adm-fin-trend-rows"
        role="img"
        aria-label="Thu, chi và lợi nhuận theo kỳ"
      >
        {report.trend.map((point) => (
          <div className="adm-fin-trend-row" key={point.bucket}>
            <span>{dayLabel(point.bucket, report.trendUnit)}</span>
            <div className="adm-fin-bars">
              <i
                data-kind="receipt"
                style={{ width: `${(point.receipts / max) * 100}%` }}
                title={`Thu ${money(point.receipts)}`}
              />
              <i
                data-kind="expense"
                style={{ width: `${(point.expenses / max) * 100}%` }}
                title={`Chi ${money(point.expenses)}`}
              />
              <i
                data-kind="profit"
                data-negative={point.profit < 0 ? "true" : undefined}
                style={{ width: `${(Math.abs(point.profit) / max) * 100}%` }}
                title={`Lợi nhuận ${money(point.profit)}`}
              />
            </div>
            <strong data-negative={point.profit < 0 ? "true" : undefined}>
              {money(point.profit)}
            </strong>
          </div>
        ))}
      </div>
      <details className="adm-fin-table-details">
        <summary>Bảng số liệu tương đương</summary>
        <div className="adm-fin-table-scroll">
          <table className="adm-fin-table">
            <caption>Thu, chi và lợi nhuận theo kỳ</caption>
            <thead>
              <tr>
                <th scope="col">Kỳ</th>
                <th scope="col">Thu</th>
                <th scope="col">Chi</th>
                <th scope="col">Lợi nhuận</th>
              </tr>
            </thead>
            <tbody>
              {report.trend.map((point) => (
                <tr key={point.bucket}>
                  <th scope="row">
                    {dayLabel(point.bucket, report.trendUnit)}
                  </th>
                  <td>{money(point.receipts)}</td>
                  <td>{money(point.expenses)}</td>
                  <td data-negative={point.profit < 0 ? "true" : undefined}>
                    {money(point.profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export function TourFinance({
  csrf,
  initialLeadId,
}: {
  csrf: string;
  initialLeadId?: string;
}) {
  const [from, setFrom] = useState(() => monthRange().from);
  const [to, setTo] = useState(() => monthRange().to);
  const [tour, setTour] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [tours, setTours] = useState<Option[]>([]);
  const [createOpen, setCreateOpen] = useState(Boolean(initialLeadId));
  const [generalOpen, setGeneralOpen] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [general, setGeneral] = useState({
    amount: "",
    date: todayIso(),
    category: "other" as ExpenseCategory,
    description: "",
    actual: true,
  });
  const [createError, setCreateError] = useState("");
  const [duplicate, setDuplicate] = useState<null | {
    id: string;
    tourTitle: string;
    travelDate: string;
    saleAmount: number;
  }>(null);
  const [form, setForm] = useState({
    leadId: initialLeadId ?? "",
    tourSlug: "",
    travelDate: todayIso(),
    partySize: "2",
    saleAmount: "",
    status: "confirmed" as BookingStatus,
    note: "",
  });
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [edit, setEdit] = useState({
    status: "confirmed" as BookingStatus,
    travelDate: "",
    partySize: "2",
    saleAmount: "",
    note: "",
  });
  const [entry, setEntry] = useState({
    kind: "receipt" as FinanceKind,
    amount: "",
    date: todayIso(),
    method: "cash" as PaymentMethod,
    category: "other" as ExpenseCategory,
    description: "",
    actual: true,
  });
  const [entryError, setEntryError] = useState("");
  const [editingEntry, setEditingEntry] = useState<null | {
    id: string;
    revision: number;
  }>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest>(null);
  const confirmAction = useRef<null | (() => Promise<void>)>(null);
  const prefilledLead = useRef(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, page: String(page) });
      if (tour) params.set("tour", tour);
      if (status) params.set("status", status);
      const data = (await fetchJson(
        `/api/admin/finance?${params.toString()}`,
        csrf,
      )) as unknown as Report;
      setReport(data);
      setError("");
      if (data.pagination.page !== page) setPage(data.pagination.page);
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : "Không tải được báo cáo tài chính",
      );
    } finally {
      setLoading(false);
    }
  }, [csrf, from, page, status, to, tour]);

  useEffect(() => {
    // The loader owns its own error/loading state; this effect only starts it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetchJson("/api/admin/options", csrf),
      fetchJson("/api/admin/leads", csrf),
    ])
      .then(([options, leadRows]) => {
        if (!alive) return;
        setTours(
          Array.isArray(options.tours)
            ? (options.tours as Option[])
            : [],
        );
        const mappedLeads = (Array.isArray(leadRows) ? leadRows : []).map(
          (row) => {
            const value = row as {
              id: string;
              status?: string;
              data?: Record<string, unknown>;
            };
            const data = value.data ?? {};
            return {
              id: value.id,
              name: String(data.fullName ?? data.name ?? "Khách"),
              tourSlug: typeof data.tourSlug === "string" ? data.tourSlug : "",
              travelDate:
                typeof data.travelDate === "string" ? data.travelDate : "",
              partySize:
                typeof data.partySize === "number"
                  ? data.partySize
                  : Number(data.partySize) || null,
              status: String(value.status ?? "new"),
            };
          },
        );
        setLeads(mappedLeads);
        if (initialLeadId && !prefilledLead.current) {
          const lead = mappedLeads.find((item) => item.id === initialLeadId);
          if (lead) {
            prefilledLead.current = true;
            setCreateOpen(true);
            setForm((current) => ({
              ...current,
              leadId: lead.id,
              tourSlug: lead.tourSlug || current.tourSlug,
              travelDate: lead.travelDate || current.travelDate,
              partySize: lead.partySize
                ? String(lead.partySize)
                : current.partySize,
            }));
          }
        }
      })
      .catch(() => {
        // The report is still usable; pickers can be filled manually.
      });
    return () => {
      alive = false;
    };
  }, [csrf, initialLeadId]);

  const detailDirty = Boolean(
    detail &&
      (edit.status !== detail.booking.status ||
        edit.travelDate !== detail.booking.travelDate ||
        Number(edit.partySize) !== detail.booking.partySize ||
        Number(edit.saleAmount.replace(/[^\d]/g, "")) !==
          detail.booking.saleAmount ||
        edit.note !== detail.booking.note),
  );

  const requestCloseDetail = useCallback(() => {
    if (!detailOpen) return;
    if (detailDirty) {
      confirmAction.current = async () => {
        setDetailOpen(false);
        setEditingEntry(null);
      };
      setConfirm({
        title: "Bỏ thay đổi chưa lưu?",
        body: "Các thay đổi trong hồ sơ này chưa được lưu. Đóng bây giờ sẽ bỏ chúng.",
        confirmLabel: "Bỏ thay đổi",
        danger: true,
      });
      return;
    }
    setDetailOpen(false);
  }, [detailDirty, detailOpen]);

  useEffect(() => {
    if (!createOpen && !detailOpen && !generalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      if (detailOpen) requestCloseDetail();
      else if (generalOpen) setGeneralOpen(false);
      else setCreateOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, createOpen, detailOpen, generalOpen, requestCloseDetail]);

  function openCreate() {
    setCreateError("");
    setDuplicate(null);
    setForm({
      leadId: "",
      tourSlug: "",
      travelDate: todayIso(),
      partySize: "2",
      saleAmount: "",
      status: "confirmed",
      note: "",
    });
    setCreateOpen(true);
  }

  function pickLead(id: string) {
    const lead = leads.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      leadId: id,
      tourSlug: lead?.tourSlug || current.tourSlug,
      travelDate: lead?.travelDate || current.travelDate,
      partySize: lead?.partySize ? String(lead.partySize) : current.partySize,
    }));
  }

  async function submitBooking(confirmedDuplicate = false) {
    setBusy(true);
    setCreateError("");
    try {
      const amount = Number(form.saleAmount.replace(/[^\d]/g, ""));
      const body = {
        action: "create-booking",
        requestId: requestId(),
        leadId: form.leadId || null,
        tourSlug: form.tourSlug,
        tourTitle:
          tours.find((option) => option.value === form.tourSlug)?.label ?? "",
        travelDate: form.travelDate,
        partySize: Number(form.partySize),
        saleAmount: amount,
        status: form.status,
        note: form.note.trim(),
        ...(confirmedDuplicate ? { confirmDuplicate: true } : {}),
      };
      const result = await fetchJson("/api/admin/finance", csrf, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const booking = result.booking as Booking | undefined;
      setCreateOpen(false);
      setDuplicate(null);
      setNotice("Đã tạo hồ sơ tour.");
      await loadReport();
      if (booking?.id) await openDetail(booking.id);
    } catch (exception) {
      if (exception instanceof ApiError && exception.status === 409) {
        const value = exception.body.duplicate as
          | {
              id: string;
              tourTitle: string;
              travelDate: string;
              saleAmount: number;
            }
          | undefined;
        setDuplicate(value ?? null);
      }
      setCreateError(
        exception instanceof Error ? exception.message : "Không tạo được hồ sơ",
      );
    } finally {
      setBusy(false);
    }
  }

  async function openDetail(id: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    setEntryError("");
    setEditingEntry(null);
    try {
      const data = (await fetchJson(
        `/api/admin/finance?booking=${encodeURIComponent(id)}`,
        csrf,
      )) as unknown as BookingDetail;
      setDetail(data);
      setEdit({
        status: data.booking.status,
        travelDate: data.booking.travelDate,
        partySize: String(data.booking.partySize),
        saleAmount: String(data.booking.saleAmount),
        note: data.booking.note,
      });
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : "Không mở được hồ sơ",
      );
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveBooking() {
    if (!detail) return;
    setBusy(true);
    try {
      const amount = Number(edit.saleAmount.replace(/[^\d]/g, ""));
      const result = await fetchJson("/api/admin/finance", csrf, {
        method: "POST",
        body: JSON.stringify({
          action: "update-booking",
          id: detail.booking.id,
          revision: detail.booking.revision,
          leadId: detail.booking.leadId,
          tourSlug: detail.booking.tourSlug,
          tourTitle: detail.booking.tourTitle,
          travelDate: edit.travelDate,
          partySize: Number(edit.partySize),
          saleAmount: amount,
          status: edit.status,
          note: edit.note.trim(),
        }),
      });
      const booking = result.booking as Booking;
      setDetail((current) =>
        current ? { ...current, booking } : current,
      );
      setNotice("Đã lưu hồ sơ tour.");
      await loadReport();
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : "Không lưu được hồ sơ",
      );
    } finally {
      setBusy(false);
    }
  }

  async function addEntry() {
    if (!detail) return;
    setBusy(true);
    setEntryError("");
    try {
      const amount = Number(entry.amount.replace(/[^\d]/g, ""));
      const editing = editingEntry;
      await fetchJson("/api/admin/finance", csrf, {
        method: "POST",
        body: JSON.stringify({
          action: editing ? "update-entry" : "create-entry",
          ...(editing
            ? { id: editing.id, revision: editing.revision }
            : { requestId: requestId() }),
          bookingId: detail.booking.id,
          kind: entry.kind,
          amount,
          date: entry.date,
          method: entry.method,
          category: entry.kind === "expense" ? entry.category : "other",
          description: entry.description.trim(),
          actual: entry.kind === "expense" ? entry.actual : true,
        }),
      });
      setEditingEntry(null);
      setEntry((current) => ({
        ...current,
        amount: "",
        description: "",
      }));
      setNotice(editing ? "Đã cập nhật giao dịch." : "Đã thêm giao dịch.");
      await openDetail(detail.booking.id);
      await loadReport();
    } catch (exception) {
      setEntryError(
        exception instanceof Error
          ? exception.message
          : "Không lưu được giao dịch",
      );
    } finally {
      setBusy(false);
    }
  }

  async function addGeneralExpense() {
    setBusy(true);
    setGeneralError("");
    try {
      const amount = Number(general.amount.replace(/[^\d]/g, ""));
      await fetchJson("/api/admin/finance", csrf, {
        method: "POST",
        body: JSON.stringify({
          action: "create-entry",
          requestId: requestId(),
          bookingId: null,
          kind: "expense",
          amount,
          date: general.date,
          method: "cash",
          category: general.category,
          description: general.description.trim(),
          actual: general.actual,
        }),
      });
      setGeneralOpen(false);
      setGeneral((current) => ({
        ...current,
        amount: "",
        description: "",
      }));
      setNotice("Đã thêm chi phí chung.");
      await loadReport();
    } catch (exception) {
      setGeneralError(
        exception instanceof Error
          ? exception.message
          : "Không thêm được chi phí",
      );
    } finally {
      setBusy(false);
    }
  }

  function startEditEntry(item: Entry) {
    setEditingEntry({ id: item.id, revision: item.revision });
    setEntry({
      kind: item.kind,
      amount: String(item.amount),
      date: item.entryDate,
      method: item.method,
      category: item.category,
      description: item.description,
      actual: item.actual,
    });
    setEntryError("");
  }

  function askVoidEntry(item: Entry) {
    confirmAction.current = async () => {
      await fetchJson("/api/admin/finance", csrf, {
        method: "POST",
        body: JSON.stringify({
          action: "void-entry",
          id: item.id,
          reason: "Hủy từ Studio",
        }),
      });
      if (detail) await openDetail(detail.booking.id);
      await loadReport();
      setNotice("Đã hủy giao dịch; số liệu đã cập nhật.");
    };
    setConfirm({
      title: "Hủy giao dịch này?",
      body: `${KIND_LABEL[item.kind]} ${money(item.amount)} ngày ${dateLabel(
        item.entryDate,
      )} sẽ không còn được tính vào dòng tiền. Lịch sử vẫn được giữ.`,
      confirmLabel: "Hủy giao dịch",
      danger: true,
    });
  }

  async function runConfirm() {
    if (!confirmAction.current) return;
    setBusy(true);
    try {
      await confirmAction.current();
      setConfirm(null);
      confirmAction.current = null;
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : "Không thực hiện được",
      );
    } finally {
      setBusy(false);
    }
  }

  const totals = report?.totals;
  const currentPeriod = report?.period ?? { from, to };
  const monthNow = monthRange();
  const monthPrevious = monthRange(-1);
  const yearNow = yearRange();
  const activePreset = (range: { from: string; to: string }) =>
    range.from === from && range.to === to;

  return (
    <div className="adm-fin" aria-busy={loading}>
      <FinanceGuide />

      <div className="adm-fin-toolbar">
        <div className="adm-fin-toolbar-top">
          <div className="adm-fin-presets" role="group" aria-label="Kỳ báo cáo">
            <button
              type="button"
              aria-pressed={activePreset(monthNow)}
              data-active={activePreset(monthNow) ? "true" : undefined}
              onClick={() => {
                const range = monthRange();
                setFrom(range.from);
                setTo(range.to);
                setPage(1);
              }}
            >
              Tháng này
            </button>
            <button
              type="button"
              aria-pressed={activePreset(monthPrevious)}
              data-active={activePreset(monthPrevious) ? "true" : undefined}
              onClick={() => {
                const range = monthRange(-1);
                setFrom(range.from);
                setTo(range.to);
                setPage(1);
              }}
            >
              Tháng trước
            </button>
            <button
              type="button"
              aria-pressed={activePreset(yearNow)}
              data-active={activePreset(yearNow) ? "true" : undefined}
              onClick={() => {
                const range = yearRange();
                setFrom(range.from);
                setTo(range.to);
                setPage(1);
              }}
            >
              Năm nay
            </button>
          </div>
          <p className="adm-fin-range">
            <span>Kỳ đang xem</span>
            <strong>
              {dateLabel(from)} → trước {dateLabel(to)}
            </strong>
            <small>{report?.bookingCount ?? 0} hồ sơ trong kỳ</small>
          </p>
        </div>

        <div className="adm-fin-toolbar-filters">
          <label className="adm-fin-field">
            <span>Từ ngày</span>
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
            />
            <small className="adm-fin-field-hint" aria-hidden="true">
              {weekdayLabel(from)}
            </small>
          </label>
          <label className="adm-fin-field">
            <span>Đến trước ngày</span>
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
            />
            <small className="adm-fin-field-hint" aria-hidden="true">
              {weekdayLabel(to)}
            </small>
          </label>
          <label className="adm-fin-field">
            <span>Tour</span>
            <select
              value={tour}
              onChange={(event) => {
                setTour(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả tour</option>
              {(report?.tours ?? []).map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="adm-fin-field">
            <span>Trạng thái</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="completed">Hoàn tất</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </label>
        </div>

        <div className="adm-fin-toolbar-actions">
          <button
            type="button"
            className="adm-fin-secondary"
            onClick={() => {
              setGeneralError("");
              setGeneralOpen(true);
            }}
            disabled={busy}
          >
            <AdminIcon name="money" size={15} /> Chi phí chung
          </button>
          <button
            type="button"
            className="adm-fin-new"
            onClick={openCreate}
            disabled={busy}
          >
            <AdminIcon name="plus" size={15} /> Tạo hồ sơ tour
          </button>
        </div>
      </div>

      {error ? (
        <div className="adm-notice" role="alert">
          {error}
          <button type="button" aria-label="Đóng lỗi" onClick={() => setError("")}>
            ×
          </button>
        </div>
      ) : null}
      {notice ? (
        <div className="adm-notice adm-notice--ok" role="status">
          {notice}
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="adm-kpis adm-fin-kpis">
        <Kpi
          icon="money"
          tone="teal"
          label="Doanh thu thực thu"
          value={loading && !report ? "—" : money(totals?.revenue ?? 0)}
          foot={`Đã thu ${money(totals?.receipts ?? 0)} · hoàn ${money(
            totals?.refunds ?? 0,
          )}`}
        />
        <Kpi
          icon="chart"
          tone="amber"
          label="Chi thực tế"
          value={loading && !report ? "—" : money(totals?.expenses ?? 0)}
          foot="Chỉ cộng khoản đã thực chi"
        />
        <Kpi
          icon="target"
          tone="rose"
          label="Lợi nhuận dòng tiền"
          value={loading && !report ? "—" : money(totals?.profit ?? 0)}
          foot={totals && totals.profit < 0 ? "Đang lỗ trong kỳ" : "Thu trừ chi thực tế"}
        />
        <Kpi
          icon="briefcase"
          tone="violet"
          label="Giá trị hợp đồng"
          value={loading && !report ? "—" : money(report?.contractValue ?? 0)}
          foot={`${report?.bookingCount ?? 0} hồ sơ · ${dateLabel(
            currentPeriod.from,
          )} → trước ${dateLabel(currentPeriod.to)}`}
        />
      </div>

      <div className="adm-fin-grid">
        <section className="adm-panel adm-fin-chart-panel">
          <header className="adm-panel-head">
            <div>
              <p className="adm-panel-eyebrow">Dòng tiền</p>
              <h2>Thu, chi và lợi nhuận</h2>
              <p>
                Theo ngày thực thu/chi, giờ Việt Nam. Hoàn tiền làm giảm doanh
                thu; chi phí dự kiến không được cộng.
              </p>
            </div>
          </header>
          {report ? (
            <TrendChart report={report} />
          ) : (
            <p className="adm-empty">Đang tải…</p>
          )}
        </section>

        <section className="adm-panel adm-fin-bookings-panel">
          <header className="adm-panel-head">
            <div>
              <p className="adm-panel-eyebrow">Hồ sơ tour</p>
              <h2>Booking trong kỳ</h2>
              <p>
                Ngày đi nằm trong kỳ. Thu/chi bên dưới chỉ tính giao dịch thực tế
                trong cùng kỳ.
              </p>
            </div>
            <span className="adm-panel-pill">
              {report?.pagination.total ?? 0} hồ sơ
            </span>
          </header>
          <div className="adm-fin-table-scroll">
            <table className="adm-fin-table adm-fin-bookings-table">
              <caption className="adm-sr-only">
                Danh sách hồ sơ tour trong kỳ
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tour / ngày đi</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Hợp đồng</th>
                  <th scope="col">Thu</th>
                  <th scope="col">Chi</th>
                  <th scope="col">Lợi nhuận</th>
                  <th scope="col" aria-label="Thao tác" />
                </tr>
              </thead>
              <tbody>
                {(report?.bookings ?? []).map((booking) => (
                  <tr key={booking.id}>
                    <th scope="row">
                      <strong>{booking.tourTitle}</strong>
                      <small>
                        {dateLabel(booking.travelDate)} · {booking.partySize} khách
                      </small>
                    </th>
                    <td>
                      <span
                        className="adm-fin-status"
                        data-status={booking.status}
                      >
                        {STATUS_LABEL[booking.status]}
                      </span>
                    </td>
                    <td>{money(booking.saleAmount)}</td>
                    <td>{money(booking.receipts - booking.refunds)}</td>
                    <td>{money(booking.expenses)}</td>
                    <td data-negative={booking.profit < 0 ? "true" : undefined}>
                      {money(booking.profit)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adm-fin-open"
                        onClick={() => void openDetail(booking.id)}
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {report && report.bookings.length === 0 ? (
              <p className="adm-empty">
                Chưa có hồ sơ tour trong kỳ này. Bấm Tạo hồ sơ tour để bắt đầu.
              </p>
            ) : null}
          </div>
          {report && report.pagination.totalPages > 1 ? (
            <div className="adm-fin-pagination">
              <button
                type="button"
                disabled={report.pagination.page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                ← Trước
              </button>
              <span>
                Trang {report.pagination.page}/{report.pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={
                  report.pagination.page >= report.pagination.totalPages ||
                  loading
                }
                onClick={() =>
                  setPage((current) =>
                    Math.min(report.pagination.totalPages, current + 1),
                  )
                }
              >
                Sau →
              </button>
            </div>
          ) : null}
        </section>
      </div>

      {generalOpen ? (
        <div
          className="adm-modal-veil"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy)
              setGeneralOpen(false);
          }}
        >
          <div
            className="adm-modal adm-fin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-fin-general-title"
          >
            <div className="adm-fin-modal-head">
              <div>
                <p className="adm-panel-eyebrow">Chi phí vận hành</p>
                <h2 id="adm-fin-general-title">Chi phí chung</h2>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setGeneralOpen(false)}
                disabled={busy}
              >
                ×
              </button>
            </div>
            <p className="adm-fin-note">
              Khoản chi không thuộc tour cụ thể. Số này vào dòng tiền chung
              nhưng không được phân bổ vào lợi nhuận của một hồ sơ.
            </p>
            {generalError ? (
              <p className="adm-field-error" role="alert">
                {generalError}
              </p>
            ) : null}
            <div className="adm-fin-form-grid">
              <label className="adm-fin-field">
                <span>Số tiền (VND)</span>
                <input
                  inputMode="numeric"
                  value={general.amount}
                  onChange={(event) =>
                    setGeneral((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  placeholder="VD: 500000"
                  disabled={busy}
                />
                <small className="adm-fin-field-hint" aria-hidden="true">
                  {amountHint(general.amount)}
                </small>
              </label>
              <label className="adm-fin-field">
                <span>Ngày chi</span>
                <input
                  type="date"
                  value={general.date}
                  onChange={(event) =>
                    setGeneral((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  disabled={busy}
                />
                <small className="adm-fin-field-hint" aria-hidden="true">
                  {weekdayLabel(general.date)}
                </small>
              </label>
              <label className="adm-fin-field">
                <span>Nhóm chi</span>
                <select
                  value={general.category}
                  onChange={(event) =>
                    setGeneral((current) => ({
                      ...current,
                      category: event.target.value as ExpenseCategory,
                    }))
                  }
                  disabled={busy}
                >
                  {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="adm-fin-check">
                <input
                  type="checkbox"
                  checked={general.actual}
                  onChange={(event) =>
                    setGeneral((current) => ({
                      ...current,
                      actual: event.target.checked,
                    }))
                  }
                  disabled={busy}
                />
                Đã thực chi
              </label>
              <label className="adm-fin-field adm-fin-field--wide">
                <span>Diễn giải</span>
                <input
                  value={general.description}
                  onChange={(event) =>
                    setGeneral((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  maxLength={300}
                  placeholder="VD: Văn phòng phẩm tháng 10"
                  disabled={busy}
                />
              </label>
            </div>
            <div className="adm-modal-actions">
              <button
                type="button"
                onClick={() => setGeneralOpen(false)}
                disabled={busy}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="adm-primary"
                onClick={() => void addGeneralExpense()}
                disabled={busy || !general.amount}
              >
                {busy ? "Đang lưu…" : "Thêm chi phí"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <div
          className="adm-modal-veil"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy)
              setCreateOpen(false);
          }}
        >
          <div
            className="adm-modal adm-fin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-fin-create-title"
          >
            <div className="adm-fin-modal-head">
              <div>
                <p className="adm-panel-eyebrow">Hồ sơ mới</p>
                <h2 id="adm-fin-create-title">Tạo hồ sơ tour</h2>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setCreateOpen(false)}
                disabled={busy}
              >
                ×
              </button>
            </div>
            <p className="adm-fin-note">
              Giá bán là giá trị hợp đồng dự kiến, không phải tiền đã thu. Dùng
              mục Thu tiền trong hồ sơ để ghi khoản thực thu.
            </p>
            {createError ? (
              <p className="adm-field-error" role="alert">
                {createError}
              </p>
            ) : null}
            {duplicate ? (
              <div className="adm-fin-duplicate" role="alert">
                <strong>Có thể trùng hồ sơ</strong>
                <p>
                  Đã có hồ sơ {duplicate.tourTitle} ngày{" "}
                  {dateLabel(duplicate.travelDate)}. Nếu đây là một booking khác
                  thật sự, bấm xác nhận bên dưới.
                </p>
                <button
                  type="button"
                  className="adm-primary"
                  disabled={busy}
                  onClick={() => void submitBooking(true)}
                >
                  Vẫn tạo hồ sơ
                </button>
              </div>
            ) : null}
            <div className="adm-fin-form-grid">
              <p className="adm-fin-form-title">Hồ sơ tour</p>
              <label className="adm-fin-field">
                <span>Tour *</span>
                <select
                  value={form.tourSlug}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      tourSlug: event.target.value,
                    }))
                  }
                  disabled={busy}
                  required
                >
                  <option value="">Chọn tour</option>
                  {tours.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="adm-fin-field">
                <span>Ngày đi *</span>
                <input
                  type="date"
                  value={form.travelDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      travelDate: event.target.value,
                    }))
                  }
                  disabled={busy}
                  required
                />
                <small className="adm-fin-field-hint" aria-hidden="true">
                  {weekdayLabel(form.travelDate)}
                </small>
              </label>
              <label className="adm-fin-field">
                <span>Số khách *</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.partySize}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      partySize: event.target.value,
                    }))
                  }
                  disabled={busy}
                  required
                />
              </label>
              <label className="adm-fin-field">
                <span>Trạng thái</span>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as BookingStatus,
                    }))
                  }
                  disabled={busy}
                >
                  <option value="confirmed">Đã xác nhận</option>
                  <option value="completed">Hoàn tất</option>
                  <option value="cancelled">Đã hủy</option>
                </select>
              </label>

              <p className="adm-fin-form-title">Nguồn khách & thanh toán</p>
              <label className="adm-fin-field">
                <span>Yêu cầu tư vấn (tuỳ chọn)</span>
                <select
                  value={form.leadId}
                  onChange={(event) => pickLead(event.target.value)}
                  disabled={busy}
                >
                  <option value="">Không gắn yêu cầu</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} · {dateLabel(lead.travelDate)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="adm-fin-field">
                <span>Giá bán thực tế (VND)</span>
                <input
                  inputMode="numeric"
                  value={form.saleAmount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      saleAmount: event.target.value,
                    }))
                  }
                  placeholder="VD: 12000000"
                  disabled={busy}
                />
                <small className="adm-fin-field-hint" aria-hidden="true">
                  {amountHint(form.saleAmount)}
                </small>
              </label>
              <label className="adm-fin-field adm-fin-field--wide">
                <span>Ghi chú nội bộ</span>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  disabled={busy}
                  maxLength={1000}
                />
              </label>
            </div>
            <div className="adm-modal-actions">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={busy}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="adm-primary"
                onClick={() => void submitBooking(false)}
                disabled={
                  busy ||
                  !form.tourSlug ||
                  !form.travelDate ||
                  Number(form.partySize) < 1
                }
              >
                {busy ? "Đang lưu…" : "Tạo hồ sơ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailOpen ? (
        <div
          className="adm-modal-veil"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy)
              requestCloseDetail();
          }}
        >
          <div
            className="adm-modal adm-fin-modal adm-fin-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adm-fin-detail-title"
          >
            <div className="adm-fin-modal-head">
              <div>
                <p className="adm-panel-eyebrow">Chi tiết hồ sơ</p>
                <h2 id="adm-fin-detail-title">
                  {detail?.booking.tourTitle ?? "Đang tải…"}
                </h2>
                {detailDirty ? (
                  <span className="adm-fin-dirty">Có thay đổi chưa lưu</span>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={requestCloseDetail}
                disabled={busy}
              >
                ×
              </button>
            </div>
            {detailLoading || !detail ? (
              <p className="adm-empty">Đang tải hồ sơ…</p>
            ) : (
              <>
                <div className="adm-fin-detail-kpis">
                  <span>
                    Hợp đồng
                    <strong>{money(detail.booking.saleAmount)}</strong>
                  </span>
                  <span>
                    Thu ròng
                    <strong>{money(detail.totals.revenue)}</strong>
                  </span>
                  <span>
                    Chi thực tế
                    <strong>{money(detail.totals.expenses)}</strong>
                  </span>
                  <span data-negative={detail.totals.profit < 0 ? "true" : undefined}>
                    Lợi nhuận
                    <strong>{money(detail.totals.profit)}</strong>
                  </span>
                </div>

                <div className="adm-fin-form-grid">
                  <p className="adm-fin-form-title">Thông tin hồ sơ</p>
                  <label className="adm-fin-field">
                    <span>Trạng thái</span>
                    <select
                      value={edit.status}
                      onChange={(event) =>
                        setEdit((current) => ({
                          ...current,
                          status: event.target.value as BookingStatus,
                        }))
                      }
                      disabled={busy}
                    >
                      <option value="confirmed">Đã xác nhận</option>
                      <option value="completed">Hoàn tất</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </label>
                  <label className="adm-fin-field">
                    <span>Ngày đi</span>
                    <input
                      type="date"
                      value={edit.travelDate}
                      onChange={(event) =>
                        setEdit((current) => ({
                          ...current,
                          travelDate: event.target.value,
                        }))
                      }
                      disabled={busy}
                    />
                    <small className="adm-fin-field-hint" aria-hidden="true">
                      {weekdayLabel(edit.travelDate)}
                    </small>
                  </label>
                  <label className="adm-fin-field">
                    <span>Số khách</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={edit.partySize}
                      onChange={(event) =>
                        setEdit((current) => ({
                          ...current,
                          partySize: event.target.value,
                        }))
                      }
                      disabled={busy}
                    />
                  </label>
                  <label className="adm-fin-field">
                    <span>Giá bán (VND)</span>
                    <input
                      inputMode="numeric"
                      value={edit.saleAmount}
                      onChange={(event) =>
                        setEdit((current) => ({
                          ...current,
                          saleAmount: event.target.value,
                        }))
                      }
                      disabled={busy}
                    />
                    <small className="adm-fin-field-hint" aria-hidden="true">
                      {amountHint(edit.saleAmount)}
                    </small>
                  </label>
                  <label className="adm-fin-field adm-fin-field--wide">
                    <span>Ghi chú nội bộ</span>
                    <textarea
                      rows={2}
                      value={edit.note}
                      onChange={(event) =>
                        setEdit((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      disabled={busy}
                      maxLength={1000}
                    />
                  </label>
                </div>
                <div className="adm-fin-inline-actions">
                  <button
                    type="button"
                    className="adm-primary"
                    onClick={() => void saveBooking()}
                    disabled={busy}
                  >
                    {busy ? "Đang lưu…" : "Lưu hồ sơ"}
                  </button>
                  {detail.booking.leadId ? (
                    <a
                      href={`/admin/leads?edit=${encodeURIComponent(
                        detail.booking.leadId,
                      )}`}
                    >
                      Mở yêu cầu gốc
                    </a>
                  ) : null}
                </div>

                <section className="adm-fin-entry-block">
                  <header>
                    <div>
                      <p className="adm-panel-eyebrow">Giao dịch</p>
                      <h3>Thu, hoàn tiền và chi phí</h3>
                    </div>
                    <span className="adm-panel-pill">
                      {detail.entries.length} dòng
                    </span>
                  </header>
                  {entryError ? (
                    <p className="adm-field-error" role="alert">
                      {entryError}
                    </p>
                  ) : null}
                  <div className="adm-fin-form-grid adm-fin-entry-form">
                    <label className="adm-fin-field">
                      <span>Loại</span>
                      <select
                        value={entry.kind}
                        onChange={(event) =>
                          setEntry((current) => ({
                            ...current,
                            kind: event.target.value as FinanceKind,
                            actual:
                              event.target.value === "expense"
                                ? current.actual
                                : true,
                          }))
                        }
                        disabled={busy}
                      >
                        <option value="receipt">Thu tiền</option>
                        <option value="refund">Hoàn tiền</option>
                        <option value="expense">Chi phí</option>
                      </select>
                    </label>
                    <label className="adm-fin-field">
                      <span>Số tiền (VND)</span>
                      <input
                        inputMode="numeric"
                        value={entry.amount}
                        onChange={(event) =>
                          setEntry((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                        placeholder="VD: 5000000"
                        disabled={busy}
                      />
                      <small className="adm-fin-field-hint" aria-hidden="true">
                        {amountHint(entry.amount)}
                      </small>
                    </label>
                    <label className="adm-fin-field">
                      <span>Ngày</span>
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(event) =>
                          setEntry((current) => ({
                            ...current,
                            date: event.target.value,
                          }))
                        }
                        disabled={busy}
                      />
                      <small className="adm-fin-field-hint" aria-hidden="true">
                        {weekdayLabel(entry.date)}
                      </small>
                    </label>
                    <label className="adm-fin-field">
                      <span>Phương thức</span>
                      <select
                        value={entry.method}
                        onChange={(event) =>
                          setEntry((current) => ({
                            ...current,
                            method: event.target.value as PaymentMethod,
                          }))
                        }
                        disabled={busy}
                      >
                        {Object.entries(METHOD_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    {entry.kind === "expense" ? (
                      <>
                        <label className="adm-fin-field">
                          <span>Nhóm chi</span>
                          <select
                            value={entry.category}
                            onChange={(event) =>
                              setEntry((current) => ({
                                ...current,
                                category: event.target.value as ExpenseCategory,
                              }))
                            }
                            disabled={busy}
                          >
                            {Object.entries(CATEGORY_LABEL).map(
                              ([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ),
                            )}
                          </select>
                        </label>
                        <label className="adm-fin-check">
                          <input
                            type="checkbox"
                            checked={entry.actual}
                            onChange={(event) =>
                              setEntry((current) => ({
                                ...current,
                                actual: event.target.checked,
                              }))
                            }
                            disabled={busy}
                          />
                          Đã thực chi (bỏ trống nếu chỉ dự kiến)
                        </label>
                      </>
                    ) : null}
                    <label className="adm-fin-field adm-fin-field--wide">
                      <span>Diễn giải</span>
                      <input
                        value={entry.description}
                        onChange={(event) =>
                          setEntry((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        maxLength={300}
                        placeholder="VD: Cọc 30%"
                        disabled={busy}
                      />
                    </label>
                  </div>
                  <div className="adm-fin-inline-actions">
                    <button
                      type="button"
                      className="adm-primary"
                      onClick={() => void addEntry()}
                      disabled={busy || !entry.amount}
                    >
                      {busy
                        ? "Đang lưu…"
                        : editingEntry
                          ? "Cập nhật giao dịch"
                          : "Thêm giao dịch"}
                    </button>
                    {editingEntry ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEntry(null);
                          setEntry((current) => ({
                            ...current,
                            amount: "",
                            description: "",
                          }));
                        }}
                        disabled={busy}
                      >
                        Hủy sửa
                      </button>
                    ) : null}
                  </div>

                  <div className="adm-fin-table-scroll">
                    <table className="adm-fin-table">
                      <thead>
                        <tr>
                          <th scope="col">Ngày</th>
                          <th scope="col">Loại</th>
                          <th scope="col">Số tiền</th>
                          <th scope="col">Nội dung</th>
                          <th scope="col">Trạng thái</th>
                          <th scope="col" aria-label="Thao tác" />
                        </tr>
                      </thead>
                      <tbody>
                        {detail.entries.map((item) => (
                          <tr
                            key={item.id}
                            data-voided={item.deletedAt ? "true" : undefined}
                          >
                            <td>{dateLabel(item.entryDate)}</td>
                            <td>{KIND_LABEL[item.kind]}</td>
                            <td>{money(item.amount)}</td>
                            <td>
                              {item.description || "—"}
                              {item.kind === "expense" ? (
                                <small>
                                  {CATEGORY_LABEL[item.category]}
                                  {item.actual ? " · thực chi" : " · dự kiến"}
                                </small>
                              ) : (
                                <small>{METHOD_LABEL[item.method]}</small>
                              )}
                            </td>
                            <td>
                              {item.deletedAt ? "Đã hủy" : "Đang tính"}
                            </td>
                            <td>
                              {!item.deletedAt ? (
                                <div className="adm-fin-row-actions">
                                  <button
                                    type="button"
                                    className="adm-fin-open"
                                    onClick={() => startEditEntry(item)}
                                    disabled={busy}
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    className="adm-fin-void"
                                    onClick={() => askVoidEntry(item)}
                                    disabled={busy}
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {detail.entries.length === 0 ? (
                      <p className="adm-empty">
                        Chưa có giao dịch. Thêm khoản thu đầu tiên khi khách đã
                        thanh toán.
                      </p>
                    ) : null}
                  </div>
                </section>

                <section className="adm-fin-history">
                  <h3>Lịch sử chỉnh sửa</h3>
                  {detail.history.length ? (
                    <ol>
                      {detail.history.map((item) => (
                        <li key={item.id}>
                          <span>
                            {ACTION_LABEL[item.action] ?? item.action}
                          </span>
                          <time>{dateTimeLabel(item.createdAt)}</time>
                          <small>
                            {item.actor ?? "Studio"} · {item.status}
                          </small>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="adm-empty">Chưa có lịch sử.</p>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      ) : null}

      <ConfirmModal
        request={confirm}
        busy={busy}
        onCancel={() => {
          if (busy) return;
          setConfirm(null);
          confirmAction.current = null;
        }}
        onConfirm={() => void runConfirm()}
      />
    </div>
  );
}

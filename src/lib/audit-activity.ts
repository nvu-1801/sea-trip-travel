import { searchKey } from "./search";

/**
 * Read-only presentation of the CMS audit trail.
 *
 * The rules here only state what the log proves. They never assign intent and
 * never treat missing entries as healthy. `Asia/Ho_Chi_Minh` is the same timezone
 * used by the rest of the admin copy and the sales email.
 */

export const ACTIVITY_TIME_ZONE = "Asia/Ho_Chi_Minh";
export const ACTIVITY_SCAN_LIMIT = 1000;
export const ACTIVITY_PAGE_LIMIT = 150;
export const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;

export type AuditStatus = "success" | "failure";

export type RawActivity = {
  id: number;
  action: string;
  target: string;
  at: string;
  actor: string | null;
  ip: string | null;
  status: AuditStatus;
  details: Record<string, unknown> | null;
};

export type AuditFlag = {
  code: "failure" | "delete" | "access-change" | "repeated-login-failure";
  label: string;
  reason: string;
};

export type ActivityDetailItem = {
  label: string;
  before?: string;
  after?: string;
};

export type ActivityRow = RawActivity & {
  actionLabel: string;
  targetLabel: string;
  actorLabel: string;
  statusLabel: string;
  ipLabel: string;
  flags: AuditFlag[];
  flagged: boolean;
  detailItems: ActivityDetailItem[];
};

export type ActivitySummary = {
  total: number;
  admins: number;
  success: number;
  failure: number;
  flagged: number;
  incomplete: number;
  truncated: boolean;
};

export type ActivityDecision = {
  status: "normal" | "review" | "insufficient";
  title: string;
  explanation: string;
  notes: string[];
};

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  save: "Lưu bản nháp",
  publish: "Xuất bản nội dung",
  unpublish: "Ẩn nội dung khỏi website",
  delete: "Chuyển nội dung vào thùng rác",
  restore: "Khôi phục nội dung",
  login: "Đăng nhập",
  logout: "Đăng xuất",
  "login-failed": "Đăng nhập thất bại",
  "login-blocked": "Tạm chặn đăng nhập",
  bootstrap: "Khởi tạo tài khoản quản trị",
  "password-change": "Đổi mật khẩu quản trị",
  upload: "Tải ảnh lên",
  "media-update": "Sửa mô tả ảnh",
  "media-delete": "Xóa ảnh",
  "lead-update": "Cập nhật yêu cầu tư vấn",
  "lead-mail-retry": "Gửi lại email tư vấn",
  "lead-delete": "Xóa yêu cầu tư vấn",
  "content-save-failed": "Lưu nội dung thất bại",
  "role-change": "Thay đổi quyền người dùng",
  "permission-change": "Thay đổi quyền truy cập",
};

export const AUDIT_COLLECTION_LABELS: Record<string, string> = {
  tours: "Tour du lịch",
  articles: "Cẩm nang",
  categories: "Danh mục",
  destinations: "Điểm đến",
  hero: "Trang chủ",
  landing: "Trang chủ",
  settings: "Website & footer",
  messages: "Nội dung VI / EN",
  theme: "Giao diện",
};

export const AUDIT_FIELD_LABELS: Record<string, string> = {
  title: "Tiêu đề",
  name: "Tên",
  summary: "Tóm tắt",
  slug: "Đường dẫn",
  path: "Đường dẫn",
  tourCode: "Mã tour",
  badge: "Nhãn nổi bật",
  tags: "Thẻ",
  duration: "Thời lượng",
  itinerary: "Lịch trình",
  pricingOptions: "Bảng giá",
  priceFrom: "Giá từ",
  images: "Hình ảnh",
  categoryIds: "Danh mục",
  destinationIds: "Điểm đến",
  contentStatus: "Trạng thái nội dung",
  publishedAt: "Ngày đăng",
  author: "Tác giả",
  excerpt: "Giới thiệu",
  body: "Nội dung",
  showOnHome: "Hiển thị trên trang chủ",
  homeOrder: "Thứ tự trên trang chủ",
  contact: "Thông tin liên hệ",
  hotline: "Hotline",
  email: "Email",
  address: "Địa chỉ",
  workingHours: "Giờ làm việc",
  footerLinks: "Liên kết chân trang",
  socialLinks: "Mạng xã hội",
  theme: "Giao diện",
  motion: "Chuyển động nền",
};

const LOGIN_FAILURE_ACTIONS = new Set(["login-failed", "login-blocked"]);
const DELETE_ACTION = /(^|-)delete$|^delete$|purge/i;
const ACCESS_ACTION = /(password|role|permission|session)/i;

const numberFormat = new Intl.NumberFormat("vi-VN");

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Mới",
  contacted: "Đã liên hệ",
  qualified: "Tiềm năng",
  won: "Đã chốt",
  lost: "Chưa phù hợp",
  deleted: "Đã xóa",
};

function leadStatusLabel(value: string | null | undefined): string {
  if (!value) return "Không đủ dữ liệu";
  return LEAD_STATUS_LABELS[value] ?? "Không đủ dữ liệu";
}

/** Safely read the JSON blob stored in `audit.details`. */
export function parseAuditDetails(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return recordValue(JSON.parse(value));
  } catch {
    return null;
  }
}

export function activityActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? "Hoạt động khác";
}

export function activityStateLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Chưa có";
  if (value === "published") return "Đang xuất bản";
  if (value === "draft") return "Bản nháp";
  if (value === "deleted") return "Thùng rác";
  return "Không đủ dữ liệu";
}

export function activityTargetLabel(raw: Pick<RawActivity, "action" | "target" | "details">): string {
  const details = raw.details ?? {};
  const action = raw.action;

  if (
    action === "login" ||
    action === "logout" ||
    action === "login-failed" ||
    action === "login-blocked" ||
    action === "bootstrap" ||
    action === "password-change"
  ) {
    return "Tài khoản quản trị";
  }

  if (action === "upload" || action === "media-update" || action === "media-delete") {
    const name = stringValue(details.name);
    return name ? `Ảnh · ${name}` : "Thư viện ảnh";
  }

  if (action === "lead-update" || action === "lead-mail-retry" || action === "lead-delete") {
    const leadId = stringValue(details.leadId);
    return leadId ? `Yêu cầu tư vấn · ${leadId}` : "Yêu cầu tư vấn";
  }

  const [collection] = raw.target.split("/");
  const scope = AUDIT_COLLECTION_LABELS[collection] ?? "Nội dung";
  const record = recordValue(details.record);
  const title =
    stringValue(record?.title) ||
    stringValue(details.title) ||
    stringValue(details.name);
  return title ? `${scope} · ${title}` : scope;
}

function valueLabel(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return "Không có";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (typeof value === "number") return numberFormat.format(value);
  if (typeof value === "string") {
    return value.length > 160 ? `${value.slice(0, 159).trimEnd()}…` : value;
  }
  return undefined;
}

/** Human-readable rows for the detail panel. Never renders raw JSON. */
export function activityDetailItems(raw: Pick<RawActivity, "action" | "details">): ActivityDetailItem[] {
  const details = raw.details ?? {};
  const items: ActivityDetailItem[] = [];
  const record = recordValue(details.record);

  if (record) {
    const title = stringValue(record.title);
    if (title) items.push({ label: "Mục bị tác động", after: title });
    if (record.stateBefore !== undefined || record.stateAfter !== undefined) {
      items.push({
        label: "Trạng thái nội dung",
        before: activityStateLabel(record.stateBefore),
        after: activityStateLabel(record.stateAfter),
      });
    }
  }

  if (Array.isArray(details.changes)) {
    for (const change of details.changes) {
      const row = recordValue(change);
      if (!row) continue;
      const label = stringValue(row.label) ?? "Thông tin";
      const before = valueLabel(row.before);
      const after = valueLabel(row.after);
      if (before === undefined && after === undefined) continue;
      items.push({ label, before, after });
    }
  }

  if (Array.isArray(details.changedFields)) {
    const fields = details.changedFields
      .map((field) => stringValue(field))
      .filter((field): field is string => Boolean(field));
    if (fields.length > 0) {
      items.push({ label: "Các mục đã thay đổi", after: fields.join(", ") });
    }
  }

  const name = stringValue(details.name);
  if (name && (raw.action === "upload" || raw.action === "media-delete")) {
    items.push({ label: "Tên ảnh", after: name });
  }
  const alt = stringValue(details.alt);
  if (alt) items.push({ label: "Mô tả ảnh", after: alt });
  const width = typeof details.width === "number" ? details.width : null;
  const height = typeof details.height === "number" ? details.height : null;
  if (width && height) {
    items.push({ label: "Kích thước ảnh", after: `${width} × ${height} px` });
  }

  const before = recordValue(details.before);
  const after = recordValue(details.after);
  const beforeLeadStatus = stringValue(before?.status);
  const afterLeadStatus =
    stringValue(after?.status) ??
    (raw.action === "lead-delete" ? "deleted" : null);
  if (beforeLeadStatus || afterLeadStatus) {
    items.push({
      label: "Trạng thái yêu cầu",
      before: leadStatusLabel(beforeLeadStatus),
      after: leadStatusLabel(afterLeadStatus),
    });
  }
  if (before?.alt !== undefined || after?.alt !== undefined) {
    items.push({
      label: "Mô tả ảnh",
      before: stringValue(before?.alt) ?? "Không có",
      after: stringValue(after?.alt) ?? "Không có",
    });
  }

  const usernameTried = stringValue(details.usernameTried);
  if (usernameTried) {
    items.push({ label: "Tên đăng nhập đã thử", after: usernameTried });
  }
  const reason = stringValue(details.reason);
  if (reason) items.push({ label: "Ghi nhận của hệ thống", after: reason });

  const mailStatus = stringValue(details.mailStatus);
  if (mailStatus) {
    const labels: Record<string, string> = {
      sent: "Đã gửi",
      failed: "Chưa gửi được",
      pending: "Đang chờ gửi",
      sending: "Đang gửi",
    };
    items.push({ label: "Kết quả gửi email", after: labels[mailStatus] ?? "Không đủ dữ liệu" });
  }

  // The same fact can arrive from two producers (e.g. upload name + record).
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.label}|${item.before ?? ""}|${item.after ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function baseFlags(raw: Pick<RawActivity, "action" | "status">): AuditFlag[] {
  const flags: AuditFlag[] = [];
  if (raw.status === "failure") {
    flags.push({
      code: "failure",
      label: "Thao tác thất bại",
      reason: "Hệ thống ghi nhận thao tác này không thành công.",
    });
  }
  if (DELETE_ACTION.test(raw.action)) {
    flags.push({
      code: "delete",
      label: "Xóa dữ liệu",
      reason:
        raw.action === "delete"
          ? "Nội dung được chuyển vào thùng rác và có thể khôi phục."
          : "Dữ liệu bị xóa khỏi hệ thống.",
    });
  }
  if (ACCESS_ACTION.test(raw.action) || raw.action === "bootstrap") {
    flags.push({
      code: "access-change",
      label: "Thay đổi quyền hoặc mật khẩu",
      reason:
        raw.action === "password-change"
          ? "Có thay đổi mật khẩu quản trị."
          : raw.action === "bootstrap"
            ? "Tài khoản quản trị được khởi tạo."
            : "Có thay đổi liên quan đến quyền truy cập.",
    });
  }
  return flags;
}

/** Add flags that need the whole time window (repeated failed logins). */
export function annotateActivity(rows: RawActivity[]): ActivityRow[] {
  const annotated: ActivityRow[] = rows.map((row) => {
    const flags = baseFlags(row);
    return {
      ...row,
      actionLabel: activityActionLabel(row.action),
      targetLabel: activityTargetLabel(row),
      actorLabel: row.actor ?? "Không đủ dữ liệu",
      statusLabel: row.status === "failure" ? "Thất bại" : "Thành công",
      ipLabel: row.ip ?? "Không được ghi nhận",
      flags,
      flagged: flags.length > 0,
      detailItems: activityDetailItems(row),
    };
  });

  const failuresByIp = new Map<string, { row: ActivityRow; time: number }[]>();
  for (const row of annotated) {
    if (!LOGIN_FAILURE_ACTIONS.has(row.action) || !row.ip) continue;
    const time = Date.parse(row.at);
    if (Number.isNaN(time)) continue;
    const list = failuresByIp.get(row.ip) ?? [];
    list.push({ row, time });
    failuresByIp.set(row.ip, list);
  }

  for (const list of failuresByIp.values()) {
    list.sort((a, b) => a.time - b.time);
    for (const entry of list) {
      const count = list.filter(
        (other) =>
          other.time <= entry.time &&
          other.time >= entry.time - LOGIN_FAILURE_WINDOW_MS,
      ).length;
      if (count < 3) continue;
      if (entry.row.flags.some((flag) => flag.code === "repeated-login-failure")) continue;
      entry.row.flags.push({
        code: "repeated-login-failure",
        label: "Đăng nhập thất bại lặp lại",
        reason: `Có ${count} lần đăng nhập thất bại từ cùng địa chỉ IP trong 15 phút.`,
      });
      entry.row.flagged = true;
    }
  }

  return annotated;
}

function isIncomplete(row: RawActivity): boolean {
  if (LOGIN_FAILURE_ACTIONS.has(row.action)) return !row.ip;
  return !row.actor || !row.ip;
}

export function summarizeActivity(rows: RawActivity[], truncated = false): ActivitySummary {
  const actors = new Set<string>();
  let success = 0;
  let failure = 0;
  let incomplete = 0;
  for (const row of rows) {
    if (row.actor) actors.add(row.actor);
    if (row.status === "failure") failure += 1;
    else success += 1;
    if (isIncomplete(row)) incomplete += 1;
  }
  return {
    total: rows.length,
    admins: actors.size,
    success,
    failure,
    flagged: 0,
    incomplete,
    truncated,
  };
}

export function countFlagged(rows: ActivityRow[]): number {
  return rows.filter((row) => row.flagged).length;
}

export function evaluateActivity(summary: ActivitySummary): ActivityDecision {
  const notes: string[] = [];
  if (summary.truncated) {
    notes.push(
      `Chỉ đọc ${summary.total} bản ghi gần nhất trong khoảng thời gian này; có thể còn bản ghi cũ hơn.`,
    );
  }
  if (summary.incomplete > 0) {
    notes.push(
      `${summary.incomplete} bản ghi thiếu thông tin người thực hiện hoặc địa chỉ IP.`,
    );
  }

  if (summary.total === 0) {
    return {
      status: "insufficient",
      title: "Chưa đủ dữ liệu để đánh giá",
      explanation:
        "Chưa có bản ghi hoạt động trong khoảng thời gian này. Việc thiếu log không được coi là hệ thống bình thường.",
      notes,
    };
  }
  if (summary.flagged > 0) {
    return {
      status: "review",
      title: "Có hoạt động cần xem lại",
      explanation: `${summary.flagged} hoạt động khớp quy tắc đánh dấu trong khoảng thời gian này.`,
      notes,
    };
  }
  if (summary.incomplete > 0) {
    return {
      status: "insufficient",
      title: "Chưa đủ dữ liệu để đánh giá",
      explanation:
        "Chưa phát hiện hoạt động khớp quy tắc, nhưng một số bản ghi cũ thiếu thông tin nên chưa thể kết luận toàn bộ.",
      notes,
    };
  }
  return {
    status: "normal",
    title: "Hoạt động bình thường",
    explanation:
      "Không phát hiện hoạt động khớp quy tắc cần xem lại trong khoảng thời gian này.",
    notes,
  };
}

export type ActivityFilters = {
  admin?: string;
  action?: string;
  status?: "all" | "success" | "failure";
  q?: string;
};

function haystack(row: ActivityRow): string {
  const detailText = row.detailItems
    .map((item) => `${item.label} ${item.before ?? ""} ${item.after ?? ""}`)
    .join(" ");
  return searchKey(
    `${row.actorLabel} ${row.actionLabel} ${row.targetLabel} ${detailText}`,
  );
}

export function filterActivityRows(
  rows: ActivityRow[],
  filters: ActivityFilters,
): ActivityRow[] {
  const admin = filters.admin ?? "all";
  const action = filters.action ?? "all";
  const status = filters.status ?? "all";
  const needle = searchKey((filters.q ?? "").trim());

  return rows.filter((row) => {
    if (admin === "__unknown__") {
      if (row.actor) return false;
    } else if (admin !== "all" && row.actor !== admin) {
      return false;
    }
    if (action === "__other__") {
      if (AUDIT_ACTION_LABELS[row.action]) return false;
    } else if (action !== "all" && row.action !== action) {
      return false;
    }
    if (status !== "all" && row.status !== status) return false;
    if (needle && !haystack(row).includes(needle)) return false;
    return true;
  });
}

export type ActivityOption = { value: string; label: string };

export function activityActionOptions(rows: RawActivity[]): ActivityOption[] {
  const known = new Map<string, string>();
  let hasOther = false;
  for (const row of rows) {
    const label = AUDIT_ACTION_LABELS[row.action];
    if (label) known.set(row.action, label);
    else hasOther = true;
  }
  const options = [...known.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));
  if (hasOther) options.push({ value: "__other__", label: "Hoạt động khác" });
  return options;
}

export function activityAdminOptions(rows: RawActivity[]): ActivityOption[] {
  const actors = new Set<string>();
  let hasUnknown = false;
  for (const row of rows) {
    if (row.actor) actors.add(row.actor);
    else hasUnknown = true;
  }
  const options = [...actors]
    .sort((a, b) => a.localeCompare(b, "vi"))
    .map((actor) => ({ value: actor, label: actor }));
  if (hasUnknown) options.push({ value: "__unknown__", label: "Không đủ dữ liệu" });
  return options;
}

/** `"2026-10-22T00:00:00Z"` → `"22/10/2026 lúc 07:00"`. */
export function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Không đủ dữ liệu";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("vi-VN", {
      timeZone: ACTIVITY_TIME_ZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} lúc ${parts.hour}:${parts.minute}`;
}

export function formatActivityRange(fromIso: string, toIso: string): string {
  return `${formatActivityTime(fromIso)} – ${formatActivityTime(toIso)}`;
}

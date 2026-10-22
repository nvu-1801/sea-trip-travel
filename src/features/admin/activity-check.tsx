"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AdminIcon } from "./admin-icons";
import {
  ACTIVITY_TIME_ZONE,
  formatActivityTime,
  type ActivityDecision,
  type ActivityOption,
  type ActivityRow,
  type ActivitySummary,
} from "@/lib/audit-activity";

type ActivityPayload = {
  generatedAt: string;
  range: { from: string; to: string; days: number };
  summary: ActivitySummary;
  decision: ActivityDecision;
  rows: ActivityRow[];
  matchingCount: number;
  pageLimit: number;
  missing: string[];
  options: { actions: ActivityOption[]; admins: ActivityOption[] };
};

const numberFormat = new Intl.NumberFormat("vi-VN");

function vietnamDate(offsetDays = 0): string {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ACTIVITY_TIME_ZONE,
  }).format(date);
}

const STATUS_OPTIONS: ActivityOption[] = [
  { value: "all", label: "Tất cả kết quả" },
  { value: "success", label: "Thành công" },
  { value: "failure", label: "Thất bại" },
];

function withCurrentOption(
  options: ActivityOption[],
  value: string,
  label: string,
): ActivityOption[] {
  if (value === "all" || options.some((option) => option.value === value)) {
    return options;
  }
  return [...options, { value, label }];
}

function statusIcon(
  status: "normal" | "review" | "insufficient" | "error" | "loading",
) {
  if (status === "normal") return "shield" as const;
  if (status === "loading") return "refresh" as const;
  if (status === "insufficient") return "help" as const;
  return "alert" as const;
}

function StatusCard({
  status,
  title,
  explanation,
  notes,
}: {
  status: "normal" | "review" | "insufficient" | "error" | "loading";
  title: string;
  explanation: string;
  notes?: string[];
}) {
  return (
    <section
      className={`adm-activity-status is-${status}`}
      aria-live="polite"
      aria-busy={status === "loading"}
    >
      <span className="adm-activity-status-icon" aria-hidden="true">
        <AdminIcon name={statusIcon(status)} size={22} />
      </span>
      <div>
        <p className="adm-activity-eyebrow">Trạng thái hoạt động</p>
        <h2>{title}</h2>
        <p>{explanation}</p>
        {notes && notes.length > 0 && (
          <ul className="adm-activity-notes">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | null;
  hint: string;
  tone?: "success" | "failure" | "flag";
}) {
  return (
    <div className="adm-kpi adm-activity-kpi" data-tone={tone}>
      <span>{label}</span>
      <strong>{value === null ? "—" : numberFormat.format(value)}</strong>
      <small>{hint}</small>
    </div>
  );
}

function ActivityDetail({ row }: { row: ActivityRow }) {
  return (
    <div
      className="adm-activity-detail"
      role="region"
      aria-label={`Chi tiết: ${row.actionLabel}`}
    >
      <div className="adm-activity-detail-head">
        <div>
          <p className="adm-activity-eyebrow">Chi tiết hoạt động</p>
          <h3>{row.actionLabel}</h3>
        </div>
        <span className={`adm-activity-result is-${row.status}`}>
          <AdminIcon
            name={row.status === "success" ? "shield" : "alert"}
            size={14}
          />
          {row.statusLabel}
        </span>
      </div>

      <dl className="adm-activity-facts">
        <div>
          <dt>Người thực hiện</dt>
          <dd>{row.actorLabel}</dd>
        </div>
        <div>
          <dt>Đối tượng bị tác động</dt>
          <dd>{row.targetLabel}</dd>
        </div>
        <div>
          <dt>Thời gian</dt>
          <dd>{formatActivityTime(row.at)} (giờ Việt Nam)</dd>
        </div>
        <div>
          <dt>Địa chỉ IP</dt>
          <dd>{row.ipLabel}</dd>
        </div>
      </dl>

      <section className="adm-activity-detail-section">
        <h4>Vì sao được đánh dấu?</h4>
        {row.flags.length > 0 ? (
          <ul className="adm-activity-flag-list">
            {row.flags.map((flag) => (
              <li key={flag.code}>
                <strong>
                  <AdminIcon name="alert" size={14} />
                  {flag.label}
                </strong>
                <span>{flag.reason}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>
            Hoạt động này không khớp quy tắc đánh dấu nào. Điều này không thay
            thế việc kiểm tra nghiệp vụ.
          </p>
        )}
      </section>

      <section className="adm-activity-detail-section">
        <h4>Thông tin trước / sau</h4>
        {row.detailItems.length > 0 ? (
          <div className="adm-activity-diff">
            {row.detailItems.map((item, index) => (
              <div
                className="adm-activity-diff-row"
                key={`${item.label}-${index}`}
              >
                <span className="adm-activity-diff-label">{item.label}</span>
                {item.before !== undefined || item.after !== undefined ? (
                  <>
                    <span>
                      <small>Trước</small>
                      {item.before ?? "—"}
                    </span>
                    <span>
                      <small>Sau</small>
                      {item.after ?? "—"}
                    </span>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p>Không có thông tin trước/sau được ghi nhận cho hoạt động này.</p>
        )}
      </section>
    </div>
  );
}

export function ActivityCheck() {
  const [period, setPeriod] = useState("7");
  const [fromDate, setFromDate] = useState(() => vietnamDate(-7));
  const [toDate, setToDate] = useState(() => vietnamDate(0));
  const [admin, setAdmin] = useState("all");
  const [action, setAction] = useState("all");
  const [result, setResult] = useState("all");
  const [q, setQ] = useState("");
  const [data, setData] = useState<ActivityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const requestId = useRef(0);

  const customInvalid =
    period === "custom" && (!fromDate || !toDate || fromDate > toDate);

  useEffect(() => {
    if (customInvalid) return;
    const controller = new AbortController();
    const serial = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          days: period === "custom" ? "7" : period,
          admin,
          action,
          status: result,
        });
        if (q.trim()) params.set("q", q.trim());
        if (period === "custom" || period === "1") {
          params.set("from", period === "1" ? vietnamDate(0) : fromDate);
          params.set("to", period === "1" ? vietnamDate(0) : toDate);
        }
        const response = await fetch(`/api/admin/activity?${params.toString()}`, {
          cache: "no-store",
          headers: { accept: "application/json" },
          signal: controller.signal,
        });
        if (response.status === 401) {
          window.location.replace("/admin/login?expired=1");
          return;
        }
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            body && typeof body.error === "string"
              ? body.error
              : "Không tải được dữ liệu hoạt động.",
          );
        }
        if (serial !== requestId.current) return;
        setData(body as ActivityPayload);
      } catch (caught) {
        if (controller.signal.aborted || serial !== requestId.current) return;
        setError(
          caught instanceof Error && caught.message
            ? caught.message
            : "Không tải được dữ liệu hoạt động.",
        );
      } finally {
        if (!controller.signal.aborted && serial === requestId.current) {
          setLoading(false);
        }
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [period, fromDate, toDate, admin, action, result, q, reload, customInvalid]);

  const validationError = customInvalid
    ? "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."
    : "";
  const visibleError = validationError || error;
  const displayLoading = loading && !customInvalid;
  const selectedRowId =
    selectedId !== null && data?.rows.some((row) => row.id === selectedId)
      ? selectedId
      : null;

  const summary = data?.summary ?? null;
  const decision = data?.decision ?? null;
  const adminOptions = withCurrentOption(
    data?.options.admins ?? [{ value: "all", label: "Tất cả admin" }],
    admin,
    admin === "__unknown__" ? "Không đủ dữ liệu" : admin,
  );
  const actionOptions = withCurrentOption(
    data?.options.actions ?? [{ value: "all", label: "Tất cả thao tác" }],
    action,
    "Hoạt động khác",
  );
  const filtersActive =
    admin !== "all" ||
    action !== "all" ||
    result !== "all" ||
    q.trim() !== "" ||
    period === "custom";

  const periodLabel = useMemo(() => {
    if (period === "custom") {
      if (!fromDate || !toDate) return "Khoảng ngày đã chọn";
      return `${fromDate.split("-").reverse().join("/")} – ${toDate
        .split("-")
        .reverse()
        .join("/")}`;
    }
    if (period === "1") return "Hôm nay";
    return `${period} ngày gần nhất`;
  }, [period, fromDate, toDate]);

  function resetFilters() {
    setPeriod("7");
    setFromDate(vietnamDate(-7));
    setToDate(vietnamDate(0));
    setAdmin("all");
    setAction("all");
    setResult("all");
    setQ("");
  }

  return (
    <div className="adm-activity" aria-busy={displayLoading}>
      {!data && displayLoading ? (
        <StatusCard
          status="loading"
          title="Đang tải hoạt động…"
          explanation="Hệ thống đang đọc audit log và đối chiếu các quy tắc cần xem lại."
        />
      ) : decision ? (
        <StatusCard
          status={decision.status}
          title={decision.title}
          explanation={decision.explanation}
          notes={decision.notes}
        />
      ) : null}

      {data && (
        <section className="adm-activity-kpis" aria-label="Chỉ số hoạt động">
          <Kpi
            label="Số thao tác"
            value={summary?.total ?? null}
            hint={periodLabel}
          />
          <Kpi
            label="Admin hoạt động"
            value={summary?.admins ?? null}
            hint={
              summary && summary.incomplete > 0
                ? `${numberFormat.format(summary.incomplete)} bản ghi thiếu thông tin`
                : "Người thực hiện khác nhau"
            }
          />
          <Kpi
            label="Thành công"
            value={summary?.success ?? null}
            hint="Thao tác hoàn tất"
            tone="success"
          />
          <Kpi
            label="Thất bại"
            value={summary?.failure ?? null}
            hint="Thao tác không hoàn tất"
            tone="failure"
          />
          <Kpi
            label="Cần xem lại"
            value={summary?.flagged ?? null}
            hint="Khớp quy tắc đánh dấu"
            tone="flag"
          />
        </section>
      )}

      <section
        className="adm-panel adm-activity-filters"
        aria-label="Bộ lọc hoạt động"
      >
        <div className="adm-activity-filter-grid">
          <label>
            <span>Khoảng thời gian</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="1">Hôm nay</option>
              <option value="7">7 ngày gần nhất</option>
              <option value="14">14 ngày gần nhất</option>
              <option value="30">30 ngày gần nhất</option>
              <option value="custom">Chọn ngày</option>
            </select>
          </label>

          {period === "custom" && (
            <>
              <label>
                <span>Từ ngày</span>
                <input
                  type="date"
                  value={fromDate}
                  max={toDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </label>
              <label>
                <span>Đến ngày</span>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </label>
            </>
          )}

          <label>
            <span>Admin</span>
            <select
              value={admin}
              onChange={(event) => setAdmin(event.target.value)}
            >
              {adminOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Loại thao tác</span>
            <select
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              {actionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Kết quả</span>
            <select
              value={result}
              onChange={(event) => setResult(event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="adm-activity-search">
            <span>Tìm kiếm</span>
            <span className="adm-activity-search-box">
              <AdminIcon name="search" size={16} />
              <input
                type="search"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Tên admin hoặc đối tượng…"
                aria-label="Tìm theo tên admin hoặc đối tượng bị tác động"
              />
            </span>
          </label>
        </div>

        <div className="adm-activity-filter-foot">
          <p>
            {data
              ? `Cập nhật lúc ${formatActivityTime(data.generatedAt)} (giờ Việt Nam)`
              : "Đang đọc dữ liệu…"}
            {displayLoading && data ? " · Đang cập nhật…" : ""}
          </p>
          <div>
            {filtersActive && (
              <button type="button" onClick={resetFilters}>
                Xóa bộ lọc
              </button>
            )}
            <button
              type="button"
              onClick={() => setReload((value) => value + 1)}
              disabled={displayLoading}
            >
              <AdminIcon name="refresh" size={15} /> Làm mới
            </button>
          </div>
        </div>
      </section>

      {data && visibleError && (
        <div className="adm-notice" role="alert">
          {visibleError}
          {!customInvalid && (
            <button
              type="button"
              aria-label="Thử tải lại"
              onClick={() => setReload((value) => value + 1)}
            >
              Thử lại
            </button>
          )}
        </div>
      )}

      {!data && displayLoading && (
        <section className="adm-panel adm-activity-loading" role="status">
          <span className="adm-activity-spinner" aria-hidden="true" />
          Đang tải danh sách hoạt động…
        </section>
      )}

      {!data && visibleError && !displayLoading && (
        <section className="adm-panel adm-activity-empty">
          <AdminIcon name={customInvalid ? "calendar" : "alert"} size={26} />
          <h3>
            {customInvalid
              ? "Khoảng ngày chưa hợp lệ"
              : "Chưa đủ dữ liệu để đánh giá"}
          </h3>
          <p>
            {customInvalid
              ? validationError
              : `Không tải được dữ liệu hoạt động${error ? `: ${error}` : ""}. Dữ liệu audit chưa được đọc thành công, nên chưa thể kết luận hệ thống bình thường.`}
          </p>
          {!customInvalid && (
            <button
              type="button"
              className="adm-primary"
              onClick={() => setReload((value) => value + 1)}
            >
              Thử lại
            </button>
          )}
        </section>
      )}

      {data && data.summary.total === 0 && (
        <section className="adm-panel adm-activity-empty">
          <AdminIcon name="help" size={26} />
          <h3>Chưa đủ dữ liệu để đánh giá</h3>
          <p>
            Không có bản ghi hoạt động nào trong khoảng thời gian đã chọn. Việc
            thiếu log không được coi là dấu hiệu hệ thống bình thường.
          </p>
          {data.missing.length > 0 && (
            <ul className="adm-activity-notes">
              {data.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {data &&
        data.summary.total > 0 &&
        data.matchingCount === 0 &&
        !visibleError && (
          <section className="adm-panel adm-activity-empty">
            <AdminIcon name="search" size={26} />
            <h3>Không có hoạt động phù hợp</h3>
            <p>
              Bộ lọc hiện tại không khớp bản ghi nào trong khoảng thời gian này.
            </p>
            <button type="button" onClick={resetFilters}>
              Xóa bộ lọc
            </button>
          </section>
        )}

      {data && data.matchingCount > 0 && (
        <section className="adm-activity-results" aria-label="Danh sách hoạt động">
          <div className="adm-activity-results-head">
            <h2>Hoạt động gần đây</h2>
            <p>
              Hiển thị {numberFormat.format(data.rows.length)} /{" "}
              {numberFormat.format(data.matchingCount)} hoạt động phù hợp.
            </p>
          </div>
          <ul className="adm-activity-list">
            {data.rows.map((row) => {
              const open = selectedRowId === row.id;
              return (
                <li
                  key={row.id}
                  className={`adm-activity-item${row.flagged ? " is-flagged" : ""}`}
                >
                  <button
                    type="button"
                    className="adm-activity-row"
                    aria-expanded={open}
                    onClick={() => setSelectedId(open ? null : row.id)}
                  >
                    <span
                      className={`adm-activity-dot is-${row.status}${
                        row.flagged ? " is-flagged" : ""
                      }`}
                      aria-hidden="true"
                    >
                      <AdminIcon
                        name={
                          row.flagged
                            ? "alert"
                            : row.status === "success"
                              ? "shield"
                              : "alert"
                        }
                        size={17}
                      />
                    </span>
                    <span className="adm-activity-row-main">
                      <span className="adm-activity-row-top">
                        <strong>{row.actorLabel}</strong>
                        <span>{row.actionLabel}</span>
                      </span>
                      <span className="adm-activity-target">
                        {row.targetLabel}
                      </span>
                      <span className="adm-activity-meta">
                        <span>{formatActivityTime(row.at)}</span>
                        <span className={`adm-activity-result is-${row.status}`}>
                          {row.statusLabel}
                        </span>
                        {row.ip ? <span>IP {row.ip}</span> : null}
                        {row.flagged ? (
                          <span className="adm-activity-flag">
                            <AdminIcon name="alert" size={12} />
                            Cần xem lại
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="adm-activity-chevron" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  {open && <ActivityDetail row={row} />}
                </li>
              );
            })}
          </ul>
          {data.rows.length < data.matchingCount && (
            <p className="adm-activity-limit-note">
              Chỉ hiển thị {numberFormat.format(data.pageLimit)} hoạt động gần
              nhất. Thu hẹp khoảng thời gian hoặc bộ lọc để xem các bản ghi
              khác.
            </p>
          )}
        </section>
      )}

      <p className="adm-activity-limit-note">
        Trang chỉ đọc audit log. Thao tác chạy trực tiếp trên máy chủ và khung
        giờ làm việc của admin chưa được cấu hình nên không được đánh giá ở
        đây.
      </p>
    </div>
  );
}

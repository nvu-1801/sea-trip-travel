"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  budgetStatus,
  formatBytes,
  formatMetricValue,
  HEALTH_SEO_AREA_LABELS,
  percentUsed,
  PROJECT_MEMORY_LIMIT_BYTES,
  PROJECT_STORAGE_LIMIT_BYTES,
  seoStatus,
  statusLabel,
  STORAGE_WARN_PERCENT,
  UNUSED_MEDIA_WARN_BYTES,
  type HealthPayload,
  type HealthSeoArea,
  type HealthSeoIssue,
  type HealthStatus,
  type HealthStorage,
} from "@/lib/health";

const numberFormat = new Intl.NumberFormat("vi-VN");

function duration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  if (seconds < 60) return "dưới 1 phút";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} ngày ${hours} giờ`;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  return `${minutes} phút`;
}

function shortWhen(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function msLabel(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value)) return "—";
  if (value < 1000) return `${value} ms`;
  if (value < 60_000) return `${Math.round(value / 100) / 10} giây`;
  return `${Math.floor(value / 60_000)} phút ${Math.round((value % 60_000) / 1000)} giây`;
}

function StatusPill({ status }: { status: HealthStatus }) {
  return (
    <span className="adm-health-pill" data-status={status}>
      <i aria-hidden="true" />
      {statusLabel(status)}
    </span>
  );
}

function storageStatus(storage: HealthStorage): HealthStatus {
  if (!storage.available) return "unknown";
  // The project budget is the 5 GB ceiling, not the (much larger) host disk.
  return budgetStatus(percentUsed(storage.dataBytes, PROJECT_STORAGE_LIMIT_BYTES));
}

function speedStatus(data: HealthPayload): HealthStatus {
  // One or two page views are not a verdict; wait for a real p75 sample.
  if (data.speed.samples < 20) return "unknown";
  const known = data.speed.metrics.filter(
    (metric) => metric.status !== "unknown",
  );
  if (known.length === 0) return "unknown";
  if (known.some((metric) => metric.status === "bad")) return "bad";
  if (known.some((metric) => metric.status === "warn")) return "warn";
  return "good";
}

function overallStatus(data: HealthPayload): HealthStatus {
  const values = [
    storageStatus(data.storage),
    speedStatus(data),
    data.seo.status,
    data.backup.status,
  ];
  if (values.includes("bad")) return "bad";
  if (values.includes("warn")) return "warn";
  if (values.every((value) => value === "unknown")) return "unknown";
  return "good";
}

function ScoreRing({
  score,
  status,
}: {
  score: number;
  status: HealthStatus;
}) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return (
    <svg
      viewBox="0 0 110 110"
      className="adm-health-ring"
      role="img"
      aria-label={`Điểm SEO ${score} trên 100`}
    >
      <circle
        cx="55"
        cy="55"
        r={radius}
        fill="none"
        stroke="#f6e4ec"
        strokeWidth="11"
      />
      <circle
        cx="55"
        cy="55"
        r={radius}
        fill="none"
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        strokeDashoffset={circumference * 0.25}
        data-status={status}
        className="adm-health-ring-value"
      />
      <text x="55" y="57" textAnchor="middle" className="adm-health-ring-no">
        {score}
      </text>
      <text x="55" y="72" textAnchor="middle" className="adm-health-ring-sub">
        / 100
      </text>
    </svg>
  );
}

function SpeedTile({
  label,
  value,
  status,
  unit,
  samples,
}: {
  label: string;
  value: string;
  status: HealthStatus;
  unit: "ms" | "score";
  samples: number;
}) {
  return (
    <div className="adm-health-vital" data-status={status}>
      <span className="adm-health-vital-label">{label}</span>
      <strong>{value}</strong>
      <small>
        {unit === "score" ? "điểm" : "p75"} ·{" "}
        {samples > 0 ? `${numberFormat.format(samples)} mẫu` : "chưa có mẫu"}
      </small>
    </div>
  );
}

const SEVERITY_LABEL = {
  high: "Ưu tiên cao",
  medium: "Trung bình",
  low: "Thấp",
} as const;

type DetailIssue = Omit<HealthSeoIssue, "area"> & {
  area?: HealthSeoArea;
  areaLabel?: string;
};

type DetailState =
  | {
      view: "overview";
      issues: HealthSeoIssue[];
      score: number;
      pages: number;
      translation: { reviewed: number; total: number };
    }
  | { view: "issue"; issue: DetailIssue; back: boolean };

/**
 * Drill-down drawer for a health finding: the summary row only shows a count,
 * so this lists every affected page and deep-links straight into the editor
 * that fixes it.
 */
function HealthDetailModal({
  state,
  onClose,
  onSelect,
  onBack,
}: {
  state: DetailState;
  onClose: () => void;
  onSelect: (issue: HealthSeoIssue) => void;
  onBack: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [onClose]);

  const issue = state.view === "issue" ? state.issue : null;
  const headingId = "adm-health-detail-title";

  return (
    <div
      className="adm-modal-veil"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="adm-health-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
      >
        <header className="adm-health-modal-head">
          <div>
            <p className="adm-health-eyebrow">
              {issue
                ? (issue.areaLabel ??
                  (issue.area ? HEALTH_SEO_AREA_LABELS[issue.area] : "Chi tiết"))
                : "Chi tiết lỗi SEO"}
            </p>
            <h2 id={headingId}>
              {state.view === "issue"
                ? state.issue.title
                : `${state.issues.length} nhóm lỗi cần xử lý`}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="adm-health-modal-close"
            aria-label="Đóng chi tiết"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="adm-health-modal-body">
          {state.view === "issue" ? (
            <>
              <p className="adm-health-modal-detail">{state.issue.detail}</p>
              <div className="adm-health-modal-meta">
                <span
                  className="adm-health-modal-severity"
                  data-severity={state.issue.severity}
                >
                  {SEVERITY_LABEL[state.issue.severity]}
                </span>
                <span>
                  {state.issue.count} mục
                  {state.issue.items.length > 0
                    ? ` · hiển thị ${state.issue.items.length}`
                    : ""}
                </span>
              </div>
              {state.issue.items.length > 0 ? (
                <ul className="adm-health-modal-list">
                  {state.issue.items.map((item, index) => (
                    <li key={`${item.label}-${index}`}>
                      <div>
                        <strong>{item.label}</strong>
                        {item.detail ? <small>{item.detail}</small> : null}
                      </div>
                      {item.href ? (
                        item.external ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            className="adm-health-fix"
                          >
                            Mở
                          </a>
                        ) : (
                          <Link
                            href={item.href}
                            className="adm-health-fix"
                            onClick={onClose}
                          >
                            Sửa
                          </Link>
                        )
                      ) : null}
                    </li>
                  ))}
                  {state.issue.hidden > 0 ? (
                    <li className="adm-health-modal-more">
                      +{state.issue.hidden} mục khác chưa liệt kê — xử lý các mục
                      trên rồi làm mới để xem tiếp.
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="adm-health-modal-empty">
                  Lỗi nằm ở cấu hình hệ thống, không gắn với một trang cụ thể.
                </p>
              )}
            </>
          ) : (
            <>
              <div className="adm-health-modal-score">
                <ScoreRing
                  score={state.score}
                  status={seoStatus(state.score)}
                />
                <div>
                  <strong>{state.issues.length} nhóm lỗi</strong>
                  <p>
                    {state.pages} trang đã kiểm tra · bản dịch EN{" "}
                    {state.translation.reviewed}/{state.translation.total} đã
                    duyệt. Chọn một nhóm để xem từng trang và mở đúng chỗ sửa.
                  </p>
                </div>
              </div>
              {state.issues.length > 0 ? (
                <ul className="adm-health-modal-groups">
                  {state.issues.map((entry) => (
                    <li key={entry.id}>
                      <button type="button" onClick={() => onSelect(entry)}>
                        <span
                          className="adm-health-severity"
                          data-severity={entry.severity}
                          aria-hidden="true"
                        />
                        <span className="adm-health-modal-group-copy">
                          <strong>{entry.title}</strong>
                          <small>
                            {HEALTH_SEO_AREA_LABELS[entry.area]} · {entry.detail}
                          </small>
                        </span>
                        <span className="adm-health-count">{entry.count}</span>
                        <span className="adm-health-modal-chevron" aria-hidden="true">
                          →
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="adm-health-modal-empty">
                  Không phát hiện lỗi trong lần kiểm tra này.
                </p>
              )}
            </>
          )}
        </div>

        <footer className="adm-health-modal-actions">
          {issue && state.view === "issue" && state.back ? (
            <button
              type="button"
              className="adm-health-modal-back"
              onClick={onBack}
            >
              ← Tất cả nhóm lỗi
            </button>
          ) : (
            <span />
          )}
          {issue?.href ? (
            <Link href={issue.href} className="adm-primary" onClick={onClose}>
              Sửa ngay
            </Link>
          ) : null}
          <button type="button" onClick={onClose}>
            Đóng
          </button>
        </footer>
      </div>
    </div>
  );
}

export function HealthCheck({ csrf }: { csrf: string }) {
  const [days, setDays] = useState(7);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/health?days=${days}&r=${refresh}`, {
      headers: { "x-csrf-token": csrf },
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Không tải được dữ liệu sức khỏe.");
        return response.json();
      })
      .then((payload: HealthPayload) => {
        if (!alive) return;
        setData(payload);
        setError("");
      })
      .catch((exception) => {
        if (alive) setError(String(exception?.message ?? exception));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [csrf, days, refresh]);

  const storage = data?.storage;
  const seo = data?.seo;
  const speed = data?.speed;
  const storagePercent = storage
    ? percentUsed(storage.dataBytes, PROJECT_STORAGE_LIMIT_BYTES)
    : 0;
  const memoryPercent = data
    ? percentUsed(data.server.rssBytes, PROJECT_MEMORY_LIMIT_BYTES)
    : 0;

  const [detail, setDetail] = useState<DetailState | null>(null);
  const closeDetail = useCallback(() => setDetail(null), []);
  const openOverview = useCallback(() => {
    if (!data) return;
    setDetail({
      view: "overview",
      issues: data.seo.issues,
      score: data.seo.score,
      pages: data.seo.pages,
      translation: data.seo.translation,
    });
  }, [data]);
  const openIssue = useCallback(
    (issue: DetailIssue, back = false) => {
      setDetail({ view: "issue", issue, back });
    },
    [],
  );
  const openTranslation = useCallback(() => {
    const translation = data?.seo.issues.find(
      (issue) => issue.area === "translation",
    );
    if (translation) openIssue(translation);
    else openOverview();
  }, [data, openIssue, openOverview]);

  const usedSegments = useMemo(() => {
    if (!storage) return [];
    return [
      {
        key: "db",
        label: "Database",
        bytes: storage.databaseBytes + storage.walBytes,
        color: "#e0005a",
      },
      {
        key: "uploads",
        label: "Ảnh & tệp",
        bytes: storage.uploadsBytes,
        color: "#2fbf9b",
      },
      {
        key: "other",
        label: "Khác",
        bytes: storage.otherBytes,
        color: "#f0b45c",
      },
    ].filter((segment) => segment.bytes > 0);
  }, [storage]);

  return (
    <div className="adm-health">
      <div className="adm-toolbar">
        <div className="adm-period" role="group" aria-label="Khoảng thời gian tốc độ">
          {[7, 28].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={days === value}
              data-active={days === value}
              onClick={() => {
                if (value === days) return;
                setLoading(true);
                setDays(value);
              }}
            >
              {value} ngày
            </button>
          ))}
        </div>
        <button
          type="button"
          className="adm-health-refresh"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setRefresh((value) => value + 1);
          }}
        >
          {loading ? "Đang đo…" : "Làm mới"}
        </button>
      </div>

      {error ? (
        <p className="adm-notice" role="alert">
          {error}
        </p>
      ) : null}

      {!data ? (
        <p className="adm-empty" aria-live="polite">
          {loading ? "Đang đo sức khỏe website…" : "Chưa có dữ liệu."}
        </p>
      ) : (
        <>
          <div className="adm-health-hero" data-status={overallStatus(data)}>
            <span className="adm-health-grade" aria-hidden="true">
              {overallStatus(data) === "good"
                ? "✓"
                : overallStatus(data) === "bad"
                  ? "!"
                  : "•"}
            </span>
            <div className="adm-health-hero-copy">
              <p className="adm-health-eyebrow">Tổng quan</p>
              <h2>
                {overallStatus(data) === "good"
                  ? "Website đang khỏe"
                  : overallStatus(data) === "bad"
                    ? "Có vấn đề cần xử lý"
                    : overallStatus(data) === "warn"
                      ? "Cần chú ý vài điểm"
                      : "Đang thu thập dữ liệu"}
              </h2>
              <p>
                Đo lúc{" "}
                {new Date(data.generatedAt).toLocaleString("vi-VN")} · cập nhật
                mỗi lần bấm Làm mới.
              </p>
            </div>
            <div className="adm-health-hero-meta">
              <span>
                <strong>{numberFormat.format(storage!.uploadFiles)}</strong> ảnh
                &amp; tệp
              </span>
              <span>
                <strong>{data.backup.count}</strong> bản backup
              </span>
              <span data-tone={data.backup.warnings.length > 0 ? "warn" : "good"}>
                <strong>{data.backup.warnings.length}</strong> cảnh báo
              </span>
            </div>
          </div>
          <div className="adm-health-cards" aria-busy={loading}>
            <section className="adm-health-card" data-status={storageStatus(storage!)}>
              <header>
                <p className="adm-health-eyebrow">Dung lượng</p>
                <StatusPill status={storageStatus(storage!)} />
              </header>
              <strong className="adm-health-value">
                {storage!.available ? formatBytes(storage!.dataBytes) : "—"}
              </strong>
              <p className="adm-health-note">
                {storage!.available
                  ? `${numberFormat.format(storage!.uploadFiles)} ảnh/tệp · database ${formatBytes(storage!.databaseBytes + storage!.walBytes)}`
                  : storage!.note ?? "Không đọc được dung lượng."}
              </p>
              {storage!.available && usedSegments.length > 0 ? (
                <div className="adm-health-bar" role="img" aria-label="Tỷ trọng dung lượng">
                  {usedSegments.map((segment) => (
                    <span
                      key={segment.key}
                      style={{
                        width: `${(segment.bytes / Math.max(1, storage!.dataBytes)) * 100}%`,
                        background: segment.color,
                      }}
                    />
                  ))}
                </div>
              ) : null}
              <dl className="adm-health-facts">
                <div>
                  <dt>Database</dt>
                  <dd>{formatBytes(storage!.databaseBytes + storage!.walBytes)}</dd>
                </div>
                <div>
                  <dt>Ảnh &amp; tệp</dt>
                  <dd>{formatBytes(storage!.uploadsBytes)}</dd>
                </div>
                <div>
                  <dt>Hạn mức dự án</dt>
                  <dd>
                    {storage!.available
                      ? `${formatBytes(storage!.dataBytes)} / ${formatBytes(PROJECT_STORAGE_LIMIT_BYTES)}`
                      : "Không xác định"}
                  </dd>
                </div>
                {storage!.unusedMedia && storage!.unusedMedia.count > 0 ? (
                  <div>
                    <dt>Ảnh không dùng</dt>
                    <dd>
                      {numberFormat.format(storage!.unusedMedia.count)} ảnh ·{" "}
                      {formatBytes(storage!.unusedMedia.bytes)}
                      {storage!.unusedMedia.orphanCount > 0
                        ? ` · ${numberFormat.format(storage!.unusedMedia.orphanCount)} tệp ngoài thư viện`
                        : ""}
                    </dd>
                  </div>
                ) : null}
              </dl>
              {storage!.available ? (
                <p className="adm-health-note">
                  Đã dùng {numberFormat.format(Math.round(storagePercent))}% hạn
                  mức {formatBytes(PROJECT_STORAGE_LIMIT_BYTES)} · cảnh báo từ{" "}
                  {STORAGE_WARN_PERCENT}%.
                </p>
              ) : null}
              {storage!.unusedMedia &&
              storage!.unusedMedia.bytes > UNUSED_MEDIA_WARN_BYTES ? (
                <div className="adm-health-cleanup" role="note">
                  <strong>
                    {numberFormat.format(storage!.unusedMedia.count)} ảnh không
                    dùng · {formatBytes(storage!.unusedMedia.bytes)}
                  </strong>
                  <p>
                    Ảnh không còn xuất hiện trên web nhưng vẫn nằm trong volume
                    và mỗi bản sao lưu. Xoá bớt giúp volume nhẹ hơn, sao
                    lưu/khôi phục nhanh hơn và thư viện dễ chọn đúng ảnh.
                  </p>
                  <p className="adm-health-cleanup-note">
                    Chỉ ảnh không được tham chiếu ở bất kỳ tour, bài viết hay bản
                    nháp nào mới bị tính; API xoá vẫn chặn ảnh đang dùng.
                  </p>
                  {storage!.unusedMedia.orphanCount > 0 ? (
                    <p className="adm-health-cleanup-note">
                      {numberFormat.format(storage!.unusedMedia.orphanCount)} tệp
                      không còn trong thư viện — cần dọn trên máy chủ.
                    </p>
                  ) : null}
                  <Link className="adm-health-cta" href="/admin/media">
                    Mở Thư viện ảnh để xoá →
                  </Link>
                </div>
              ) : null}
              {storage!.note ? (
                <p className="adm-health-note adm-health-note--muted">{storage!.note}</p>
              ) : null}
            </section>

            <section className="adm-health-card adm-health-card--backup" data-status={data.backup.status}>
              <header>
                <p className="adm-health-eyebrow">Sao lưu</p>
                <StatusPill status={data.backup.status} />
              </header>
              <strong className="adm-health-value">
                {data.backup.configured
                  ? data.backup.lastSuccess
                    ? shortWhen(data.backup.lastSuccess.at)
                    : "Chưa có bản thành công"
                  : "Chưa cài đặt"}
              </strong>
              <p className="adm-health-note">
                {data.backup.configured
                  ? `${data.backup.count} bản · ${formatBytes(data.backup.totalBytes)} · giữ ${data.backup.retentionKeep ?? 3} bản tự động`
                  : data.backup.note ?? "Chưa cài đặt sao lưu trên máy chủ."}
              </p>
              <dl className="adm-health-facts">
                <div>
                  <dt>Lịch</dt>
                  <dd>
                    {data.backup.schedule
                      ? "Ngày 1 & 16 · 03:00"
                      : "Chưa có timer"}
                  </dd>
                </div>
                <div>
                  <dt>Offsite</dt>
                  <dd>
                    {data.backup.offsite.configured
                      ? data.backup.offsite.status
                      : "Chưa cấu hình"}
                  </dd>
                </div>
                <div>
                  <dt>Thử phục hồi</dt>
                  <dd>
                    {data.backup.lastRestoreTest
                      ? `${data.backup.lastRestoreTest.ok ? "Đạt" : "Lỗi"} · ${msLabel(data.backup.lastRestoreTest.durationMs)}`
                      : "Chưa đo"}
                  </dd>
                </div>
                <div>
                  <dt>Mã hóa</dt>
                  <dd>{data.backup.encryption ? "AES-256-GCM" : "Chưa xác nhận"}</dd>
                </div>
              </dl>
              <p className="adm-health-note adm-health-note--muted">
                Dung lượng trống nơi lưu: {formatBytes(data.backup.freeBytes)}
              </p>
              <Link className="adm-health-cta" href="/admin/account#backup">
                Mở Sao lưu &amp; phục hồi →
              </Link>
            </section>

            <section className="adm-health-card" data-status={speedStatus(data)}>
              <header>
                <p className="adm-health-eyebrow">Tốc độ tải</p>
                <StatusPill status={speedStatus(data)} />
              </header>
              <strong className="adm-health-value">
                {speed!.hasData
                  ? `${numberFormat.format(speed!.samples)} lượt đo`
                  : "Đang thu thập"}
              </strong>
              <p className="adm-health-note">
                {speed!.hasData
                  ? `p75 theo khách thật trong ${speed!.days} ngày gần nhất.`
                  : "Cần vài lượt truy cập thật sau khi phát hành để có p75."}
              </p>
              <div className="adm-health-vitals">
                {speed!.metrics.map((metric) => (
                  <SpeedTile
                    key={metric.key}
                    label={metric.label}
                    value={formatMetricValue(metric.key, metric.value)}
                    status={metric.status}
                    unit={metric.unit}
                    samples={metric.samples}
                  />
                ))}
              </div>
              {speed!.worstPages.length > 0 ? (
                <div className="adm-health-pages">
                  <p>Trang chậm nhất (LCP)</p>
                  <ul>
                    {speed!.worstPages.map((page) => (
                      <li key={page.path}>
                        <a href={page.path} target="_blank" rel="noreferrer">
                          {page.path}
                        </a>
                        <span>{formatMetricValue("lcp", page.value)}</span>
                        <small>{page.samples} mẫu</small>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

            <section className="adm-health-card" data-status={seo!.status}>
              <header>
                <p className="adm-health-eyebrow">SEO</p>
                <StatusPill status={seo!.status} />
              </header>
              <div className="adm-health-seo-top">
                <ScoreRing score={seo!.score} status={seo!.status} />
                <div>
                  <strong className="adm-health-value">{seo!.issues.length} nhóm lỗi</strong>
                  <p className="adm-health-note">
                    {seo!.pages} trang · sitemap {seo!.sitemapUrls ?? "—"} URL
                  </p>
                  <button
                    type="button"
                    className="adm-health-inline-link"
                    onClick={openTranslation}
                  >
                    Bản dịch EN đã duyệt: {seo!.translation.reviewed}/
                    {seo!.translation.total}
                    <span aria-hidden="true"> →</span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="adm-health-cta adm-health-cta--button"
                onClick={openOverview}
              >
                {seo!.issues.length > 0
                  ? `Xem chi tiết ${seo!.issues.length} nhóm lỗi`
                  : "Mở báo cáo SEO"}
                <span aria-hidden="true"> →</span>
              </button>
            </section>
          </div>

          <section className="adm-panel adm-health-panel">
            <header className="adm-health-panel-head">
              <div>
                <h2>Việc cần xử lý cho SEO</h2>
                <p>
                  {seo!.issues.length === 0 &&
                  data.backup.warnings.length === 0
                    ? "Không phát hiện lỗi trong lần kiểm tra này."
                    : "Sắp theo mức ưu tiên. Bấm “Sửa” để mở đúng nội dung."}
                </p>
              </div>
              <div className="adm-health-panel-actions">
                <span className="adm-health-panel-count">
                  {seo!.issues.reduce((sum, issue) => sum + issue.count, 0) +
                    data.backup.warnings.length}{" "}
                  mục
                </span>
                {seo!.issues.length > 0 ? (
                  <button
                    type="button"
                    className="adm-health-panel-open"
                    onClick={openOverview}
                  >
                    Xem chi tiết
                  </button>
                ) : null}
              </div>
            </header>
            <ul className="adm-health-issues">
              {data.backup.warnings.map((warning, index) => (
                <li key={`backup-${index}`} data-severity="medium">
                  <span className="adm-health-severity" aria-hidden="true" />
                  <div>
                    <strong>Sao lưu dữ liệu</strong>
                    <small>{warning}</small>
                  </div>
                  <span className="adm-health-count">!</span>
                  <Link href="/admin/account#backup" className="adm-health-fix">
                    Mở
                  </Link>
                </li>
              ))}
              {seo!.issues.map((issue) => (
                <li key={issue.id} data-severity={issue.severity}>
                  <span className="adm-health-severity" aria-hidden="true" />
                  <div>
                    <strong>{issue.title}</strong>
                    <small>{issue.detail}</small>
                  </div>
                  <span className="adm-health-count">{issue.count}</span>
                  <button
                    type="button"
                    className="adm-health-fix adm-health-fix--quiet"
                    onClick={() => openIssue(issue)}
                  >
                    Chi tiết
                  </button>
                  {issue.href ? (
                    <a href={issue.href} className="adm-health-fix">
                      Sửa
                    </a>
                  ) : null}
                </li>
              ))}
              {seo!.issues.length === 0 &&
              data.backup.warnings.length === 0 ? (
                <li data-severity="none">
                  <span className="adm-health-severity" aria-hidden="true" />
                  <div>
                    <strong>Mọi kiểm tra đều đạt</strong>
                    <small>
                      Tiếp tục giữ title/description riêng và cập nhật bản dịch EN
                      khi thêm nội dung mới.
                    </small>
                  </div>
                </li>
              ) : null}
            </ul>
          </section>

          <section className="adm-panel adm-health-machine">
            <div>
              <p className="adm-health-eyebrow">Máy chủ</p>
              <strong>{duration(data.server.uptimeSeconds)}</strong>
              <small>thời gian hoạt động</small>
            </div>
            <div data-status={budgetStatus(memoryPercent)}>
              <p className="adm-health-eyebrow">Bộ nhớ</p>
              <strong>{formatBytes(data.server.rssBytes)}</strong>
              <small>
                RSS · heap {formatBytes(data.server.heapUsedBytes)} ·{" "}
                {numberFormat.format(Math.round(memoryPercent))}% hạn mức{" "}
                {formatBytes(PROJECT_MEMORY_LIMIT_BYTES)}
              </small>
            </div>
            <div>
              <p className="adm-health-eyebrow">Database</p>
              <strong>
                {data.server.dbLatencyMs === null
                  ? "—"
                  : data.server.dbLatencyMs < 1
                    ? "<1 ms"
                    : `${data.server.dbLatencyMs} ms`}
              </strong>
              <small>truy vấn thử</small>
            </div>
            <div>
              <p className="adm-health-eyebrow">Node</p>
              <strong>{data.server.nodeVersion}</strong>
              <small>
                đo lúc{" "}
                {new Date(data.generatedAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </div>
          </section>
        </>
      )}

      {detail ? (
        <HealthDetailModal
          state={detail}
          onClose={closeDetail}
          onSelect={(issue) => openIssue(issue, true)}
          onBack={openOverview}
        />
      ) : null}
    </div>
  );
}

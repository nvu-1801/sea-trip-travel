"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
type BackupManifest = {
  id: string;
  kind: string;
  createdAt: string;
  appSha: string | null;
  archive: { bytes: number; sha256: string };
  verifiedAt?: string;
  lastVerify?: { at: string; ok: boolean } | null;
  lastRestoreTest?: {
    at: string;
    ok: boolean;
    durationMs: number | null;
    partial?: boolean;
  } | null;
  offsite?: { status: string } | null;
  configIncluded?: boolean;
};

type BackupRun = {
  id: string;
  kind: string;
  status: string;
  created_at: string;
  finished_at: string | null;
  error: string | null;
  backup_id: string | null;
  size_bytes: number | null;
};

type BackupState = {
  lastSuccess?: {
    id: string;
    kind: string;
    at: string;
    bytes?: number;
  } | null;
  lastAttempt?: { status: string; at: string; error?: string } | null;
  lastVerify?: { id: string; at: string; ok: boolean } | null;
  lastRestoreTest?: {
    id: string;
    at: string;
    ok: boolean;
    durationMs: number | null;
    partial?: boolean;
  } | null;
  offsite?: { configured?: boolean; status?: string } | null;
};

type BackupResponse = {
  configured: boolean;
  install: {
    schedule?: string;
    timezone?: string;
    retentionAuto?: number;
    offsiteConfigured?: boolean;
  } | null;
  state: BackupState | null;
  backups: BackupManifest[];
  runs: BackupRun[];
  activeRun: BackupRun | null;
};

type Prompt = { mode: "create" } | { mode: "download"; id: string };

const numberFormat = new Intl.NumberFormat("vi-VN");

function bytes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "—";
  if (value < 1024) return `${Math.round(value)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = value;
  let unit = "B";
  for (const next of units) {
    amount /= 1024;
    unit = next;
    if (amount < 1024) break;
  }
  return `${numberFormat.format(Math.round(amount * 10) / 10)} ${unit}`;
}

function when(value: string | null | undefined): string {
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

function duration(value: number | null): string {
  if (!value || !Number.isFinite(value)) return "—";
  if (value < 1000) return `${value} ms`;
  if (value < 60_000) return `${Math.round(value / 100) / 10} giây`;
  return `${Math.floor(value / 60_000)} phút ${Math.round((value % 60_000) / 1000)} giây`;
}

function kindLabel(kind: string): string {
  return kind === "auto"
    ? "Tự động"
    : kind === "predeploy"
      ? "Trước deploy"
      : "Thủ công";
}

function statusLabel(status: string): string {
  return (
    {
      queued: "Đang chờ",
      running: "Đang chạy",
      verifying: "Đang kiểm tra",
      done: "Hoàn tất",
      failed: "Thất bại",
    }[status] ?? status
  );
}

export function BackupPanel({ csrf }: { csrf: string }) {
  const [data, setData] = useState<BackupResponse | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/backups", {
        headers: { "x-csrf-token": csrf },
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Không tải được sao lưu.");
      setData(body as BackupResponse);
      setError("");
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : "Không tải được sao lưu.",
      );
    } finally {
      setLoading(false);
    }
  }, [csrf]);

  useEffect(() => {
    queueMicrotask(() => void refresh());
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!prompt) return;
    const timer = window.setTimeout(() => passwordRef.current?.focus(), 30);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setPrompt(null);
        setPassword("");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [prompt, busy]);

  async function submitPrompt(event: FormEvent) {
    event.preventDefault();
    if (!prompt || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (prompt.mode === "create") {
        const response = await fetch("/api/admin/backups", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrf,
          },
          body: JSON.stringify({ password }),
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "Không tạo được yêu cầu sao lưu.");
        setNotice(
          "Đã gửi yêu cầu. Worker trên máy chủ sẽ chạy trong tối đa 1 phút.",
        );
      } else {
        const response = await fetch(
          `/api/admin/backups/${encodeURIComponent(prompt.id)}/download`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-csrf-token": csrf,
            },
            body: JSON.stringify({ password }),
          },
        );
        if (!response.ok) {
          let message = "Không tải được backup.";
          try {
            const body = await response.json();
            message = body.error ?? message;
          } catch {
            /* binary/large error */
          }
          throw new Error(message);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${prompt.id}.seatar`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
        setNotice(
          "Đã tải bản backup đã mã hóa. Cần khóa archive.key để giải mã.",
        );
      }
      setPrompt(null);
      setPassword("");
      await refresh();
    } catch (exception) {
      setError(
        exception instanceof Error ? exception.message : "Có lỗi xảy ra.",
      );
    } finally {
      setBusy(false);
    }
  }

  const active = data?.activeRun ?? null;
  const state = data?.state;
  const backups = data?.backups ?? [];
  const runs = data?.runs ?? [];
  const latest = backups[0] ?? null;
  const autoCount = backups.filter((item) => item.kind === "auto").length;
  const keep = data?.install?.retentionAuto ?? 3;
  const lastSuccess = state?.lastSuccess ?? null;
  const restoreTest = state?.lastRestoreTest ?? null;
  const offsite = (data?.state?.offsite?.configured ??
  data?.install?.offsiteConfigured)
    ? state?.offsite?.status ?? "chưa xác minh"
    : "chưa cấu hình offsite";
  const pendingRuns = runs
    .filter(
      (run) =>
        !backups.some(
          (item) => item.id === run.backup_id || item.id === run.id,
        ),
    )
    .slice(0, 5);

  return (
    <section className="adm-panel adm-backup" id="backup" aria-labelledby="adm-backup-title">
      <header className="adm-backup-head">
        <div>
          <p className="adm-eyebrow">Bảo mật · Dữ liệu</p>
          <h2 id="adm-backup-title">Sao lưu &amp; phục hồi</h2>
          <p>
            SQLite được snapshot nhất quán cùng uploads, kiểm tra toàn vẹn rồi
            mã hóa AES-256-GCM. Bản tải về không chứa secrets dạng rõ.
          </p>
        </div>
        <div className="adm-backup-actions">
          <button
            type="button"
            className="adm-primary"
            disabled={busy || Boolean(active) || !data?.configured}
            onClick={() => {
              setNotice("");
              setError("");
              setPassword("");
              setPrompt({ mode: "create" });
            }}
          >
            {active ? "Đang xử lý…" : "Tạo bản sao lưu"}
          </button>
          <button type="button" onClick={() => void refresh()} disabled={busy}>
            Làm mới
          </button>
        </div>
      </header>

      {error ? (
        <p className="adm-notice" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="adm-notice adm-notice--ok" role="status">
          {notice}
        </p>
      ) : null}

      {!data?.configured ? (
        <div className="adm-backup-empty">
          <strong>Chưa cài đặt sao lưu trên máy chủ</strong>
          <p>
            Chạy <code>sudo bash scripts/backup/manage.sh install</code> trên VPS
            để cài timer ngày 1 &amp; 16 lúc 03:00 (Asia/Bangkok). Trang này chỉ
            đọc metadata, không có quyền chạy lệnh hay xem khóa.
          </p>
        </div>
      ) : null}

      <div className="adm-backup-grid">
        <div className="adm-backup-stat">
          <span>Lịch tự động</span>
          <strong>
            {data?.install?.schedule
              ? `Ngày 1 & 16 · 03:00`
              : "Chưa cài timer"}
          </strong>
          <small>{data?.install?.timezone ?? "Asia/Bangkok"}</small>
        </div>
        <div className="adm-backup-stat">
          <span>Bản thành công gần nhất</span>
          <strong>{lastSuccess ? when(lastSuccess.at) : "Chưa có"}</strong>
          <small>
            {lastSuccess
              ? `${kindLabel(lastSuccess.kind)} · ${bytes(lastSuccess.bytes)}`
              : "Chạy backup thủ công hoặc đợi lịch"}
          </small>
        </div>
        <div className="adm-backup-stat">
          <span>Retention</span>
          <strong>
            {autoCount}/{keep} bản auto
          </strong>
          <small>Chỉ xóa bản auto đã verify; giữ nguyên pre-deploy/manual</small>
        </div>
        <div className="adm-backup-stat">
          <span>Offsite</span>
          <strong data-tone={offsite === "verified" ? "good" : "warn"}>
            {offsite}
          </strong>
          <small>
            {latest ? `Bản mới nhất ${bytes(latest.archive.bytes)}` : "Chưa có bản nào"}
          </small>
        </div>
      </div>

      {state?.lastAttempt?.status === "failed" ? (
        <p className="adm-notice adm-notice--warn" role="alert">
          Lần chạy gần nhất thất bại
          {state.lastAttempt.error ? `: ${state.lastAttempt.error}` : "."} Bản cũ
          vẫn được giữ nguyên.
        </p>
      ) : null}

      {active ? (
        <div className="adm-backup-progress" role="status" aria-live="polite">
          <span className="adm-backup-spinner" aria-hidden="true" />
          <div>
            <strong>{statusLabel(active.status)}</strong>
            <small>
              Yêu cầu lúc {when(active.created_at)} · worker chạy trên máy chủ,
              không cấp Docker socket cho web app.
            </small>
          </div>
        </div>
      ) : null}

      <div className="adm-backup-table-wrap">
        <table className="adm-backup-table">
          <thead>
            <tr>
              <th>Thời điểm</th>
              <th>Loại</th>
              <th>Trạng thái</th>
              <th>Dung lượng</th>
              <th>Kiểm tra</th>
              <th>Tải</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={6}>Đang tải lịch sử sao lưu…</td>
              </tr>
            ) : null}
            {pendingRuns.map((run) => (
              <tr key={run.id} data-tone={run.status === "failed" ? "bad" : undefined}>
                <td>{when(run.created_at)}</td>
                <td>{kindLabel(run.kind)}</td>
                <td>
                  <span className={`adm-backup-badge adm-backup-badge--${run.status}`}>
                    {statusLabel(run.status)}
                  </span>
                </td>
                <td>{bytes(run.size_bytes)}</td>
                <td>{run.error ? run.error : "—"}</td>
                <td>—</td>
              </tr>
            ))}
            {backups.length === 0 && !active ? (
              <tr>
                <td colSpan={6}>Chưa có bản backup nào.</td>
              </tr>
            ) : null}
            {backups.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{when(item.createdAt)}</strong>
                  <small className="adm-backup-id">{item.id}</small>
                </td>
                <td>{kindLabel(item.kind)}</td>
                <td>
                  <span className="adm-backup-badge adm-backup-badge--done">
                    Hoàn tất
                  </span>
                  <small>{item.configIncluded ? "kèm cấu hình" : "không có cấu hình"}</small>
                </td>
                <td>{bytes(item.archive.bytes)}</td>
                <td>
                  {item.lastVerify?.ok ? (
                    <span className="adm-backup-check" data-ok="true">
                      Verify OK · {when(item.lastVerify.at)}
                    </span>
                  ) : (
                    <span className="adm-backup-check">Đã verify khi tạo</span>
                  )}
                  {item.lastRestoreTest ? (
                    <small className="adm-backup-check" data-ok={item.lastRestoreTest.ok}>
                      Restore-test {item.lastRestoreTest.ok ? "OK" : "lỗi"} ·{" "}
                      {duration(item.lastRestoreTest.durationMs)}
                      {item.lastRestoreTest.partial ? " (thiếu khóa)" : ""}
                    </small>
                  ) : null}
                </td>
                <td>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setNotice("");
                      setError("");
                      setPassword("");
                      setPrompt({ mode: "download", id: item.id });
                    }}
                  >
                    Tải .seatar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="adm-backup-notes">
        <p>
          <strong>Khôi phục chỉ qua CLI:</strong>{" "}
          <code>manage.sh verify &lt;id&gt;</code> rồi{" "}
          <code>manage.sh restore-test &lt;id&gt;</code>. Trang web không có nút
          khôi phục đè production.
        </p>
        <p>
          Lần thử phục hồi gần nhất:{" "}
          {restoreTest
            ? `${restoreTest.ok ? "đạt" : "lỗi"} · ${duration(restoreTest.durationMs)} · ${when(restoreTest.at)}`
            : "chưa đo"}
          .
        </p>
        <p className="adm-backup-warning">
          Backup cùng VPS không bảo vệ trước reset/mất ổ đĩa. Sao chép file{" "}
          <code>.seatar</code> và khóa <code>archive.key</code> ra ngoài VPS
          (ổ ngoài/password manager). Mất khóa = không giải mã được backup.
        </p>
      </div>

      {prompt ? (
        <div
          className="adm-backup-veil"
          role="dialog"
          aria-modal="true"
          aria-label={
            prompt.mode === "create"
              ? "Xác thực để tạo sao lưu"
              : "Xác thực để tải sao lưu"
          }
          onClick={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setPrompt(null);
              setPassword("");
            }
          }}
        >
          <form className="adm-backup-dialog" onSubmit={submitPrompt}>
            <h3>
              {prompt.mode === "create"
                ? "Xác thực lại để tạo bản sao lưu"
                : "Xác thực lại để tải bản sao lưu"}
            </h3>
            <p>
              Nhập lại mật khẩu quản trị. Không lưu mật khẩu; mỗi thao tác nhạy
              cảm đều kiểm tra lại và có giới hạn tần suất.
            </p>
            <label>
              <span>Mật khẩu</span>
              <input
                ref={passwordRef}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <div className="adm-backup-dialog-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPrompt(null);
                  setPassword("");
                }}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="adm-primary"
                disabled={busy || password.length === 0}
              >
                {busy
                  ? "Đang xử lý…"
                  : prompt.mode === "create"
                    ? "Tạo backup"
                    : "Tải xuống"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

#!/usr/bin/env node
/**
 * Gửi email "website vừa được cập nhật" sau khi deploy thành công.
 *
 * Workflow gọi `scripts/deploy/notify.sh` sau bước kiểm tra health công khai;
 * script này chạy BÊN TRONG container vừa deploy nên dùng đúng SMTP đang có
 * trong `.env.production` — không cần thêm mật khẩu SMTP vào GitHub.
 *
 * An toàn:
 *  - chỉ gửi khi MAIL_TRANSPORT=smtp và đủ cấu hình;
 *  - chống gửi trùng bằng SHA của bản deploy, lưu trong volume /app/data;
 *  - email chỉ chứa ghi chú khách hàng đã được duyệt trong commit trailer,
 *    không chứa SHA, tên tệp, log hay thông tin đăng nhập;
 *  - lỗi gửi email không làm deploy thất bại (bước workflow có continue-on-error).
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildReleaseNoticeHtml,
  buildReleaseNoticeSubject,
  buildReleaseNoticeText,
  parseRecipients,
  parseReleaseManifest,
  safeSiteUrl,
  selectReleaseNotes,
} from "./lib/release-notice.mjs";

const log = (message) => console.log(`[release-notice] ${message}`);
const warn = (message) => console.warn(`[release-notice] ${message}`);

const headSha = (process.argv[2] ?? process.env.APP_SHA ?? "").trim();
const previousSha = (process.env.RELEASE_NOTICE_PREVIOUS_SHA ?? "").trim();
const siteName =
  (process.env.RELEASE_NOTICE_SITE_NAME ?? "SEA TRIP TRAVEL").replace(/\s+/g, " ").trim() ||
  "SEA TRIP TRAVEL";

if ((process.env.RELEASE_NOTICE_ENABLED ?? "true").toLowerCase() === "false") {
  log("Đã tắt bằng RELEASE_NOTICE_ENABLED=false.");
  process.exit(0);
}

if (!/^[a-f0-9]{40}$/.test(headSha)) {
  warn("Không có SHA hợp lệ của bản deploy; bỏ qua email.");
  process.exit(1);
}

// --- 1. Cấu hình gửi thư (dùng chung với form tư vấn) -----------------------
const transport = (process.env.MAIL_TRANSPORT ?? "log").toLowerCase();
if (transport !== "smtp") {
  warn("MAIL_TRANSPORT chưa phải 'smtp'; bỏ qua email thông báo.");
  process.exit(0);
}

const missing = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM_EMAIL"].filter(
  (name) => !(process.env[name] ?? "").trim(),
);
if (missing.length > 0) {
  warn(`Thiếu cấu hình email: ${missing.join(", ")}. Bỏ qua email thông báo.`);
  process.exit(0);
}

const fromEmail = (process.env.MAIL_FROM_EMAIL ?? "").trim();
if (parseRecipients(fromEmail).length !== 1) {
  warn("MAIL_FROM_EMAIL không hợp lệ; bỏ qua email thông báo.");
  process.exit(0);
}
const fromName =
  (process.env.MAIL_FROM_NAME ?? siteName).replace(/[\r\n]+/g, " ").trim() || siteName;

const recipients = parseRecipients(
  (process.env.RELEASE_NOTICE_RECIPIENTS ?? "").trim() ||
    (process.env.SALES_RECIPIENTS ?? "").trim(),
);
if (recipients.length === 0) {
  warn(
    "Chưa có người nhận. Thêm RELEASE_NOTICE_RECIPIENTS=email-cua-chu-doanh-nghiep (hoặc SALES_RECIPIENTS) vào .env.production trên VPS.",
  );
  process.exit(0);
}

const siteUrl = safeSiteUrl(
  (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim() || (process.env.SITE_URL ?? "").trim(),
);
if (!siteUrl) {
  warn("Thiếu NEXT_PUBLIC_SITE_URL (hoặc SITE_URL) hợp lệ; không thể tạo nút Xem website.");
  process.exit(0);
}

// --- 2. Chống gửi trùng -----------------------------------------------------
function stateFile() {
  const configured = (process.env.RELEASE_NOTICE_STATE_FILE ?? "").trim();
  if (configured) return configured;
  if (existsSync("/app/data")) return "/app/data/release-notices.json";
  return path.resolve("data/release-notices.json");
}

const STATE_FILE = stateFile();

function readState() {
  try {
    const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    const notified = Array.isArray(parsed?.notified)
      ? parsed.notified.filter(
          (entry) =>
            entry &&
            typeof entry.sha === "string" &&
            /^[a-f0-9]{40}$/.test(entry.sha) &&
            typeof entry.at === "string",
        )
      : [];
    return { version: 1, notified: notified.slice(-100) };
  } catch {
    return { version: 1, notified: [] };
  }
}

function writeState(state) {
  mkdirSync(path.dirname(STATE_FILE), { recursive: true, mode: 0o700 });
  const temporary = `${STATE_FILE}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(temporary, STATE_FILE);
}

const state = readState();
if (state.notified.some((entry) => entry.sha === headSha)) {
  log(`Bản ${headSha.slice(0, 7)} đã được thông báo trước đó; không gửi lại.`);
  process.exit(0);
}

// Ghi "đang gửi" TRƯỚC khi gửi. Nếu tiến trình chết giữa chừng, lần chạy lại
// sẽ bỏ qua thay vì gửi trùng. Nếu gửi lỗi rõ ràng, mục này được gỡ để có thể
// thử lại.
try {
  state.notified.push({ sha: headSha, at: new Date().toISOString(), status: "sending" });
  writeState({ version: 1, notified: state.notified.slice(-100) });
} catch (error) {
  warn(
    `Không ghi được trạng thái chống trùng tại ${STATE_FILE} (${
      error instanceof Error ? error.message : "unknown"
    }). Không gửi email để tránh gửi trùng.`,
  );
  process.exit(1);
}

function clearClaim() {
  try {
    const current = readState();
    writeState({
      version: 1,
      notified: current.notified.filter((entry) => entry.sha !== headSha),
    });
  } catch {
    /* trạng thái cũ vẫn an toàn: lần sau sẽ bỏ qua thay vì gửi trùng */
  }
}

// --- 3. Nội dung khách hàng nhìn thấy --------------------------------------
const manifestRaw =
  process.env.RELEASE_NOTES_JSON ??
  (existsSync("release-notes.json") ? readFileSync("release-notes.json", "utf8") : "");
const manifest = parseReleaseManifest(manifestRaw);
const { items, rejected, omitted } = selectReleaseNotes(manifest, { headSha, previousSha });

if (rejected.length > 0) {
  warn(`${rejected.length} ghi chú bị bỏ vì có dấu hiệu nội bộ/kỹ thuật.`);
}
if (omitted > 0) {
  warn(`${omitted} ghi chú vượt giới hạn ${items.length} mục nên không đưa vào email.`);
}
log(`${items.length} mục dành cho khách hàng trong đợt này.`);

// --- 4. Gửi ----------------------------------------------------------------
const updatedAt = new Date();
const subject = buildReleaseNoticeSubject({ siteName, updatedAt });
const html = buildReleaseNoticeHtml({ siteName, siteUrl, updatedAt, items });
const text = buildReleaseNoticeText({ siteName, siteUrl, updatedAt, items });

try {
  const { createTransport } = await import("nodemailer");
  const transporter = createTransport({
    host: (process.env.SMTP_HOST ?? "").trim(),
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: (process.env.SMTP_SECURE ?? "false").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 8_000,
    socketTimeout: 15_000,
  });

  await transporter.sendMail({
    from: `${fromName} <${fromEmail}>`,
    to: recipients,
    replyTo: fromEmail,
    subject,
    text,
    html,
  });
} catch (error) {
  clearClaim();
  const detail = error instanceof Error ? error.message : "unknown";
  warn(`Không gửi được email thông báo: ${detail}`);
  process.exit(1);
}

try {
  const notified = state.notified
    .filter((entry) => entry.sha !== headSha)
    .concat({ sha: headSha, at: updatedAt.toISOString(), status: "sent" })
    .slice(-100);
  writeState({ version: 1, notified });
} catch (error) {
  // Thư đã gửi; mục "sending" vẫn còn nên lần deploy lại sẽ không gửi trùng.
  warn(
    `Đã gửi email nhưng không cập nhật được trạng thái: ${
      error instanceof Error ? error.message : "unknown"
    }`,
  );
}

log(`Đã gửi email thông báo tới ${recipients.length} người nhận.`);

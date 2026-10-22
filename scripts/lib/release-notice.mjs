/**
 * Nội dung email "website vừa được cập nhật".
 *
 * Module thuần (không I/O) để unit test được phần dễ sai nhất: chọn đúng ghi
 * chú của đợt deploy, loại bỏ nội dung kỹ thuật, escape HTML và dựng cả hai
 * phiên bản HTML / văn bản thuần.
 *
 * Ghi chú dành cho khách hàng KHÔNG được suy ra từ commit message thông
 * thường. Chỉ những commit có trailer rõ ràng mới được đưa vào email:
 *
 *   Customer-Note: Trang tour mới giúp khách xem lịch trình và giá rõ hơn
 *
 * Nếu không có trailer nào, email nói đúng sự thật là đợt này không kèm ghi
 * chú thay đổi dành cho khách hàng — không tự bịa tính năng.
 */

export const MAX_RELEASE_NOTES = 8;
export const MAX_NOTE_LENGTH = 180;
const MAX_MANIFEST_COMMITS = 400;

const HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

export function normalizeNote(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Chặn những nội dung không nên xuất hiện trong email dành cho chủ doanh
 * nghiệp: URL, đường dẫn tệp, mã commit, HTML và thuật ngữ kỹ thuật.
 *
 * Đây là lớp bảo vệ cuối, không thay thế quy ước viết ghi chú.
 */
const INTERNAL_NOTE_PATTERNS = [
  /https?:\/\//i,
  /\bwww\.[\w.-]+/i,
  /`/,
  /<|>/,
  /\b[A-Za-z]:\\/,
  /\b[\w.-]+\.(?:tsx?|jsx?|mjs|cjs|json|ya?ml|toml|sql|css|scss|less|md|env|lock|log|png|jpe?g|webp|svg)\b/i,
  /\b(?:src|app|lib|scripts|docs|public|node_modules|components|features|routes?|api)\/[\w./-]+/i,
  /(?:^|\s)\/(?:app|src|opt|etc|var|home|root|usr)\b/,
  /\b[0-9a-f]{7,40}\b/i,
  /\b(?:API|SMTP|SQL|DB|CI|CD|PR|URL|JSON|HTML|CSS|JS|TS|SHA|ENV|CMS|UI|UX|SEO|HTTP|HTTPS|DNS|TLS|SSL)\b/,
  /\b(?:commit|commits|deploy|deploys|deployment|pipeline|build|builds|lint|typecheck|refactor|merge|repository|database|migration|backend|frontend|server|docker|kubernetes|npm|pnpm|node|config|configuration|rollback|hotfix|bug|bugs|test|tests|staging|production|release note)\b/i,
  /\b(?:pull|merge) request\b/i,
];

export function looksInternal(note) {
  return INTERNAL_NOTE_PATTERNS.some((pattern) => pattern.test(note));
}

export function isCustomerFacingNote(note) {
  const value = normalizeNote(note);
  if (value.length < 8 || value.length > MAX_NOTE_LENGTH) return false;
  return !looksInternal(value);
}

/**
 * Đọc manifest do CI tạo (xem scripts/build-release-notes.mjs).
 * Mọi dữ liệu sai định dạng đều trở thành manifest rỗng, không ném lỗi.
 */
export function parseReleaseManifest(raw) {
  const empty = { version: 2, head: null, order: [], notes: {} };
  if (typeof raw !== "string" || raw.trim() === "") return empty;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return empty;
  }

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.order)) return empty;

  const order = parsed.order
    .filter((sha) => typeof sha === "string" && /^[a-f0-9]{40}$/.test(sha))
    .slice(0, MAX_MANIFEST_COMMITS);

  const notes = {};
  if (parsed.notes && typeof parsed.notes === "object") {
    for (const sha of order) {
      const values = parsed.notes[sha];
      if (!Array.isArray(values)) continue;
      const cleaned = values
        .filter((value) => typeof value === "string")
        .map(normalizeNote)
        .filter(Boolean);
      if (cleaned.length > 0) notes[sha] = cleaned;
    }
  }

  return {
    version: 2,
    head: typeof parsed.head === "string" && /^[a-f0-9]{40}$/.test(parsed.head) ? parsed.head : null,
    order,
    notes,
  };
}

/**
 * Chọn ghi chú của đợt deploy hiện tại.
 *
 * `order` xếp mới nhất trước. Khi biết SHA đang chạy trên production, lấy đúng
 * các commit nằm giữa bản cũ và bản mới. Khi không biết (deploy đầu tiên, lịch
 * sử bị viết lại, hoặc khoảng cách quá lớn), chỉ lấy commit đầu — tuyệt đối
 * không gửi lại toàn bộ lịch sử.
 */
export function selectReleaseNotes(manifest, options = {}) {
  const maxItems = Number.isInteger(options.maxItems) ? options.maxItems : MAX_RELEASE_NOTES;
  const headSha = normalizeNote(options.headSha);
  const previousSha = normalizeNote(options.previousSha);
  const order = manifest?.order ?? [];

  const headIndex = order.indexOf(headSha);
  if (headIndex === -1) return { items: [], rejected: [], omitted: 0 };

  let eligible = [];
  const previousIndex = order.indexOf(previousSha);
  if (previousIndex > headIndex) {
    // order mới nhất trước: [head ... previous). Bản previous đã được thông báo
    // ở lần deploy trước nên không lặp lại.
    eligible = order.slice(headIndex, previousIndex);
  } else if (previousSha !== headSha) {
    eligible = order.slice(headIndex, headIndex + 1);
  }

  const seen = new Set();
  const rejected = [];
  const candidates = [];

  // Đưa về thứ tự thời gian (cũ → mới) cho danh sách trong email.
  for (const sha of [...eligible].reverse()) {
    for (const note of manifest.notes?.[sha] ?? []) {
      const value = normalizeNote(note);
      const key = value.toLocaleLowerCase("vi");
      if (!value || seen.has(key)) continue;
      seen.add(key);
      if (!isCustomerFacingNote(value)) {
        rejected.push(value);
        continue;
      }
      candidates.push(value);
    }
  }

  const items = candidates.length > maxItems ? candidates.slice(candidates.length - maxItems) : candidates;
  return { items, rejected, omitted: candidates.length - items.length };
}

export function parseRecipients(value) {
  const seen = new Set();
  const recipients = [];
  for (const part of String(value ?? "").split(/[,;]/)) {
    const address = part.trim();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(address)) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push(address);
    if (recipients.length >= 10) break;
  }
  return recipients;
}

/** Chỉ chấp nhận URL http(s) tuyệt đối; trả về null nếu không dùng được. */
export function safeSiteUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname) return null;
    return url.origin + (url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, ""));
  } catch {
    return null;
  }
}

/** "Thứ Năm, 22/10/2026 lúc 14:05" theo giờ Việt Nam. */
export function formatUpdatedAt(date = new Date(), timeZone = "Asia/Ho_Chi_Minh") {
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.weekday ?? ""}, ${parts.day}/${parts.month}/${parts.year} lúc ${parts.hour}:${parts.minute}`;
}

export function buildReleaseNoticeSubject({ siteName = "SEA TRIP", updatedAt = new Date() } = {}) {
  const formatter = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return `[${siteName}] Website vừa được cập nhật · ${formatter.format(updatedAt)}`;
}

function noteRow(note, index) {
  return `
    <tr>
      <td width="34" style="padding:0 12px 14px 0;vertical-align:top;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="26" height="26" bgcolor="#fff0f6" style="width:26px;height:26px;background-color:#fff0f6;border:1px solid #ffd0e2;border-radius:13px;text-align:center;vertical-align:middle;font:700 13px/26px Arial,Helvetica,sans-serif;color:#c4004e;">
              ${index + 1}
            </td>
          </tr>
        </table>
      </td>
      <td style="padding:0 0 14px 0;vertical-align:top;font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#211621;">
        ${escapeHtml(note)}
      </td>
    </tr>`;
}

function infoRow(label, valueHtml, last = false) {
  const border = last ? "" : "border-bottom:1px solid #f2dde7;";
  return `
    <tr>
      <td class="info-row-label" style="${border}padding:10px 14px 10px 0;vertical-align:top;width:130px;font:600 12px/1.5 Arial,Helvetica,sans-serif;letter-spacing:0.4px;text-transform:uppercase;color:#8b7684;">
        ${escapeHtml(label)}
      </td>
      <td class="info-row-value" style="${border}padding:10px 0;vertical-align:top;font:600 14px/1.6 Arial,Helvetica,sans-serif;color:#211621;">
        ${valueHtml}
      </td>
    </tr>`;
}

export function buildReleaseNoticeHtml({
  siteName = "SEA TRIP TRAVEL",
  siteUrl,
  updatedAt = new Date(),
  items = /** @type {string[]} */ ([]),
} = {}) {
  const safeUrl = safeSiteUrl(siteUrl) ?? "";
  const logoUrl = safeUrl ? `${safeUrl}/brand/logo-lockup.png` : "";
  const updatedLabel = formatUpdatedAt(updatedAt);
  const preheader = items.length
    ? `Những điểm khách hàng sẽ nhìn thấy sau đợt cập nhật: ${items.length} thay đổi.`
    : "Website vừa được cập nhật. Đợt này không kèm ghi chú thay đổi dành cho khách hàng.";

  const featureSection = items.length
    ? `
          <tr>
            <td class="px" style="padding:24px 32px 0 32px;">
              <h2 style="margin:0 0 14px 0;font:800 17px/1.4 Arial,Helvetica,sans-serif;color:#211621;">
                Điểm mới khách hàng sẽ thấy
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${items.map((note, index) => noteRow(note, index)).join("")}
              </table>
            </td>
          </tr>`
    : `
          <tr>
            <td class="px" style="padding:24px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td bgcolor="#fff8f1" style="background-color:#fff8f1;border:1px solid #ffe3c7;border-radius:12px;padding:16px 18px;font:400 14px/1.7 Arial,Helvetica,sans-serif;color:#6e5c68;">
                    Đợt cập nhật này không kèm ghi chú thay đổi dành cho khách hàng.
                    Bạn vẫn có thể mở website để xem tổng thể.
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>Website đã được cập nhật</title>
<style>
  @media only screen and (max-width: 600px) {
    .email-wrap { padding: 12px 8px !important; }
    .email-card { border-radius: 14px !important; }
    .px { padding-left: 20px !important; padding-right: 20px !important; }
    .hero-title { font-size: 22px !important; line-height: 1.3 !important; }
    .cta a { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
    .info-row-label { width: 92px !important; font-size: 10px !important; }
    .info-row-value { font-size: 13px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#fffafc;">
  <div style="display:none;font-size:1px;color:#fffafc;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-wrap" style="background:#fffafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="email-card" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #f2dde7;border-radius:18px;overflow:hidden;">

          <tr>
            <td bgcolor="#e0005a" style="height:8px;background-color:#e0005a;background-image:linear-gradient(90deg,#ff0366 0%,#ff7c2c 60%,#ffbc0e 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td class="px" style="padding:28px 32px 0 32px;">
              ${
                logoUrl
                  ? `<img src="${escapeHtml(logoUrl)}" width="200" alt="${escapeHtml(siteName)}" style="display:block;width:200px;max-width:62%;height:auto;border:0;outline:none;text-decoration:none;" />`
                  : `<p style="margin:0;font:800 20px/1.3 Arial,Helvetica,sans-serif;color:#c4004e;">${escapeHtml(siteName)}</p>`
              }
              <p style="margin:14px 0 0 0;font:600 11px/1.4 Arial,Helvetica,sans-serif;letter-spacing:1.4px;text-transform:uppercase;color:#c4004e;">
                Cập nhật website thành công
              </p>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:18px 32px 0 32px;">
              <h1 class="hero-title" style="margin:0;font:800 25px/1.3 Arial,Helvetica,sans-serif;color:#211621;">
                Website đã được cập nhật
              </h1>
              <p style="margin:10px 0 0 0;font:400 15px/1.7 Arial,Helvetica,sans-serif;color:#6e5c68;">
                Chào bạn, website <strong style="color:#211621;">${escapeHtml(siteName)}</strong> vừa hoàn tất một đợt cập nhật.
                Dưới đây là những điểm khách hàng sẽ nhìn thấy khi truy cập.
              </p>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:20px 32px 0 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffafc;border:1px solid #f2dde7;border-radius:12px;">
                <tr>
                  <td style="padding:4px 16px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${infoRow("Website", escapeHtml(siteName))}
                      ${infoRow("Cập nhật lúc", `<span style="font-weight:400;">${escapeHtml(updatedLabel)} (giờ Việt Nam)</span>`, true)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${featureSection}

          <tr>
            <td class="px cta" style="padding:26px 32px 4px 32px;">
              ${
                safeUrl
                  ? `<a href="${escapeHtml(safeUrl)}" style="display:inline-block;background:#e0005a;color:#ffffff;font:700 15px/1 Arial,Helvetica,sans-serif;padding:15px 28px;border-radius:999px;text-decoration:none;">
                      Xem website →
                    </a>`
                  : `<p style="margin:0;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#8b7684;">Mở website để xem đầy đủ các thay đổi.</p>`
              }
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:26px 32px 30px 32px;">
              <p style="margin:0;font:400 12px/1.7 Arial,Helvetica,sans-serif;color:#8b7684;border-top:1px solid #f2dde7;padding-top:16px;">
                Email tự động gửi tới quản trị viên website ${escapeHtml(siteName)} sau khi đợt cập nhật hoàn tất và được kiểm tra hoạt động bình thường.
              </p>
            </td>
          </tr>

        </table>

        <p style="margin:16px 0 0 0;font:400 11px/1.6 Arial,Helvetica,sans-serif;color:#8b7684;text-align:center;">
          ${escapeHtml(siteName)}${safeUrl ? ` · ${escapeHtml(safeUrl.replace(/^https?:\/\//, ""))}` : ""}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildReleaseNoticeText({
  siteName = "SEA TRIP TRAVEL",
  siteUrl,
  updatedAt = new Date(),
  items = /** @type {string[]} */ ([]),
} = {}) {
  const safeUrl = safeSiteUrl(siteUrl);
  const lines = [
    siteName.toUpperCase(),
    "",
    "WEBSITE ĐÃ ĐƯỢC CẬP NHẬT",
    "",
    `Website: ${siteName}`,
    `Cập nhật lúc: ${formatUpdatedAt(updatedAt)} (giờ Việt Nam)`,
    "",
  ];

  if (items.length > 0) {
    lines.push("ĐIỂM MỚI KHÁCH HÀNG SẼ THẤY", "");
    items.forEach((note, index) => lines.push(`${index + 1}. ${note}`));
  } else {
    lines.push(
      "Đợt cập nhật này không kèm ghi chú thay đổi dành cho khách hàng.",
      "Bạn vẫn có thể mở website để xem tổng thể.",
    );
  }

  if (safeUrl) {
    lines.push("", `Xem website: ${safeUrl}`);
  }

  lines.push(
    "",
    "--",
    `Email tự động gửi tới quản trị viên website ${siteName} sau khi đợt cập nhật hoàn tất và được kiểm tra hoạt động bình thường.`,
  );

  return lines.join("\n");
}

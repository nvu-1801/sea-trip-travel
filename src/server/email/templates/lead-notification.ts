import "server-only";

import type { ContactLead } from "@/domain/lead";
import { formatDate, formatDateTimeVietnam } from "@/lib/format";
import { siteConfig } from "@/config/site";
import { escapeHtml, isSafeSiteHref, safeMailtoHref, safeSiteUrl, safeTelHref } from "@/lib/sanitize";

/**
 * Sales notification email.
 *
 * Constraints this template is built to satisfy:
 *  - reads correctly in Gmail and Outlook (tables, inline styles, no flex/grid)
 *  - legible with images blocked (every image has meaningful alt text, and no
 *    information lives in an image)
 *  - no JavaScript, no forms, no background-image dependency for content
 *  - every customer-supplied string is HTML-escaped; no raw HTML is interpolated
 *  - links are validated before they become `href` values
 *
 * The escaping and URL-validation rules live in `lib/sanitize.ts` so they can be
 * unit tested directly — see `tests/sanitize.test.ts`.
 */

export { escapeHtml, safeMailtoHref, safeSiteUrl, safeTelHref };

export type LeadNotificationContext = {
  lead: ContactLead;
  /** Human tour title resolved server-side from the slug, when known. */
  tourTitle?: string;
  /** Absolute URL of the page the request came from, already validated. */
  sourceUrl?: string;
  /** Absolute URL of the tour page, when the request came from a tour page. */
  tourUrl?: string;
};

export function buildLeadSubject(context: LeadNotificationContext): string {
  const { lead, tourTitle } = context;
  const parts = ["[SEA TRIP] Yêu cầu tư vấn mới", `#${lead.requestId}`];
  if (tourTitle) parts.push(tourTitle.length > 48 ? `${tourTitle.slice(0, 47)}…` : tourTitle);
  return parts.join(" · ");
}

function row(label: string, valueHtml: string, options?: { last?: boolean }): string {
  const border = options?.last ? "" : "border-bottom:1px solid #f2dde7;";
  return `
    <tr>
      <td style="${border}padding:12px 16px 12px 0;vertical-align:top;width:190px;font:600 13px/1.5 Arial,Helvetica,sans-serif;color:#6e5c68;">
        ${escapeHtml(label)}
      </td>
      <td style="${border}padding:12px 0;vertical-align:top;font:400 15px/1.6 Arial,Helvetica,sans-serif;color:#211621;">
        ${valueHtml}
      </td>
    </tr>`;
}

function missing(value: string | undefined): string {
  return value && value.trim().length > 0
    ? escapeHtml(value)
    : `<span style="color:#8b7684;">Khách không cung cấp</span>`;
}

export function buildLeadNotificationHtml(context: LeadNotificationContext): string {
  const { lead, tourTitle, sourceUrl, tourUrl } = context;
  const telHref = safeTelHref(lead.phone);
  const mailHref = safeMailtoHref(lead.email);
  const logoUrl = `${siteConfig.url.replace(/\/+$/, "")}/brand/logo-lockup.png`;
  const preheader = `Yêu cầu mới từ ${lead.fullName} · ${lead.phone}`;

  // Re-validate before emitting an href (defence in depth — see lib/sanitize.ts).
  const tourHref = tourUrl && isSafeSiteHref(tourUrl) ? tourUrl : null;
  const sourceHref = sourceUrl && isSafeSiteHref(sourceUrl) ? sourceUrl : null;

  const interestValue = tourTitle
    ? `${escapeHtml(tourTitle)}${
        tourHref
          ? `<br /><a href="${escapeHtml(tourHref)}" style="color:#c4004e;font-size:13px;">Mở trang tour</a>`
          : ""
      }`
    : missing(lead.interest);

  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>Yêu cầu tư vấn mới</title>
</head>
<body style="margin:0;padding:0;background:#fffafc;">
  <!-- Preheader: shown in the inbox preview, hidden in the body. -->
  <div style="display:none;font-size:1px;color:#fffafc;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffafc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #f2dde7;border-radius:16px;overflow:hidden;">

          <!-- Brand bar. Solid colour with a gradient overlay so Outlook still shows brand pink. -->
          <tr>
            <td bgcolor="#e0005a" style="height:8px;background-color:#e0005a;background-image:linear-gradient(90deg,#ff0366 0%,#ff7c2c 60%,#ffbc0e 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <img src="${escapeHtml(logoUrl)}" width="200" alt="SEA TRIP TRAVEL" style="display:block;width:200px;max-width:60%;height:auto;border:0;outline:none;text-decoration:none;" />
              <p style="margin:14px 0 0 0;font:600 11px/1.4 Arial,Helvetica,sans-serif;letter-spacing:1.5px;text-transform:uppercase;color:#c4004e;">
                Chọn lọc điểm đến – Nâng tầm trải nghiệm
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 28px 0 28px;">
              <h1 style="margin:0;font:800 24px/1.3 Arial,Helvetica,sans-serif;color:#211621;">
                Yêu cầu tư vấn mới
              </h1>
              <p style="margin:8px 0 0 0;font:400 14px/1.6 Arial,Helvetica,sans-serif;color:#6e5c68;">
                Mã yêu cầu <strong style="color:#211621;">#${escapeHtml(lead.requestId)}</strong><br />
                Tiếp nhận lúc ${escapeHtml(formatDateTimeVietnam(lead.receivedAt))}
              </p>
            </td>
          </tr>

          <!-- Primary actions. Text-only so they work with images blocked. -->
          <tr>
            <td style="padding:22px 28px 0 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${
                    telHref
                      ? `<td style="padding:0 10px 0 0;">
                          <a href="${escapeHtml(telHref)}" style="display:inline-block;background:#e0005a;color:#ffffff;font:700 15px/1 Arial,Helvetica,sans-serif;padding:14px 22px;border-radius:999px;text-decoration:none;">
                            Gọi ${escapeHtml(lead.phone)}
                          </a>
                        </td>`
                      : ""
                  }
                  ${
                    mailHref
                      ? `<td>
                          <a href="${escapeHtml(mailHref)}" style="display:inline-block;background:#ffffff;color:#c4004e;border:1px solid #e6c6d6;font:700 15px/1 Arial,Helvetica,sans-serif;padding:13px 22px;border-radius:999px;text-decoration:none;">
                            Trả lời email
                          </a>
                        </td>`
                      : `<td style="font:400 13px/1.5 Arial,Helvetica,sans-serif;color:#8b7684;">
                          Khách không để lại email — vui lòng gọi điện.
                        </td>`
                  }
                </tr>
              </table>
            </td>
          </tr>

          <!-- Customer details -->
          <tr>
            <td style="padding:26px 28px 0 28px;">
              <h2 style="margin:0 0 4px 0;font:700 13px/1.5 Arial,Helvetica,sans-serif;letter-spacing:1.2px;text-transform:uppercase;color:#6e5c68;">
                Thông tin khách
              </h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                ${row("Họ tên", escapeHtml(lead.fullName))}
                ${row(
                  "Số điện thoại",
                  telHref
                    ? `<a href="${escapeHtml(telHref)}" style="color:#c4004e;text-decoration:none;font-weight:600;">${escapeHtml(lead.phone)}</a>`
                    : escapeHtml(lead.phone),
                )}
                ${row(
                  "Email",
                  mailHref
                    ? `<a href="${escapeHtml(mailHref)}" style="color:#c4004e;text-decoration:none;">${escapeHtml(lead.email ?? "")}</a>`
                    : missing(lead.email),
                )}
                ${row("Tour / điểm đến quan tâm", interestValue)}
                ${row(
                  "Ngày dự kiến",
                  lead.travelDate
                    ? escapeHtml(formatDate(lead.travelDate, "vi"))
                    : `<span style="color:#8b7684;">Chưa xác định</span>`,
                )}
                ${row(
                  "Số người",
                  lead.partySize ? `${lead.partySize} khách` : `<span style="color:#8b7684;">Chưa xác định</span>`,
                  { last: !lead.message },
                )}
                ${row(
                  "Ngôn ngữ khách sử dụng",
                  lead.locale === "en"
                    ? "English (khách điền form tiếng Anh)"
                    : "Tiếng Việt",
                  { last: true },
                )}
              </table>
            </td>
          </tr>

          ${
            lead.message
              ? `<tr>
                  <td style="padding:22px 28px 0 28px;">
                    <h2 style="margin:0 0 8px 0;font:700 13px/1.5 Arial,Helvetica,sans-serif;letter-spacing:1.2px;text-transform:uppercase;color:#6e5c68;">
                      Nội dung khách gửi
                    </h2>
                    <div style="background:#fff4f8;border-left:3px solid #ff5c99;border-radius:8px;padding:14px 16px;font:400 15px/1.7 Arial,Helvetica,sans-serif;color:#211621;white-space:pre-wrap;">${escapeHtml(
                      lead.message,
                    )}</div>
                  </td>
                </tr>`
              : ""
          }

          ${
            sourceHref
              ? `<tr>
                  <td style="padding:20px 28px 0 28px;">
                    <p style="margin:0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#6e5c68;">
                      Trang gửi yêu cầu:
                      <a href="${escapeHtml(sourceHref)}" style="color:#c4004e;">${escapeHtml(sourceHref)}</a>
                    </p>
                    ${
                      lead.utm?.source || lead.utm?.campaign
                        ? `<p style="margin:6px 0 0 0;font:400 13px/1.6 Arial,Helvetica,sans-serif;color:#8b7684;">
                            Nguồn: ${escapeHtml([lead.utm?.source, lead.utm?.medium, lead.utm?.campaign].filter(Boolean).join(" / "))}
                          </p>`
                        : ""
                    }
                  </td>
                </tr>`
              : ""
          }

          <tr>
            <td style="padding:26px 28px 28px 28px;">
              <p style="margin:0;font:400 12px/1.7 Arial,Helvetica,sans-serif;color:#8b7684;border-top:1px solid #f2dde7;padding-top:16px;">
                Đây là thông báo tự động nội bộ từ website ${escapeHtml(siteConfig.name)}.
                Vui lòng không chuyển tiếp ra ngoài. Thông tin khách hàng chỉ dùng để liên hệ tư vấn.
              </p>
            </td>
          </tr>

        </table>

        <p style="margin:16px 0 0 0;font:400 11px/1.6 Arial,Helvetica,sans-serif;color:#8b7684;text-align:center;">
          ${escapeHtml(siteConfig.name)} · ${escapeHtml(siteConfig.contact.email)}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildLeadNotificationText(context: LeadNotificationContext): string {
  const { lead, tourTitle, sourceUrl, tourUrl } = context;

  const tourHref = tourUrl && isSafeSiteHref(tourUrl) ? tourUrl : null;
  const sourceHref = sourceUrl && isSafeSiteHref(sourceUrl) ? sourceUrl : null;

  const lines = [
    "SEA TRIP TRAVEL",
    "CHỌN LỌC ĐIỂM ĐẾN – NÂNG TẦM TRẢI NGHIỆM",
    "",
    "YÊU CẦU TƯ VẤN MỚI",
    `Mã yêu cầu: #${lead.requestId}`,
    `Tiếp nhận lúc: ${formatDateTimeVietnam(lead.receivedAt)}`,
    "",
    "-- THÔNG TIN KHÁCH --",
    `Họ tên: ${lead.fullName}`,
    `Số điện thoại: ${lead.phone}`,
    `Email: ${lead.email ?? "(khách không cung cấp)"}`,
    `Tour / điểm đến quan tâm: ${tourTitle ?? lead.interest ?? "(chưa xác định)"}`,
    `Ngày dự kiến: ${lead.travelDate ? formatDate(lead.travelDate, "vi") : "(chưa xác định)"}`,
    `Số người: ${lead.partySize ?? "(chưa xác định)"}`,
    `Ngôn ngữ khách sử dụng: ${lead.locale === "en" ? "English" : "Tiếng Việt"}`,
  ];

  if (tourHref) lines.push(`Trang tour: ${tourHref}`);

  if (lead.message) {
    lines.push("", "-- NỘI DUNG KHÁCH GỬI --", lead.message);
  }

  if (sourceHref) {
    lines.push("", `Trang gửi yêu cầu: ${sourceHref}`);
    if (lead.utm?.source || lead.utm?.campaign) {
      lines.push(
        `Nguồn: ${[lead.utm?.source, lead.utm?.medium, lead.utm?.campaign].filter(Boolean).join(" / ")}`,
      );
    }
  }

  lines.push(
    "",
    "--",
    `Thông báo tự động nội bộ từ website ${siteConfig.name}.`,
    "Vui lòng không chuyển tiếp ra ngoài.",
  );

  return lines.join("\n");
}

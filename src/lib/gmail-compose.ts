import { isValidEmailAddress } from "./email-address";

/**
 * Gmail compose links.
 *
 * Sales replies from their own Gmail account: the website only opens a draft,
 * it never sends mail and never asks for Gmail credentials or OAuth access.
 * These helpers are pure so the admin card and the sales notification email
 * build byte-identical URLs, and so the encoding rules can be unit tested.
 */

const GMAIL_COMPOSE_ENDPOINT = "https://mail.google.com/mail/";
const MAX_SUBJECT_LENGTH = 180;
const MAX_BODY_LENGTH = 4000;

export type GmailComposeDraft = {
  to: string;
  subject: string;
  body: string;
};

export type LeadReplyDraftInput = {
  fullName?: string | null;
  /** Human tour title resolved server-side. Missing ⇒ generic subject. */
  tourTitle?: string | null;
};

export type LeadReplyDraft = {
  subject: string;
  body: string;
};

/** Collapse line breaks and repeated spaces so a value can sit in a subject. */
function singleLine(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Subject + opening message for a reply to a consultation request.
 *
 * Deliberately built from only the customer's name and the public tour title:
 * internal notes, request ids and other admin-only fields never enter the URL.
 */
export function buildLeadReplyDraft(
  input: LeadReplyDraftInput = {},
): LeadReplyDraft {
  const name = singleLine(input.fullName);
  const tour = singleLine(input.tourTitle);
  const subject = clip(
    `Sea Trip Travel – Tư vấn ${tour || "chuyến đi"}`,
    MAX_SUBJECT_LENGTH,
  );
  const body = [
    name ? `Chào ${name},` : "Chào anh/chị,",
    "",
    "Cảm ơn anh/chị đã gửi yêu cầu tư vấn tới Sea Trip Travel.",
    tour
      ? `Sea Trip Travel đã nhận được yêu cầu tư vấn tour “${tour}” của anh/chị.`
      : "Sea Trip Travel đã nhận được yêu cầu tư vấn của anh/chị.",
    "",
    "Anh/chị cho Sea Trip Travel biết thêm ngày khởi hành dự kiến và số người đi để được tư vấn chi tiết nhé?",
    "",
    "Trân trọng,",
    "Sea Trip Travel",
  ].join("\n");

  return { subject, body: clip(body, MAX_BODY_LENGTH) };
}

/**
 * Build a Gmail web-compose URL, or `null` when the recipient is unusable.
 *
 * Every parameter is percent-encoded with `encodeURIComponent`, so Vietnamese
 * text, newlines and reserved characters (`&`, `+`, `?`, `#`) stay inside their
 * own value instead of becoming extra query parameters.
 */
export function buildGmailComposeUrl(
  draft: GmailComposeDraft,
): string | null {
  const to = draft.to.trim();
  if (!isValidEmailAddress(to)) return null;

  const query = [
    ["view", "cm"],
    ["fs", "1"],
    ["to", to],
    ["su", singleLine(draft.subject)],
    ["body", draft.body],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  return `${GMAIL_COMPOSE_ENDPOINT}?${query}`;
}

/** Convenience wrapper used by the admin card and the notification email. */
export function buildLeadGmailComposeHref(
  input: LeadReplyDraftInput & { email?: string | null },
): string | null {
  const { subject, body } = buildLeadReplyDraft(input);
  return buildGmailComposeUrl({ to: input.email ?? "", subject, body });
}

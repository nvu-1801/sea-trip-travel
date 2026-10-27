import { persistLead, markMail } from "@/server/cms/leads";
import "server-only";

import { createHash, randomUUID } from "node:crypto";
import {
  LEAD_LIMITS,
  leadInputSchema,
  normalizePhone,
  type ContactLead,
  type LeadErrorCode,
  type LeadInput,
  type LeadResponse,
} from "@/domain/lead";
import { siteConfig } from "@/config/runtime-site";
import { getTourBySlug } from "@/lib/data/tours";
import { getMailer } from "@/server/email/mailer";
import {
  buildLeadNotificationHtml,
  buildLeadNotificationText,
  buildLeadSubject,
} from "@/server/email/templates/lead-notification";
import { safeSiteUrl } from "@/lib/sanitize";
import { getLeadStore } from "./store";
import { getRateLimiter } from "./rate-limit";

/**
 * Lead intake service.
 *
 * The whole flow in one place: validate → anti-abuse → build → send → respond.
 * The route handler stays a thin transport shim.
 *
 * What "success" means here: the message was handed to the mail transport and
 * the transport ACCEPTED it. It does not prove delivery to the inbox. The UI
 * copy therefore says "đã tiếp nhận", never "đã gửi thành công".
 */

export type SubmitLeadResult = {
  status: number;
  response: LeadResponse;
};

export type SubmitLeadContext = {
  body: unknown;
  ip?: string;
  /** Idempotency cache is keyed on this, never on PII. */
  userAgent?: string;
};

/**
 * Idempotency.
 *
 * Stored in the configured `LeadStore`, so it works across instances when a
 * shared store is configured. The flow is check → send → remember: a retry after
 * a timeout, or a second click that slipped past the button's disabled state,
 * returns the original response instead of sending a second email.
 *
 * Residual gap, stated plainly: two requests carrying the SAME key that arrive
 * truly concurrently can both pass the check before either writes. That window is
 * bounded client-side (disabled control + in-flight ref) and by the rate limiter.
 * Closing it properly needs a claim-then-send protocol with a compensating
 * delete, which is more machinery than this form justifies.
 */
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;
const idempotencyKeyFor = (key: string) => `lead:idem:${key}`;

async function recallSubmission(key: string): Promise<SubmitLeadResult | null> {
  const raw = await getLeadStore().get(idempotencyKeyFor(key));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SubmitLeadResult;
  } catch {
    return null;
  }
}

async function rememberSubmission(
  key: string,
  result: SubmitLeadResult,
): Promise<void> {
  await getLeadStore().setIfAbsent(
    idempotencyKeyFor(key),
    JSON.stringify(result),
    IDEMPOTENCY_TTL_MS,
  );
}

/** Salted, non-reversible client fingerprint used only as a rate-limit key. */
function clientKey(
  ip: string | undefined,
  userAgent: string | undefined,
): string {
  const salt = process.env.LEAD_HASH_SALT ?? "sea-trip-travel-local-salt";
  return createHash("sha256")
    .update(`${salt}|${ip ?? "unknown"}|${userAgent ?? "unknown"}`)
    .digest("hex")
    .slice(0, 32);
}

/** `STT-YYYYMMDD-XXXX`, date taken in Vietnam time. */
function buildRequestId(now: Date): string {
  const datePart = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replace(/-/g, "");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `STT-${datePart}-${suffix}`;
}

function fail(
  status: number,
  code: LeadErrorCode,
  message: string,
  extra?: {
    fieldErrors?: Record<string, string[]>;
    requestId?: string;
    retryAfterSeconds?: number;
  },
): SubmitLeadResult {
  return {
    status,
    response: { ok: false, error: { code, message, ...extra } },
  };
}

/** Map Zod issues to `{ fieldName: [message] }`. */
function fieldErrorsFrom(
  issues: readonly { path: PropertyKey[]; message: string }[],
) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }
  return fieldErrors;
}

function salesRecipients(): string[] {
  const configured = (process.env.SALES_RECIPIENTS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value));
  if (configured.length > 0) return configured;
  // Fall back to the public contact address so a misconfiguration is obvious
  // rather than silently dropping leads.
  return [siteConfig.contact.email];
}

function mailFrom(): string {
  const name = process.env.MAIL_FROM_NAME ?? siteConfig.name;
  const address =
    process.env.MAIL_FROM_EMAIL ?? `no-reply@${hostnameOf(siteConfig.url)}`;
  return `${name} <${address}>`;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
}

export async function submitLead(
  context: SubmitLeadContext,
): Promise<SubmitLeadResult> {
  // --- 1. Validate ---------------------------------------------------------
  const parsed = leadInputSchema.safeParse(context.body);

  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error.issues);

    // Honeypot tripped. Respond exactly like a success so automated clients get
    // no signal, but send nothing and record the event.
    if (Object.keys(fieldErrors).includes("company")) {
      console.warn(
        "[lead] honeypot triggered — request dropped, no email sent",
      );
      return {
        status: 200,
        response: {
          ok: true,
          requestId: buildRequestId(new Date()),
          status: "accepted",
          receivedAt: new Date().toISOString(),
        },
      };
    }

    return fail(
      400,
      "VALIDATION_ERROR",
      "Vui lòng kiểm tra lại các thông tin đã nhập.",
      {
        fieldErrors,
      },
    );
  }

  const input: LeadInput = parsed.data;

  // --- 2. Idempotency ------------------------------------------------------
  const idempotencyKey = input.submissionId
    ? `${clientKey(context.ip, context.userAgent)}:${input.submissionId}`
    : null;

  if (idempotencyKey) {
    const previous = await recallSubmission(idempotencyKey);
    if (previous) {
      console.info(
        "[lead] duplicate submission ignored (idempotency key reuse)",
      );
      return previous;
    }
  }

  // --- 3. Anti-abuse -------------------------------------------------------
  // Honeypot already cleared above. Layer: rate limit + payload cap (route).
  const limiter = getRateLimiter(
    LEAD_LIMITS.rateLimit,
    LEAD_LIMITS.rateLimitWindowMs,
  );
  const decision = await limiter.check(
    clientKey(context.ip, context.userAgent),
  );
  if (!decision.allowed) {
    return fail(
      429,
      "RATE_LIMITED",
      "Bạn đã gửi khá nhiều yêu cầu. Vui lòng thử lại sau hoặc gọi hotline.",
      { retryAfterSeconds: decision.retryAfterSeconds },
    );
  }

  // --- 4. Normalise --------------------------------------------------------
  const now = new Date();
  const requestId = buildRequestId(now);

  const tour = input.tourSlug
    ? getTourBySlug(input.tourSlug, input.locale)
    : undefined;
  const lead: ContactLead = {
    requestId,
    receivedAt: now.toISOString(),
    fullName: input.fullName,
    phone: normalizePhone(input.phone),
    ...(input.email ? { email: input.email } : {}),
    ...(input.interest ? { interest: input.interest } : {}),
    ...(tour ? { tourSlug: tour.slug } : {}),
    ...(input.travelDate ? { travelDate: input.travelDate } : {}),
    ...(input.partySize ? { partySize: input.partySize } : {}),
    ...(input.message ? { message: input.message } : {}),
    ...(input.sourcePage ? { sourcePage: input.sourcePage } : {}),
    locale: input.locale,
    ...(input.utm ? { utm: input.utm } : {}),
  };

  // --- 5. Build + send -----------------------------------------------------
  const stored = process.env.CMS_ENABLED === "1";
  if (stored) persistLead(requestId, lead);
  const accepted = async (): Promise<SubmitLeadResult> => {
    const response: SubmitLeadResult = {
      status: 200,
      response: {
        ok: true,
        requestId,
        status: "accepted",
        receivedAt: lead.receivedAt,
      },
    };
    if (idempotencyKey) await rememberSubmission(idempotencyKey, response);
    return response;
  };
  const mailer = getMailer();

  if (!mailer.isConfigured()) {
    if (stored) {
      markMail(requestId, "pending");
      return accepted();
    }
    console.error(
      "[lead] mail transport not configured — refusing to report success",
    );
    return fail(
      503,
      "MAIL_NOT_CONFIGURED",
      `Hệ thống gửi email đang tạm thời chưa sẵn sàng. Vui lòng gọi hotline ${siteConfig.contact.hotline} để được tư vấn ngay.`,
      { requestId },
    );
  }

  const sourceUrl = safeSiteUrl(input.sourcePage) ?? undefined;
  const tourUrl = tour
    ? (safeSiteUrl(`/tour/${tour.slug}`) ?? undefined)
    : undefined;

  const emailContext = {
    lead,
    tourTitle: tour?.title,
    sourceUrl,
    tourUrl,
  };

  let result;
  try {
    result = await mailer.send({
      to: salesRecipients(),
      from: mailFrom(),
      // Only ever set from the validated customer address.
      ...(lead.email ? { replyTo: lead.email } : {}),
      subject: buildLeadSubject(emailContext),
      html: buildLeadNotificationHtml(emailContext),
      text: buildLeadNotificationText(emailContext),
    });
  } catch (error) {
    // Never log the payload — it contains customer PII.
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error(`[lead] unexpected mailer error: ${detail}`);
    return fail(
      500,
      "INTERNAL_ERROR",
      "Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại.",
      {
        requestId,
      },
    );
  }

  if (!result.ok) {
    if (stored) {
      markMail(requestId, "failed");
      return accepted();
    }
    const code: LeadErrorCode =
      result.reason === "NOT_CONFIGURED"
        ? "MAIL_NOT_CONFIGURED"
        : "MAIL_DELIVERY_FAILED";
    return fail(
      code === "MAIL_NOT_CONFIGURED" ? 503 : 502,
      code,
      code === "MAIL_NOT_CONFIGURED"
        ? `Hệ thống gửi email đang tạm thời chưa sẵn sàng. Vui lòng gọi hotline ${siteConfig.contact.hotline}.`
        : `Chưa gửi được yêu cầu tới bộ phận tư vấn. Vui lòng thử lại, hoặc gọi hotline ${siteConfig.contact.hotline}.`,
      { requestId },
    );
  }

  console.info(
    `[lead] delivered ${requestId} via ${result.transport} (recipients=${salesRecipients().length})`,
  );
  // Keep the admin badge truthful and stop an accidental duplicate resend.
  if (stored) markMail(requestId, "sent");

  const success: SubmitLeadResult = {
    status: 200,
    response: {
      ok: true,
      requestId,
      status: "accepted",
      receivedAt: lead.receivedAt,
    },
  };

  if (idempotencyKey) await rememberSubmission(idempotencyKey, success);
  return success;
}

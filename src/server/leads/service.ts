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
  type LeadNotificationContext,
} from "@/server/email/templates/lead-notification";
import { safeSiteUrl } from "@/lib/sanitize";
import { hotelSettings } from "@/server/cms/store";
import { quoteHotelRequest } from "@/server/hotels/public";
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

/**
 * Validate and snapshot a hotel consultation.
 *
 * The hotel, its published rooms, their prices and the tour relation are all
 * re-read here. A client cannot name another hotel's room, a draft hotel or a
 * price of its own.
 */
function buildHotelLead(
  input: LeadInput,
  requestId: string,
  now: Date,
): { ok: true; lead: ContactLead; hotelSummary: NonNullable<LeadNotificationContext["hotelSummary"]> } | {
  ok: false;
  fieldErrors: Record<string, string[]>;
  message: string;
} {
  const stay = input.hotel;
  if (!stay)
    return {
      ok: false,
      fieldErrors: { hotel: ["Thiếu thông tin lưu trú"] },
      message: "Thiếu thông tin lưu trú.",
    };

  const flexible = stay.datesFlexible || !stay.checkIn || !stay.checkOut;
  const checkIn = flexible ? "" : (stay.checkIn ?? "");
  const checkOut = flexible ? "" : (stay.checkOut ?? "");

  const result = quoteHotelRequest(input.locale, {
    hotelId: stay.hotelId,
    rooms: stay.rooms,
    checkIn,
    checkOut,
    tourSlug: stay.tourHelp ? null : (stay.tourSlug ?? null),
  });
  if (!result)
    return {
      ok: false,
      fieldErrors: {
        hotel: [
          "Khách sạn hoặc hạng phòng không còn nhận yêu cầu. Vui lòng chọn lại.",
        ],
      },
      message: "Khách sạn hoặc hạng phòng không còn nhận yêu cầu.",
    };
  if (!stay.tourHelp && stay.tourSlug && !result.tour)
    return {
      ok: false,
      fieldErrors: { tourSlug: ["Tour đã chọn không còn phù hợp"] },
      message: "Tour đã chọn không còn phù hợp.",
    };

  const availabilityText: Record<string, string> = {};
  for (const [roomId, value] of Object.entries(result.availability)) {
    availabilityText[roomId] =
      value.kind === "available"
        ? `có thể còn ${value.rooms} phòng (tham khảo)`
        : value.kind === "closed"
          ? "không còn phòng cho kỳ này"
          : value.kind === "on_request"
            ? "cần kiểm tra với đối tác"
            : "chưa đủ dữ liệu";
  }

  const capacity = result.rooms.reduce(
    (sum, room) => sum + room.maxOccupancy * room.quantity,
    0,
  );
  const guests = stay.adults + stay.children;
  const needsReview = guests > capacity || result.quote.status !== "quoted";

  const roomsLabel = result.rooms
    .map((room) => `${room.name} × ${room.quantity}`)
    .join(", ");
  const datesLabel = flexible
    ? "Chưa chốt ngày"
    : `${checkIn} → ${checkOut} (${result.quote.nights} đêm)`;
  const priceLabel = result.quote.includedByTour
    ? "Đã bao gồm trong tour"
    : result.quote.lodgingTotal !== null && result.quote.status === "quoted"
      ? `${new Intl.NumberFormat("vi-VN").format(result.quote.lodgingTotal)} ₫ (tham khảo)`
      : "Cần báo giá";

  const tourTitle = result.tour?.title ?? null;
  const hotelUrl = safeSiteUrl(`/khach-san/${result.hotelSlug}`) ?? undefined;

  const lead: ContactLead = {
    requestId,
    receivedAt: now.toISOString(),
    kind: "hotel",
    fullName: input.fullName,
    phone: normalizePhone(input.phone),
    ...(input.email ? { email: input.email } : {}),
    interest: result.hotelName,
    ...(result.tour ? { tourSlug: result.tour.slug } : {}),
    ...(checkIn ? { travelDate: checkIn } : {}),
    partySize: guests,
    ...(input.message ? { message: input.message } : {}),
    ...(input.sourcePage ? { sourcePage: input.sourcePage } : {}),
    locale: input.locale,
    ...(input.utm ? { utm: input.utm } : {}),
    hotel: {
      hotelId: stay.hotelId,
      hotelName: result.hotelName,
      hotelSlug: result.hotelSlug,
      rooms: result.rooms.map((room) => ({
        roomId: room.id,
        name: room.name,
        quantity: room.quantity,
      })),
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      nights: flexible ? 0 : result.quote.nights,
      datesFlexible: flexible,
      adults: stay.adults,
      children: stay.children,
      childrenAges: stay.childrenAges,
      tourSlug: result.tour?.slug ?? null,
      tourTitle,
      tourRelation: result.tour?.relation ?? null,
      availability: availabilityText,
      quote: {
        status: flexible ? "needs_quote" : result.quote.status,
        reasons: flexible
          ? [...new Set([...result.quote.reasons, "flexible_dates"])].slice(0, 10)
          : result.quote.reasons,
        lodgingTotal: flexible ? null : result.quote.lodgingTotal,
        includedByTour: result.quote.includedByTour,
        capturedAt: now.toISOString(),
      },
      needsReview,
    },
  };

  const rows = [
    { label: "Khách sạn", value: result.hotelName },
    { label: "Hạng phòng", value: roomsLabel },
    { label: "Ngày lưu trú", value: datesLabel },
    {
      label: "Khách",
      value:
        `${stay.adults} người lớn` +
        (stay.children > 0
          ? `, ${stay.children} trẻ em${
              stay.childrenAges.length > 0
                ? ` (${stay.childrenAges.join(", ")} tuổi)`
                : ""
            }`
          : ""),
    },
    {
      label: "Tình trạng tham khảo",
      value:
        result.rooms
          .map((room) => `${room.name}: ${availabilityText[room.id] ?? "chưa rõ"}`)
          .join(" · ") || "Chưa kiểm tra",
    },
    { label: "Giá tham khảo", value: priceLabel },
    ...(tourTitle
      ? [
          {
            label: "Tour liên quan",
            value:
              result.tour?.relation === "included"
                ? `${tourTitle} — đã bao gồm phòng`
                : result.tour?.relation === "upgrade"
                  ? `${tourTitle} — cần báo chênh lệch nâng hạng`
                  : `${tourTitle} — báo giá lưu trú riêng`,
          },
        ]
      : [{ label: "Tour", value: "Khách nhờ tư vấn tour phù hợp" }]),
    ...(needsReview
      ? [
          {
            label: "Cần lưu ý",
            value:
              guests > capacity
                ? "Số khách vượt sức chứa đã công bố — tư vấn phương án khác."
                : "Giá/tình trạng chưa đủ — cần kiểm tra và báo giá.",
          },
        ]
      : []),
  ];

  return {
    ok: true,
    lead,
    hotelSummary: {
      name: result.hotelName,
      rows,
      ...(hotelUrl ? { url: hotelUrl } : {}),
    },
  };
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

  // A hotel request is refused when the module is off, before any write.
  // Tour leads keep working in the same deployment.
  if (input.kind === "hotel" && !hotelSettings().enabled)
    return fail(
      403,
      "MODULE_DISABLED",
      "Module khách sạn đang tạm đóng. Vui lòng gọi hotline để được tư vấn.",
    );

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

  let lead: ContactLead;
  let hotelSummary: LeadNotificationContext["hotelSummary"];
  let persistMeta: {
    kind: string;
    hotelId: string | null;
    checkIn: string | null;
    checkOut: string | null;
  } = { kind: "tour", hotelId: null, checkIn: null, checkOut: null };

  if (input.kind === "hotel") {
    const built = buildHotelLead(input, requestId, now);
    if (!built.ok)
      return fail(400, "VALIDATION_ERROR", built.message, {
        fieldErrors: built.fieldErrors,
        requestId,
      });
    lead = built.lead;
    hotelSummary = built.hotelSummary;
    persistMeta = {
      kind: "hotel",
      hotelId: built.lead.hotel?.hotelId ?? null,
      checkIn: built.lead.hotel?.checkIn ?? null,
      checkOut: built.lead.hotel?.checkOut ?? null,
    };
  } else {
    lead = {
      requestId,
      receivedAt: now.toISOString(),
      kind: "tour",
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
  }

  // --- 5. Build + send -----------------------------------------------------
  const stored = process.env.CMS_ENABLED === "1";
  if (stored) persistLead(requestId, lead, persistMeta);
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
  const effectiveTour = lead.hotel?.tourSlug
    ? getTourBySlug(lead.hotel.tourSlug, input.locale)
    : tour;
  const tourUrl = effectiveTour
    ? (safeSiteUrl(`/tour/${effectiveTour.slug}`) ?? undefined)
    : undefined;

  const emailContext = {
    lead,
    tourTitle: lead.hotel?.tourTitle ?? effectiveTour?.title,
    sourceUrl,
    tourUrl,
    ...(hotelSummary ? { hotelSummary } : {}),
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

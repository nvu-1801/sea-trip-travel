import { z } from "zod";
import { contentLocaleSchema } from "./common";

/**
 * The consultation-request ("lead") contract.
 *
 * This schema is the *single* validation source shared by:
 *   - the client form (react-hook-form-free, plain controlled inputs)
 *   - the `POST /api/leads` route handler
 *   - the email template builder
 * so client and server can never disagree about what "valid" means.
 */

/** Hard upper bounds — also used to cap the request payload size. */
export const LEAD_LIMITS = {
  fullName: 80,
  phone: 20,
  email: 160,
  interest: 160,
  message: 2000,
  sourcePage: 300,
  tourSlug: 120,
  utm: 120,
  /** Whole-body cap, enforced before Zod parsing. */
  maxBodyBytes: 16 * 1024,
  /** Max leads accepted from one client per window. */
  rateLimit: 5,
  rateLimitWindowMs: 10 * 60 * 1000,
} as const;

/** Trim, and treat "" as "not provided" so optional fields behave naturally. */
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max: number) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().max(max, `Nội dung quá dài (tối đa ${max} ký tự)`).optional(),
  );

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z
    .email("Email chưa hợp lệ")
    .max(LEAD_LIMITS.email, `Email quá dài (tối đa ${LEAD_LIMITS.email} ký tự)`)
    .optional(),
);

const optionalPartySize = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Số người phải là số" })
    .int("Số người phải là số nguyên")
    .min(1, "Số người tối thiểu là 1")
    .max(60, "Vui lòng liên hệ trực tiếp cho nhóm trên 60 người")
    .optional(),
);

/** Strip visual separators so the structure underneath can be checked. */
function cleanPhone(input: string): string {
  return input.replace(/[\s.\-()]/g, "");
}

/**
 * Vietnamese phone structure, checked after normalising the country code:
 * mobile `0[3|5|7|8|9]` + 8 digits, or landline `02` + 8–9 digits.
 *
 * Length alone is not enough — "12345678" and "0000000000" are the right
 * length but have no valid prefix, so they are junk. This is what stops them.
 */
export function isVietnamPhone(input: string): boolean {
  const cleaned = cleanPhone(input);
  const national = cleaned.startsWith("+84")
    ? `0${cleaned.slice(3)}`
    : cleaned.startsWith("84") &&
        (cleaned.length === 11 || cleaned.length === 12)
      ? `0${cleaned.slice(2)}`
      : cleaned;
  return /^(0[35789]\d{8}|02\d{8,9})$/.test(national);
}

/** Accepts `0987 654 321`, `+84 987 654 321`, `0987.654.321`… */
export const phoneSchema = z
  .string({ error: "Vui lòng nhập số điện thoại" })
  .trim()
  .min(8, "Vui lòng nhập số điện thoại")
  .max(LEAD_LIMITS.phone, "Số điện thoại quá dài")
  .regex(/^[+0-9][0-9\s.\-()]{7,19}$/, "Số điện thoại chưa hợp lệ")
  .refine(
    isVietnamPhone,
    "Số điện thoại chưa đúng — vui lòng nhập số di động 10 số (ví dụ 0987 654 321)",
  );

/** Canonicalise a valid phone number to `0xxxxxxxxx`. */
export function normalizePhone(input: string): string {
  const cleaned = input.replace(/[\s.\-()]/g, "");
  if (cleaned.startsWith("+84")) return `0${cleaned.slice(3)}`;
  if (cleaned.startsWith("84") && cleaned.length === 11) return `0${cleaned.slice(2)}`;
  return cleaned;
}

/**
 * Limited UTM capture — only the five standard keys, each length-capped.
 * Anything else in the query string is discarded rather than stored.
 */
export const utmSchema = z
  .object({
    source: z.string().trim().max(LEAD_LIMITS.utm).optional(),
    medium: z.string().trim().max(LEAD_LIMITS.utm).optional(),
    campaign: z.string().trim().max(LEAD_LIMITS.utm).optional(),
    content: z.string().trim().max(LEAD_LIMITS.utm).optional(),
    term: z.string().trim().max(LEAD_LIMITS.utm).optional(),
  })
  .partial()
  .optional();

export type UtmParams = z.infer<typeof utmSchema>;

/** What the browser is allowed to POST. */
export const leadInputSchema = z.object({
  fullName: z
    .string({ error: "Vui lòng nhập họ tên" })
    .trim()
    .min(2, "Vui lòng nhập họ tên (ít nhất 2 ký tự)")
    .max(LEAD_LIMITS.fullName, `Họ tên quá dài (tối đa ${LEAD_LIMITS.fullName} ký tự)`),
  phone: phoneSchema,
  /** Optional — sales can still call back when no email is given. */
  email: optionalEmail,
  /** Free-text tour/destination of interest; pre-filled on a tour page. */
  interest: optionalText(LEAD_LIMITS.interest),
  /** Slug of the tour being viewed, when the form lives on a tour page. */
  tourSlug: optionalText(LEAD_LIMITS.tourSlug),
  /** `YYYY-MM-DD`. Kept as a plain string; past dates are allowed. */
  travelDate: z.preprocess(
    emptyToUndefined,
    z.iso.date("Ngày dự kiến chưa hợp lệ").optional(),
  ),
  partySize: optionalPartySize,
  message: optionalText(LEAD_LIMITS.message),
  /** Explicit, affirmative consent to being contacted. */
  consent: z.literal(true, {
    message: "Vui lòng xác nhận đã đọc chính sách xử lý thông tin liên hệ",
  }),
  /** Honeypot. Must stay empty; filled ⇒ treated as a bot. */
  company: z.string().max(0, "spam").optional().default(""),
  /**
   * Idempotency key minted by the client for one form submission.
   * Lets the server return the original result on a retry instead of
   * sending a second email.
   */
  submissionId: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(64)
      .regex(/^[A-Za-z0-9-]+$/, "Mã gửi không hợp lệ")
      .optional(),
  ),
  /** Page the request was sent from, for the sales email. */
  sourcePage: optionalText(LEAD_LIMITS.sourcePage),
  /**
   * Language the visitor filled the form in. Validated server-side and stored
   * with the lead so sales knows which language to reply in, and so server-side
   * copy (where any remains) can be rendered in the right language.
   */
  locale: contentLocaleSchema.default("vi"),
  utm: utmSchema,
});

export type LeadInput = z.infer<typeof leadInputSchema>;

/** What the server stores/forwards after validation + normalisation. */
export const contactLeadSchema = z.object({
  requestId: z.string().min(1),
  receivedAt: z.iso.datetime(),
  fullName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().optional(),
  interest: z.string().optional(),
  tourSlug: z.string().optional(),
  travelDate: z.string().optional(),
  partySize: z.number().int().positive().optional(),
  message: z.string().optional(),
  sourcePage: z.string().optional(),
  /** Locale the visitor used. Drives the "customer language" row in the sales email. */
  locale: contentLocaleSchema.default("vi"),
  utm: utmSchema,
});

export type ContactLead = z.infer<typeof contactLeadSchema>;

/** Machine-readable error codes returned by `POST /api/leads`. */
export const LEAD_ERROR_CODES = [
  "VALIDATION_ERROR",
  "PAYLOAD_TOO_LARGE",
  "SPAM_REJECTED",
  "RATE_LIMITED",
  "MAIL_DELIVERY_FAILED",
  "MAIL_NOT_CONFIGURED",
  "INTERNAL_ERROR",
] as const;

export type LeadErrorCode = (typeof LEAD_ERROR_CODES)[number];

export type LeadSuccessResponse = {
  ok: true;
  requestId: string;
  /** `accepted` = handed to the mail transport. See docs/lead-flow.md. */
  status: "accepted";
  receivedAt: string;
};

export type LeadErrorResponse = {
  ok: false;
  error: {
    code: LeadErrorCode;
    message: string;
    /** Per-field messages keyed by field name; only for VALIDATION_ERROR. */
    fieldErrors?: Record<string, string[]>;
    requestId?: string;
    retryAfterSeconds?: number;
  };
};

export type LeadResponse = LeadSuccessResponse | LeadErrorResponse;

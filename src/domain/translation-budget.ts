/**
 * Free-tier guard for the Studio translation button.
 *
 * Google Cloud Translation Basic bills per character sent to the general
 * model, and the monthly free credit (500.000 characters) is shared between
 * Basic and Advanced. A budget alert only notifies, so the app keeps its own
 * counters and stops *before* the provider quota is reached instead of
 * discovering the overage on the invoice.
 *
 * Counters are keyed by the Vietnam calendar day/month because the owner lives
 * in that time zone; the provider resets its own daily quota at midnight
 * Pacific Time, so keep `TRANSLATION_DAILY_CHAR_LIMIT` slightly below the
 * Google quota (see `docs/ADMIN-TRANSLATION.md`).
 */

export const TRANSLATION_BUDGET_DEFAULTS = {
  /** Matches the Google quota "characters sent to general model per day". */
  dailyChars: 15_000,
  /** Hard ceiling below the 500.000 free characters per calendar month. */
  monthlyChars: 450_000,
} as const;

/** Sanity ceiling so a typo in the env file cannot disable the guard. */
const MAX_LIMIT = 20_000_000;

/** Asia/Ho_Chi_Minh has been a fixed UTC+7 offset since 1975 (no DST). */
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;

export type TranslationBudgetLimits = {
  /** `0` means unlimited (the provider quota is then the only guard). */
  dailyChars: number;
  /** `0` means unlimited. */
  monthlyChars: number;
};

export type TranslationBudgetUsage = {
  dayChars: number;
  monthChars: number;
};

export type TranslationBudgetDecision = {
  allowed: boolean;
  /** Which counter blocked the request, or `null` when it fits. */
  reason: "day" | "month" | null;
  /** Characters this request would send to the provider. */
  characters: number;
  limits: TranslationBudgetLimits;
  /** Usage after this request when allowed, unchanged usage when blocked. */
  usage: TranslationBudgetUsage;
  /** Characters left after this request; `null` when that limit is off. */
  remaining: { day: number | null; month: number | null };
};

/**
 * `0` disables a limit; anything empty, negative or not numeric falls back to
 * the documented default so a broken env file can never remove the guard.
 */
export function translationBudgetLimit(
  raw: string | number | undefined,
  fallback: number,
): number {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return Math.min(Math.floor(value), MAX_LIMIT);
}

/** Counter keys for the Vietnam calendar day and month of `now`. */
export function translationBudgetPeriods(now: Date = new Date()): {
  day: string;
  month: string;
} {
  const stamp = new Date(now.getTime() + VIETNAM_OFFSET_MS)
    .toISOString()
    .slice(0, 10);
  return { day: `day:${stamp}`, month: `month:${stamp.slice(0, 7)}` };
}

/** Pure decision: no I/O, so the route and the tests share the same rules. */
export function decideTranslationBudget(input: {
  limits: TranslationBudgetLimits;
  usage: TranslationBudgetUsage;
  characters: number;
}): TranslationBudgetDecision {
  const characters = Math.max(0, Math.floor(input.characters));
  const dayLimit = input.limits.dailyChars > 0 ? input.limits.dailyChars : null;
  const monthLimit =
    input.limits.monthlyChars > 0 ? input.limits.monthlyChars : null;

  const reason: TranslationBudgetDecision["reason"] =
    monthLimit !== null && input.usage.monthChars + characters > monthLimit
      ? "month"
      : dayLimit !== null && input.usage.dayChars + characters > dayLimit
        ? "day"
        : null;
  const allowed = reason === null;
  const usage: TranslationBudgetUsage = {
    dayChars: input.usage.dayChars + (allowed ? characters : 0),
    monthChars: input.usage.monthChars + (allowed ? characters : 0),
  };

  return {
    allowed,
    reason,
    characters,
    limits: {
      dailyChars: input.limits.dailyChars,
      monthlyChars: input.limits.monthlyChars,
    },
    usage,
    remaining: {
      day: dayLimit === null ? null : Math.max(0, dayLimit - usage.dayChars),
      month: monthLimit === null ? null : Math.max(0, monthLimit - usage.monthChars),
    },
  };
}

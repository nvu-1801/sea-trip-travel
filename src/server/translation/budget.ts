import "server-only";
import {
  TRANSLATION_BUDGET_DEFAULTS,
  decideTranslationBudget,
  translationBudgetLimit,
  translationBudgetPeriods,
  type TranslationBudgetDecision,
  type TranslationBudgetLimits,
  type TranslationBudgetUsage,
} from "@/domain/translation-budget";
import { db, transaction } from "@/server/cms/db";

/**
 * Persistent character budget for VI → EN translation.
 *
 * The counters live in the CMS SQLite database (the `/app/data` volume on the
 * VPS) so a restart, a redeploy or a second worker cannot reset them. Reads and
 * writes happen inside `BEGIN IMMEDIATE`, so two admins clicking the button at
 * the same time cannot both spend the last characters of the day.
 */

export function translationBudgetLimits(): TranslationBudgetLimits {
  return {
    dailyChars: translationBudgetLimit(
      process.env.TRANSLATION_DAILY_CHAR_LIMIT,
      TRANSLATION_BUDGET_DEFAULTS.dailyChars,
    ),
    monthlyChars: translationBudgetLimit(
      process.env.TRANSLATION_MONTHLY_CHAR_LIMIT,
      TRANSLATION_BUDGET_DEFAULTS.monthlyChars,
    ),
  };
}

function readUsage(periods: { day: string; month: string }): TranslationBudgetUsage {
  const rows = db()
    .prepare("SELECT period,chars FROM translation_usage WHERE period IN (?,?)")
    .all(periods.day, periods.month) as { period: string; chars: number }[];
  const usage: TranslationBudgetUsage = { dayChars: 0, monthChars: 0 };
  for (const row of rows) {
    if (row.period === periods.day) usage.dayChars = Number(row.chars) || 0;
    if (row.period === periods.month) usage.monthChars = Number(row.chars) || 0;
  }
  return usage;
}

function addChars(period: string, characters: number, stamp: string): void {
  db()
    .prepare(
      "INSERT INTO translation_usage(period,chars,updated_at) VALUES(?,?,?) " +
        "ON CONFLICT(period) DO UPDATE SET chars=chars+excluded.chars, updated_at=excluded.updated_at",
    )
    .run(period, characters, stamp);
}

/**
 * Reserves `characters` for this request. Returns the decision instead of
 * throwing so the route owns the HTTP status and the Vietnamese message.
 */
export function consumeTranslationBudget(
  characters: number,
  now: Date = new Date(),
): TranslationBudgetDecision {
  const periods = translationBudgetPeriods(now);
  const limits = translationBudgetLimits();
  return transaction(() => {
    const decision = decideTranslationBudget({
      limits,
      usage: readUsage(periods),
      characters,
    });
    if (!decision.allowed) return decision;
    const stamp = now.toISOString();
    addChars(periods.day, decision.characters, stamp);
    addChars(periods.month, decision.characters, stamp);
    return decision;
  });
}

/**
 * Gives characters back when the provider was never called (missing API key).
 * Provider errors and lost responses are not refunded on purpose: Google may
 * already have billed them, so over-counting is the safe direction.
 */
export function refundTranslationBudget(
  characters: number,
  now: Date = new Date(),
): void {
  const amount = Math.max(0, Math.floor(characters));
  if (amount === 0) return;
  const periods = translationBudgetPeriods(now);
  const stamp = now.toISOString();
  transaction(() => {
    const statement = db().prepare(
      "UPDATE translation_usage SET chars=MAX(0,chars-?), updated_at=? WHERE period=?",
    );
    statement.run(amount, stamp, periods.day);
    statement.run(amount, stamp, periods.month);
  });
}

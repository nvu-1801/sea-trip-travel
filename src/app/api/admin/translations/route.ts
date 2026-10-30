import { requireSession } from "@/server/cms/auth";
import { list } from "@/server/cms/store";
import { handle, reply } from "@/server/cms/http";
import { adminSectionHref } from "@/lib/admin-routes";
import {
  TRANSLATABLE_KINDS,
  TRANSLATABLE_KIND_LABELS,
  recordTranslationCoverage,
  type TranslationQueue,
  type TranslationQueueItem,
  type TranslationQueueSummary,
  type TranslationState,
} from "@/lib/translation-coverage";

/**
 * Read-only translation queue for the Studio.
 *
 * It derives the status from the same `data._en` overlay the public pages read
 * at request time, so there is no second table and no stored status to drift.
 * Saving the record is enough for the next read to reflect the new state.
 */

const STATUS_ORDER: Record<TranslationState, number> = {
  missing: 0,
  partial: 1,
  complete: 2,
};

const HASH_BY_KIND: Partial<Record<string, string>> = {
  tours: "#tour-section-translations",
  destinations: "#destination-section-translations",
};

export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);

    const items: TranslationQueueItem[] = [];
    const byKind = Object.fromEntries(
      TRANSLATABLE_KINDS.map((kind) => [kind, 0]),
    ) as TranslationQueueSummary["byKind"];

    for (const kind of TRANSLATABLE_KINDS) {
      const rows = list(kind);
      byKind[kind] = rows.filter((row) => row.state !== "deleted").length;
      for (const row of rows) {
        if (row.state === "deleted") continue;
        const coverage = recordTranslationCoverage(kind, row.data);
        const title = String(row.data.title ?? row.data.name ?? row.id);
        const slug = String(row.data.slug ?? "");
        const editHref = `${adminSectionHref(kind, {
          id: row.id,
          slug: slug || row.id,
        })}${HASH_BY_KIND[kind] ?? ""}`;
        items.push({
          kind,
          kindLabel: TRANSLATABLE_KIND_LABELS[kind],
          id: row.id,
          slug,
          title,
          state:
            row.state === "published" || row.state === "draft"
              ? row.state
              : "other",
          status: coverage.state,
          required: coverage.required,
          filled: coverage.filled,
          missingFields: coverage.missingFields.slice(0, 12),
          reviewed: row.data._enReviewed === true,
          updatedAt: row.updated_at,
          editHref,
        });
      }
    }

    items.sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        a.title.localeCompare(b.title, "vi") ||
        a.id.localeCompare(b.id),
    );

    const summary: TranslationQueueSummary = {
      total: items.length,
      missing: items.filter((item) => item.status === "missing").length,
      partial: items.filter((item) => item.status === "partial").length,
      complete: items.filter((item) => item.status === "complete").length,
      incomplete: items.filter((item) => item.status !== "complete").length,
      byKind,
    };

    const payload: TranslationQueue = {
      items,
      summary,
      generatedAt: new Date().toISOString(),
    };
    return reply(payload);
  });
}

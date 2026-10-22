/**
 * Fill missing SEO fields for the Quy Nhơn – Phú Yên landing page and tours.
 *
 * Safety rules:
 * - dry-run by default (prints what would change);
 * - only empty/missing `seo.title` or `seo.description` are filled;
 * - an existing title/description written by the owner is never overwritten;
 * - `--apply` saves a draft; `--publish` also publishes that draft.
 *
 * Examples:
 *   npm run seo:apply                 # dry run against CMS_DB_PATH
 *   npm run seo:apply -- --apply      # save drafts
 *   npm run seo:apply -- --apply --publish
 */
import { CATEGORY_SEO, TOUR_SEO } from "@/content/seo";
import { fillSeoFields } from "@/lib/seo-content";
import { list, save } from "@/server/cms/store";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const publish = args.has("--publish");

type SeoDefault = { title: string; description: string };
type Row = { id: string; revision: number; data: Record<string, unknown> };

function processRows(
  collection: "categories" | "tours",
  defaults: Record<string, SeoDefault>,
  keyOf: (row: Row) => string,
) {
  let changed = 0;
  for (const row of list(collection) as Row[]) {
    const fallback = defaults[keyOf(row)];
    if (!fallback) continue;
    const seo = fillSeoFields(row.data.seo, fallback);
    if (!seo) continue;
    changed += 1;
    const name = String(row.data.name ?? row.data.title ?? row.id);
    if (!apply) {
      console.log(`[dry-run] ${collection}/${row.id} (${name})`);
      continue;
    }
    save(
      collection,
      { ...row.data, seo },
      row.revision,
      publish ? "publish" : "save",
    );
    console.log(`[${publish ? "published" : "draft"}] ${collection}/${row.id}`);
  }
  return changed;
}

const categories = processRows(
  "categories",
  CATEGORY_SEO,
  (row) => row.id,
);
const tours = processRows("tours", TOUR_SEO, (row) => String(row.data.slug));

/**
 * The home H1 used to be a brand tagline. Replace only the exact old strings;
 * any copy the owner already edited is left untouched.
 */
const LEGACY_HERO: Record<string, Record<string, string>> = {
  vi: {
    badge: "Du lịch trong nước · Chọn lọc",
    titleLine1: "Chọn lọc điểm đến",
    titleLine2: "nâng tầm trải nghiệm",
    lead: "Đi đúng mùa, ở đúng nơi và đi với nhịp độ của riêng bạn.",
  },
  en: {
    badge: "Vietnam travel · Curated",
    titleLine1: "Curated destinations",
    titleLine2: "elevated experiences",
    lead: "Right season, right place, and a pace that is entirely your own.",
  },
};
const NEW_HERO: Record<string, Record<string, string>> = {
  vi: {
    badge: "Du lịch Quy Nhơn – Phú Yên · Chọn lọc",
    titleLine1: "Du lịch Quy Nhơn",
    titleLine2: "Phú Yên, đi chậm và kỹ",
    lead: "Tour biển Quy Nhơn – Phú Yên, lịch trình rõ ràng và tư vấn theo thời gian của bạn.",
  },
  en: {
    badge: "Quy Nhon – Phu Yen travel · Curated",
    titleLine1: "Quy Nhon & Phu Yen",
    titleLine2: "the coast, at your pace",
    lead: "Selected coastal tours and clear itineraries, with advice around your time.",
  },
};

function processMessages() {
  let changed = 0;
  for (const row of list("messages") as Row[]) {
    const locale = row.id === "en" ? "en" : row.id === "vi" ? "vi" : null;
    if (!locale) continue;
    const data = structuredClone(row.data) as {
      home?: { hero?: Record<string, string> };
    };
    const hero = data.home?.hero;
    if (!hero) continue;
    let next = false;
    for (const [key, oldValue] of Object.entries(LEGACY_HERO[locale])) {
      if (hero[key] === oldValue) {
        hero[key] = NEW_HERO[locale][key];
        next = true;
      }
    }
    if (!next) continue;
    changed += 1;
    if (!apply) {
      console.log(`[dry-run] messages/${locale} (home hero copy)`);
      continue;
    }
    save("messages", data, row.revision, publish ? "publish" : "save");
    console.log(`[${publish ? "published" : "draft"}] messages/${locale}`);
  }
  return changed;
}

const messages = processMessages();

console.log(
  `\n${apply ? "Applied" : "Would apply"} ${categories + tours + messages} change(s). ` +
    (apply
      ? publish
        ? "Drafts were published."
        : "Drafts saved — review and publish in Studio."
      : "Re-run with --apply to write drafts."),
);

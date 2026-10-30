/**
 * Translation coverage for the CMS records that carry an `_en` overlay.
 *
 * The Studio stores translations *inside* the source record (`data._en`) rather
 * than in a separate table. This module is the single definition of "what counts
 * as translated" for the admin translation tracker and the public draft banner.
 *
 * It is deliberately browser-safe: the Studio bundle imports it directly, so no
 * `server-only` or Zod dependency may creep in here.
 *
 * Rules:
 * - `NULL`, `""` and whitespace-only strings are missing.
 * - A field only has to exist in English when the Vietnamese source carries it.
 *   Optional fields stay optional, so a translation is never blocked by a field
 *   the page does not show.
 * - The editor pre-fills a new overlay with Vietnamese copy. Text that is still
 *   identical to a Vietnamese string (and contains Vietnamese diacritics) is
 *   treated as untranslated, otherwise clicking "+ Thêm bản dịch" alone would
 *   mark the record as finished.
 * - A *resolved* public record already has the overlay applied, so the public
 *   check skips the copy comparison and asks only "does `_en` carry every field
 *   the resolved page needs?". Missing overlay fields still fall back to
 *   Vietnamese, so they remain incomplete.
 */

export const TRANSLATABLE_KINDS = [
  "tours",
  "articles",
  "categories",
  "destinations",
] as const;

export type TranslatableKind = (typeof TRANSLATABLE_KINDS)[number];

export const TRANSLATABLE_KIND_LABELS: Record<TranslatableKind, string> = {
  tours: "Tour du lịch",
  articles: "Cẩm nang",
  categories: "Danh mục",
  destinations: "Điểm đến",
};

export type TranslationState = "missing" | "partial" | "complete";

export const TRANSLATION_STATE_LABELS: Record<TranslationState, string> = {
  missing: "Chưa dịch",
  partial: "Dịch chưa đầy đủ",
  complete: "Đã dịch",
};

export type TranslationCoverage = {
  state: TranslationState;
  /** Number of source fields that carry content and therefore need English. */
  required: number;
  /** Number of those fields that already have English content. */
  filled: number;
  /** Vietnamese labels for the fields still missing (useful in the admin list). */
  missingFields: string[];
};

type Obj = Record<string, unknown>;

type Counter = { required: number; filled: number; missingFields: string[] };

type Context = {
  counter: Counter;
  /** True for a CMS draft record, false for an already-resolved public record. */
  compareSource: boolean;
};

const VI_DIACRITICS = /[\u00c0-\u01b0\u1ea0-\u1ef9]/;

const obj = (value: unknown): Obj =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Obj)
    : {};

const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const text = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

function isTranslated(
  source: unknown,
  target: unknown,
  compareSource: boolean,
): boolean {
  const translated = text(target);
  if (!translated) return false;
  if (!compareSource) return true;
  const original = text(source);
  // A copied Vietnamese sentence is not an English translation. Equal strings
  // without Vietnamese marks are allowed (proper names, numbers, brand names).
  if (original && translated === original && VI_DIACRITICS.test(original)) {
    return false;
  }
  return true;
}

function check(
  context: Context,
  label: string,
  source: unknown,
  target: unknown,
  force = false,
): void {
  const original = text(source);
  if (!original && !force) return;
  context.counter.required += 1;
  if (isTranslated(source, target, context.compareSource)) {
    context.counter.filled += 1;
  } else {
    context.counter.missingFields.push(label);
  }
}

function checkList(
  context: Context,
  label: string,
  source: unknown,
  target: unknown,
): void {
  const sourceItems = arr(source);
  const targetItems = arr(target);
  sourceItems.forEach((item, index) => {
    if (!text(item)) return;
    check(context, `${label} ${index + 1}`, item, targetItems[index]);
  });
}

function checkSeo(
  context: Context,
  source: unknown,
  target: unknown,
): void {
  const sourceSeo = obj(source);
  const targetSeo = obj(target);
  check(context, "Tiêu đề SEO", sourceSeo.title, targetSeo.title);
  check(context, "Mô tả SEO", sourceSeo.description, targetSeo.description);
}

function checkTour(context: Context, source: Obj, en: Obj): void {
  check(context, "Tiêu đề", source.title, en.title, true);
  check(context, "Tóm tắt", source.summary, en.summary, true);
  checkList(context, "Đoạn giới thiệu", source.overview, en.overview);
  checkList(context, "Điểm nổi bật", source.highlights, en.highlights);
  checkList(context, "Đã bao gồm", source.included, en.included);
  checkList(context, "Không bao gồm", source.excluded, en.excluded);
  checkList(context, "Lưu ý", source.notes, en.notes);
  checkList(context, "Chính sách", source.policies, en.policies);
  checkList(context, "Nhãn lọc", source.tags, en.tags);
  checkList(
    context,
    "Điểm khởi hành",
    source.departurePoints,
    en.departurePoints,
  );
  check(context, "Ghi chú giá", source.priceNote, en.priceNote);
  check(context, "Nhãn nổi bật", source.badge, en.badge);

  const sourceDays = arr(source.itinerary);
  const enDays = arr(en.itinerary);
  sourceDays.forEach((rawDay, index) => {
    const day = obj(rawDay);
    const translated = obj(enDays[index]);
    const dayLabel = `Lịch trình ngày ${index + 1}`;
    check(context, `${dayLabel}: tiêu đề`, day.title, translated.title, true);
    check(context, `${dayLabel}: tóm tắt`, day.summary, translated.summary);
    checkList(
      context,
      `${dayLabel}: hoạt động`,
      day.activities,
      translated.activities,
    );
    checkList(context, `${dayLabel}: bữa ăn`, day.meals, translated.meals);
    check(
      context,
      `${dayLabel}: lưu trú`,
      day.accommodation,
      translated.accommodation,
    );
    checkList(
      context,
      `${dayLabel}: điểm tham quan`,
      day.places,
      translated.places,
    );
  });

  const images = arr(source.images);
  const imageAlts = arr(en.imageAlts);
  images.forEach((rawImage, index) => {
    check(
      context,
      `Mô tả ảnh ${index + 1}`,
      obj(rawImage).alt,
      imageAlts[index],
      true,
    );
  });

  checkSeo(context, source.seo, en.seo);
}

function checkArticle(context: Context, source: Obj, en: Obj): void {
  check(context, "Tiêu đề", source.title, en.title, true);
  check(context, "Giới thiệu", source.excerpt, en.excerpt, true);
  checkList(context, "Nhãn", source.tags, en.tags);

  const sourceBody = arr(source.body);
  const enBody = arr(en.body);
  sourceBody.forEach((rawBlock, index) => {
    const block = obj(rawBlock);
    const translated = obj(enBody[index]);
    const label = `Nội dung bài (khối ${index + 1})`;
    switch (text(block.type)) {
      case "paragraph":
      case "heading":
        check(context, label, block.text, translated.text, true);
        break;
      case "list":
        checkList(context, `${label}: mục`, block.items, translated.items);
        break;
      case "quote":
        check(context, `${label}: trích dẫn`, block.text, translated.text, true);
        check(context, `${label}: nguồn`, block.cite, translated.cite);
        break;
      case "callout":
        check(context, `${label}: tiêu đề`, block.title, translated.title);
        check(context, `${label}: nội dung`, block.text, translated.text, true);
        break;
      case "image":
        check(context, `${label}: mô tả ảnh`, block.alt, translated.alt, true);
        check(context, `${label}: chú thích`, block.caption, translated.caption);
        break;
      default:
        break;
    }
  });

  checkSeo(context, source.seo, en.seo);
}

function checkCategory(context: Context, source: Obj, en: Obj): void {
  check(context, "Tên danh mục", source.name, en.name, true);
  check(context, "Mô tả", source.description, en.description, true);
  check(context, "Thông điệp", source.tagline, en.tagline);
  checkSeo(context, source.seo, en.seo);
}

function checkDestination(context: Context, source: Obj, en: Obj): void {
  check(context, "Tên điểm đến", source.name, en.name, true);
  check(context, "Tóm tắt", source.summary, en.summary, true);
  check(context, "Tỉnh / thành", source.province, en.province);
}

function summarize(counter: Counter): TranslationCoverage {
  const state: TranslationState =
    counter.required === 0
      ? "complete"
      : counter.filled === 0
        ? "missing"
        : counter.missingFields.length === 0
          ? "complete"
          : "partial";
  return { state, ...counter };
}

/**
 * Compare a source record with its `_en` overlay.
 *
 * `overlay` may be `undefined`, `null` or an empty object: all three mean the
 * record has no English content yet.
 */
export function translationCoverage(
  kind: TranslatableKind,
  source: unknown,
  overlay: unknown,
): TranslationCoverage {
  const record = obj(source);
  const en = obj(overlay);
  const context: Context = {
    counter: { required: 0, filled: 0, missingFields: [] },
    compareSource: true,
  };
  switch (kind) {
    case "tours":
      checkTour(context, record, en);
      break;
    case "articles":
      checkArticle(context, record, en);
      break;
    case "categories":
      checkCategory(context, record, en);
      break;
    case "destinations":
      checkDestination(context, record, en);
      break;
  }
  return summarize(context.counter);
}

/** Same as `translationCoverage`, reading the overlay from `data._en`. */
export function recordTranslationCoverage(
  kind: TranslatableKind,
  data: unknown,
): TranslationCoverage {
  const record = obj(data);
  return translationCoverage(kind, record, record._en);
}

/**
 * Coverage for a record already resolved for `en` (`resolveTour` etc.).
 *
 * The record carries the overlay applied over the Vietnamese source, so the
 * overlay itself must be inspected. Fields it omits still show Vietnamese and
 * are reported as missing.
 */
export function resolvedTranslationCoverage(
  kind: TranslatableKind,
  resolved: unknown,
): TranslationCoverage {
  const record = obj(resolved);
  const en = obj(record._en);
  const context: Context = {
    counter: { required: 0, filled: 0, missingFields: [] },
    compareSource: false,
  };
  switch (kind) {
    case "tours":
      checkTour(context, record, en);
      break;
    case "articles":
      checkArticle(context, record, en);
      break;
    case "categories":
      checkCategory(context, record, en);
      break;
    case "destinations":
      checkDestination(context, record, en);
      break;
  }
  return summarize(context.counter);
}

/** True when every content field present in the Vietnamese source has English. */
export function isTranslationComplete(
  kind: TranslatableKind,
  source: unknown,
  overlay: unknown,
): boolean {
  return translationCoverage(kind, source, overlay).state === "complete";
}

/** Public-page variant: complete when the resolved page has no Vietnamese fallback. */
export function isResolvedTranslationComplete(
  kind: TranslatableKind,
  resolved: unknown,
): boolean {
  return resolvedTranslationCoverage(kind, resolved).state === "complete";
}

/** One row of the Studio translation tracker. */
export type TranslationQueueItem = {
  kind: TranslatableKind;
  kindLabel: string;
  id: string;
  slug: string;
  /** Vietnamese record name, always shown in the admin list. */
  title: string;
  state: "draft" | "published" | "other";
  status: TranslationState;
  required: number;
  filled: number;
  missingFields: string[];
  reviewed: boolean;
  updatedAt: string;
  editHref: string;
};

export type TranslationQueueSummary = {
  total: number;
  missing: number;
  partial: number;
  complete: number;
  /** Records that still need work (`missing` + `partial`). */
  incomplete: number;
  byKind: Record<TranslatableKind, number>;
};

export type TranslationQueue = {
  items: TranslationQueueItem[];
  summary: TranslationQueueSummary;
  generatedAt: string;
};

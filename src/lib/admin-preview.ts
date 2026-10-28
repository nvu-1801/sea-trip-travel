/**
 * Client-safe preview of an unsaved Studio form in either language.
 *
 * It mirrors the public overlay rules closely enough for the editor: English
 * always falls back to Vietnamese per field, and shared facts (slug, price,
 * image `src`, ids) are never replaced. No server import may creep in here —
 * the Studio bundle uses it directly.
 */

type Obj = Record<string, unknown>;

const obj = (value: unknown): Obj =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Obj)
    : {};

const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const strings = (value: unknown): string[] =>
  arr(value).filter((item): item is string => typeof item === "string");

export function hasEnglishOverlay(
  kind: "tours" | "articles" | "categories" | "destinations",
  data: Obj,
): boolean {
  const en = obj(data._en);
  return kind === "tours" || kind === "articles"
    ? Object.keys(en).length > 0
    : strings([en.name, en.summary, en.description, en.tagline]).some(Boolean);
}

export function previewRecord(
  kind: "tours" | "articles" | "categories" | "destinations",
  data: Obj,
  locale: "vi" | "en",
): Obj {
  if (locale === "vi") return data;
  const en = obj(data._en);
  if (Object.keys(en).length === 0) return data;

  if (kind === "tours") {
    const imageAlts = strings(en.imageAlts);
    const images = arr(data.images).map((item, index) => {
      const image = obj(item);
      return imageAlts[index]
        ? { ...image, alt: imageAlts[index] }
        : image;
    });
    return {
      ...data,
      ...en,
      ...(en.seo ? { seo: { ...obj(data.seo), ...obj(en.seo) } } : {}),
      ...(imageAlts.length > 0 ? { images } : {}),
    };
  }

  return {
    ...data,
    ...en,
    ...(en.seo ? { seo: { ...obj(data.seo), ...obj(en.seo) } } : {}),
  };
}

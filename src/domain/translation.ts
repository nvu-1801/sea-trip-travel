/**
 * Editor-assisted translation (VI → EN).
 *
 * This module is browser-safe and shared by the Studio button, the API and the
 * tests. It owns three things:
 *
 * 1. Which source fields may be translated and where their English counterpart
 *    lives. Nothing outside this allowlist can ever be sent or written.
 * 2. The snapshot/guard used to stop a late response from overwriting an edit
 *    the owner made while the request was in flight.
 * 3. Rebuilding the English record without touching identity, money, slugs,
 *    image `src` or block structure.
 *
 * Google is only ever sent the leaf strings returned by
 * `collectTranslationFields`; URLs, ids, prices and block metadata never leave
 * the server.
 */

type Obj = Record<string, unknown>;

export const TRANSLATION_KINDS = [
  "tour",
  "article",
  "category",
  "destination",
  "hero",
  "landing",
  "settings",
] as const;
export type TranslationKind = (typeof TRANSLATION_KINDS)[number];

/**
 * Landing sections that actually carry an English counterpart. `finder` and
 * `guides` only reference ids/queries, so they are intentionally absent.
 */
export const LANDING_SECTIONS = [
  "explore",
  "regions",
  "story",
  "planning",
  "trust",
  "values",
  "customers",
  "featured",
] as const;
export type LandingTranslationSection = (typeof LANDING_SECTIONS)[number];

export const TRANSLATION_LIMITS = {
  /** Google Cloud Translation Basic accepts at most 128 strings per request. */
  batchSize: 128,
  maxFields: 300,
  maxFieldChars: 5000,
  maxTotalChars: 20000,
  maxRequestBodyBytes: 200_000,
  requestsPerMinute: 10,
  globalRequestsPerMinute: 60,
  timeoutMs: 15_000,
} as const;

export type TranslationField = {
  /** Stable path inside the Vietnamese source record. */
  path: string;
  /** Path inside the same CMS record that receives the English text. */
  target: string;
  value: string;
};

export type TranslationSnapshot = {
  /** Structural fingerprint: arrays, ids, block types… but never text. */
  structure: string;
  fields: Record<string, { source: string; target: string }>;
};

export type TranslationResult = { path: string; value: string };

export type ApplyTranslationResult = {
  data: Obj;
  applied: number;
  skipped: number;
  /** The form changed shape while the request was in flight; nothing applied. */
  stale: boolean;
};

const isObject = (value: unknown): value is Obj =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const obj = (value: unknown): Obj => (isObject(value) ? value : {});

const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const text = (value: unknown): string =>
  typeof value === "string" ? value : "";

const strings = (value: unknown): string[] =>
  arr(value).filter((item): item is string => typeof item === "string");

const records = (value: unknown): Obj[] => arr(value).map(obj);

const number = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

export function isTranslationKind(value: string): value is TranslationKind {
  return (TRANSLATION_KINDS as readonly string[]).includes(value);
}

export function isLandingTranslationSection(
  value: string,
): value is LandingTranslationSection {
  return (LANDING_SECTIONS as readonly string[]).includes(value);
}

/** Text currently stored at a dotted path (`a.0.b`), or `""`. */
export function valueAtPath(root: unknown, path: string): string {
  let current: unknown = root;
  for (const part of path.split(".")) {
    if (Array.isArray(current) && /^\d+$/.test(part)) {
      current = current[Number(part)];
      continue;
    }
    if (!isObject(current)) return "";
    current = current[part];
  }
  return text(current);
}

function setAtPath(root: Obj, path: string, value: string): void {
  const parts = path.split(".");
  let current: Obj | unknown[] = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    const next = parts[index + 1];
    const create = /^\d+$/.test(next) ? [] : {};
    if (Array.isArray(current)) {
      const at = Number(key);
      if (!Number.isInteger(at) || at < 0) return;
      if (!isObject(current[at]) && !Array.isArray(current[at])) {
        current[at] = create;
      }
      current = current[at] as Obj | unknown[];
      continue;
    }
    if (!isObject(current[key]) && !Array.isArray(current[key])) {
      current[key] = create;
    }
    current = current[key] as Obj | unknown[];
  }
  const last = parts[parts.length - 1];
  if (Array.isArray(current)) current[Number(last)] = value;
  else current[last] = value;
}

const clone = <T>(value: T): T => structuredClone(value);

function push(
  fields: TranslationField[],
  path: string,
  target: string,
  value: string,
) {
  const clean = value.trim();
  if (clean) fields.push({ path, target, value: clean });
}

/* -------------------------------------------------------------------------- */
/* Allowlist                                                                  */
/* -------------------------------------------------------------------------- */

const TOUR_RULES = [
  /^(?:title|summary|badge|priceNote)$/,
  /^seo\.(?:title|description)$/,
  /^(?:overview|highlights|included|excluded|notes|policies|tags|departurePoints)\.\d{1,3}$/,
  /^itinerary\.\d{1,3}\.(?:title|summary|accommodation)$/,
  /^itinerary\.\d{1,3}\.(?:activities|meals|places)\.\d{1,3}$/,
  /^images\.\d{1,3}\.alt$/,
];

const ARTICLE_RULES = [
  /^(?:title|excerpt)$/,
  /^seo\.(?:title|description)$/,
  /^tags\.\d{1,3}$/,
  /^body\.\d{1,3}\.(?:text|title|cite|alt|caption)$/,
  /^body\.\d{1,3}\.items\.\d{1,3}$/,
];

const CATEGORY_RULES = [
  /^(?:name|description|tagline)$/,
  /^seo\.(?:title|description)$/,
];

const DESTINATION_RULES = [/^(?:name|summary|province)$/];

const HERO_RULES = [
  /^vi\.(?:badge|titleLine1|titleLine2|description|primaryLabel|secondaryLabel)$/,
  /^slides\.\d{1,3}\.(?:caption|title|description)$/,
];

const SETTINGS_RULES = [
  /^contact\.workingHours$/,
  /^footerLinks\.\d{1,3}\.label$/,
  /^seo\.(?:homeTitle|homeDescription)$/,
];

const LANDING_RULES: Record<LandingTranslationSection, RegExp[]> = {
  explore: [/^(?:eyebrow|titleA|titleB|body|footnote)$/],
  regions: [/^(?:eyebrow|titleA|titleB|intro)$/, /^moods\.\d{1,3}$/],
  story: [/^trips\.\d{1,3}\.(?:title|body)$/],
  planning: [/^questions\.\d{1,3}\.(?:q|a|tag)$/],
  trust: [/^items\.\d{1,3}\.(?:title|body)$/],
  values: [
    /^(?:badge|photoAlt)$/,
    /^principles\.\d{1,3}\.(?:title|body)$/,
  ],
  customers: [
    /^(?:eyebrow|title|body|ctaLabel|logosTitle|videosTitle)$/,
    /^videos\.\d{1,3}\.(?:title|body|customer)$/,
  ],
  featured: [
    /^scopes\.[A-Za-z0-9_-]{1,80}\.(?:title|eyebrow)$/,
  ],
};

/** True only for an explicit source path this feature is allowed to send. */
export function isAllowedTranslationPath(
  kind: TranslationKind,
  path: string,
  section?: string,
): boolean {
  if (kind === "landing") {
    if (!section || !isLandingTranslationSection(section)) return false;
    const local = path.startsWith(`${section}.`)
      ? path.slice(section.length + 1)
      : path;
    return LANDING_RULES[section].some((rule) => rule.test(local));
  }
  if (section) return false;
  switch (kind) {
    case "tour":
      return TOUR_RULES.some((rule) => rule.test(path));
    case "article":
      return ARTICLE_RULES.some((rule) => rule.test(path));
    case "category":
      return CATEGORY_RULES.some((rule) => rule.test(path));
    case "destination":
      return DESTINATION_RULES.some((rule) => rule.test(path));
    case "hero":
      return HERO_RULES.some((rule) => rule.test(path));
    case "settings":
      return SETTINGS_RULES.some((rule) => rule.test(path));
    default:
      return false;
  }
}

/* -------------------------------------------------------------------------- */
/* Source collection                                                          */
/* -------------------------------------------------------------------------- */

function collectTour(data: Obj, fields: TranslationField[]) {
  push(fields, "title", "_en.title", text(data.title));
  push(fields, "summary", "_en.summary", text(data.summary));
  push(fields, "badge", "_en.badge", text(data.badge));
  push(fields, "priceNote", "_en.priceNote", text(data.priceNote));

  for (const name of [
    "overview",
    "highlights",
    "included",
    "excluded",
    "notes",
    "policies",
    "tags",
    "departurePoints",
  ] as const) {
    strings(data[name]).forEach((value, index) =>
      push(fields, `${name}.${index}`, `_en.${name}.${index}`, value),
    );
  }

  records(data.itinerary).forEach((day, index) => {
    push(fields, `itinerary.${index}.title`, `_en.itinerary.${index}.title`, text(day.title));
    push(fields, `itinerary.${index}.summary`, `_en.itinerary.${index}.summary`, text(day.summary));
    push(
      fields,
      `itinerary.${index}.accommodation`,
      `_en.itinerary.${index}.accommodation`,
      text(day.accommodation),
    );
    for (const name of ["activities", "meals", "places"] as const) {
      strings(day[name]).forEach((value, item) =>
        push(
          fields,
          `itinerary.${index}.${name}.${item}`,
          `_en.itinerary.${index}.${name}.${item}`,
          value,
        ),
      );
    }
  });

  records(data.images).forEach((image, index) =>
    push(fields, `images.${index}.alt`, `_en.imageAlts.${index}`, text(image.alt)),
  );

  const seo = obj(data.seo);
  push(fields, "seo.title", "_en.seo.title", text(seo.title));
  push(fields, "seo.description", "_en.seo.description", text(seo.description));
}

function collectArticle(data: Obj, fields: TranslationField[]) {
  push(fields, "title", "_en.title", text(data.title));
  push(fields, "excerpt", "_en.excerpt", text(data.excerpt));
  strings(data.tags).forEach((value, index) =>
    push(fields, `tags.${index}`, `_en.tags.${index}`, value),
  );

  records(data.body).forEach((block, index) => {
    const type = text(block.type);
    switch (type) {
      case "paragraph":
      case "heading":
        push(fields, `body.${index}.text`, `_en.body.${index}.text`, text(block.text));
        break;
      case "list":
        strings(block.items).forEach((value, item) =>
          push(
            fields,
            `body.${index}.items.${item}`,
            `_en.body.${index}.items.${item}`,
            value,
          ),
        );
        break;
      case "quote":
        push(fields, `body.${index}.text`, `_en.body.${index}.text`, text(block.text));
        push(fields, `body.${index}.cite`, `_en.body.${index}.cite`, text(block.cite));
        break;
      case "callout":
        push(fields, `body.${index}.title`, `_en.body.${index}.title`, text(block.title));
        push(fields, `body.${index}.text`, `_en.body.${index}.text`, text(block.text));
        break;
      case "image":
        push(fields, `body.${index}.alt`, `_en.body.${index}.alt`, text(block.alt));
        push(
          fields,
          `body.${index}.caption`,
          `_en.body.${index}.caption`,
          text(block.caption),
        );
        break;
      default:
        break;
    }
  });

  const seo = obj(data.seo);
  push(fields, "seo.title", "_en.seo.title", text(seo.title));
  push(fields, "seo.description", "_en.seo.description", text(seo.description));
}

function collectHero(data: Obj, fields: TranslationField[]) {
  const vi = obj(data.vi);
  for (const key of [
    "badge",
    "titleLine1",
    "titleLine2",
    "description",
    "primaryLabel",
    "secondaryLabel",
  ] as const) {
    push(fields, `vi.${key}`, `en.${key}`, text(vi[key]));
  }
  records(data.slides).forEach((slide, index) => {
    push(fields, `slides.${index}.caption`, `slides.${index}.captionEn`, text(slide.caption));
    push(fields, `slides.${index}.title`, `slides.${index}.titleEn`, text(slide.title));
    push(
      fields,
      `slides.${index}.description`,
      `slides.${index}.descriptionEn`,
      text(slide.description),
    );
  });
}

function collectLanding(
  data: Obj,
  section: LandingTranslationSection,
  fields: TranslationField[],
) {
  const part = obj(data[section]);
  switch (section) {
    case "explore":
      for (const key of ["eyebrow", "titleA", "titleB", "body", "footnote"] as const) {
        push(fields, `${section}.${key}`, `${section}.${key}En`, text(part[key]));
      }
      break;
    case "regions":
      for (const key of ["eyebrow", "titleA", "titleB", "intro"] as const) {
        push(fields, `${section}.${key}`, `${section}.${key}En`, text(part[key]));
      }
      strings(part.moods).forEach((value, index) =>
        push(fields, `${section}.moods.${index}`, `${section}.moodsEn.${index}`, value),
      );
      break;
    case "story":
      records(part.trips).forEach((trip, index) => {
        push(fields, `${section}.trips.${index}.title`, `${section}.trips.${index}.titleEn`, text(trip.title));
        push(fields, `${section}.trips.${index}.body`, `${section}.trips.${index}.bodyEn`, text(trip.body));
      });
      break;
    case "planning":
      records(part.questions).forEach((question, index) => {
        for (const key of ["q", "a", "tag"] as const) {
          push(
            fields,
            `${section}.questions.${index}.${key}`,
            `${section}.questions.${index}.${key}En`,
            text(question[key]),
          );
        }
      });
      break;
    case "trust":
      records(part.items).forEach((item, index) => {
        push(fields, `${section}.items.${index}.title`, `${section}.items.${index}.titleEn`, text(item.title));
        push(fields, `${section}.items.${index}.body`, `${section}.items.${index}.bodyEn`, text(item.body));
      });
      break;
    case "values":
      push(fields, `${section}.badge`, `${section}.badgeEn`, text(part.badge));
      push(fields, `${section}.photoAlt`, `${section}.photoAltEn`, text(part.photoAlt));
      records(part.principles).forEach((item, index) => {
        push(fields, `${section}.principles.${index}.title`, `${section}.principles.${index}.titleEn`, text(item.title));
        push(fields, `${section}.principles.${index}.body`, `${section}.principles.${index}.bodyEn`, text(item.body));
      });
      break;
    case "customers":
      for (const key of ["eyebrow", "title", "body", "ctaLabel", "logosTitle", "videosTitle"] as const) {
        push(fields, `${section}.${key}`, `${section}.${key}En`, text(part[key]));
      }
      records(part.videos).forEach((video, index) => {
        for (const key of ["title", "body", "customer"] as const) {
          push(
            fields,
            `${section}.videos.${index}.${key}`,
            `${section}.videos.${index}.${key}En`,
            text(video[key]),
          );
        }
      });
      break;
    case "featured":
      Object.entries(obj(part.scopes)).forEach(([scopeId, raw]) => {
        const scope = obj(raw);
        for (const key of ["title", "eyebrow"] as const) {
          push(
            fields,
            `${section}.scopes.${scopeId}.${key}`,
            `${section}.scopes.${scopeId}.${key}En`,
            text(scope[key]),
          );
        }
      });
      break;
  }
}

function collectSettings(data: Obj, fields: TranslationField[]) {
  push(
    fields,
    "contact.workingHours",
    "contact.workingHoursEn",
    text(obj(data.contact).workingHours),
  );
  records(data.footerLinks).forEach((link, index) =>
    push(fields, `footerLinks.${index}.label`, `footerLinks.${index}.labelEn`, text(link.label)),
  );
  const seo = obj(data.seo);
  push(fields, "seo.homeTitle", "seo.homeTitleEn", text(seo.homeTitle));
  push(
    fields,
    "seo.homeDescription",
    "seo.homeDescriptionEn",
    text(seo.homeDescription),
  );
}

/**
 * All translatable leaf strings currently present in a record. Empty strings
 * are omitted so the provider is never billed for nothing.
 */
export function collectTranslationFields(
  kind: TranslationKind,
  data: Obj,
  section?: string,
): TranslationField[] {
  const fields: TranslationField[] = [];
  switch (kind) {
    case "tour":
      collectTour(data, fields);
      break;
    case "article":
      collectArticle(data, fields);
      break;
    case "category":
      push(fields, "name", "_en.name", text(data.name));
      push(fields, "description", "_en.description", text(data.description));
      push(fields, "tagline", "_en.tagline", text(data.tagline));
      push(fields, "seo.title", "_en.seo.title", text(obj(data.seo).title));
      push(
        fields,
        "seo.description",
        "_en.seo.description",
        text(obj(data.seo).description),
      );
      break;
    case "destination":
      push(fields, "name", "_en.name", text(data.name));
      push(fields, "summary", "_en.summary", text(data.summary));
      push(fields, "province", "_en.province", text(data.province));
      break;
    case "hero":
      collectHero(data, fields);
      break;
    case "landing":
      if (section && isLandingTranslationSection(section)) {
        collectLanding(data, section, fields);
      }
      break;
    case "settings":
      collectSettings(data, fields);
      break;
  }
  return fields.filter((field) => isAllowedTranslationPath(kind, field.path, section));
}

/** Any English counterpart already has text (triggers the overwrite confirm). */
export function hasExistingTranslation(
  kind: TranslationKind,
  data: Obj,
  section?: string,
): boolean {
  return collectTranslationFields(kind, data, section).some(
    (field) => valueAtPath(data, field.target).trim() !== "",
  );
}

/** What the owner is about to overwrite, for the confirmation copy. */
export function existingTranslationCount(
  kind: TranslationKind,
  data: Obj,
  section?: string,
): number {
  return collectTranslationFields(kind, data, section).filter(
    (field) => valueAtPath(data, field.target).trim() !== "",
  ).length;
}

/** Values of the Vietnamese source only. Used to detect "VI changed since". */
export function translationSourceSignature(
  kind: TranslationKind,
  data: Obj,
  section?: string,
): string {
  return JSON.stringify(
    collectTranslationFields(kind, data, section).map((field) => [
      field.path,
      field.value,
    ]),
  );
}

/**
 * Structure-only fingerprint. Text edits keep it stable; adding/removing a day,
 * block, image or video changes it, which invalidates a response computed
 * against the old shape.
 */
export function translationStructureSignature(
  kind: TranslationKind,
  data: Obj,
  section?: string,
): string {
  const seoKeys = (value: unknown) => Object.keys(obj(value)).sort();
  switch (kind) {
    case "tour":
      return JSON.stringify({
        lists: [
          "overview",
          "highlights",
          "included",
          "excluded",
          "notes",
          "policies",
          "tags",
          "departurePoints",
        ].map((name) => [name, strings(data[name]).length]),
        itinerary: records(data.itinerary).map((day) => ({
          id: text(day.id),
          index: number(day.index),
          activities: strings(day.activities).length,
          meals: strings(day.meals).length,
          places: strings(day.places).length,
          summary: Boolean(text(day.summary)),
          accommodation: Boolean(text(day.accommodation)),
        })),
        images: records(data.images).map((image) => text(image.src)),
        seo: seoKeys(data.seo),
      });
    case "article":
      return JSON.stringify({
        tags: strings(data.tags).length,
        body: records(data.body).map((block) => ({
          type: text(block.type),
          level: number(block.level),
          ordered: block.ordered === true,
          tone: text(block.tone),
          items: strings(block.items).length,
          src: text(block.src),
          title: Boolean(text(block.title)),
          cite: Boolean(text(block.cite)),
          caption: Boolean(text(block.caption)),
        })),
        seo: seoKeys(data.seo),
      });
    case "category":
      return JSON.stringify({ keys: Object.keys(data).sort(), seo: seoKeys(data.seo) });
    case "destination":
      return JSON.stringify({ keys: Object.keys(data).sort() });
    case "hero":
      return JSON.stringify({
        slides: records(data.slides).map((slide) => ({
          id: text(slide.id),
          src: text(obj(slide.image).src),
        })),
        vi: Object.keys(obj(data.vi)).sort(),
        en: Object.keys(obj(data.en)).sort(),
      });
    case "landing": {
      if (!section || !isLandingTranslationSection(section)) return "[]";
      const part = obj(data[section]);
      switch (section) {
        case "explore":
        case "regions":
          return JSON.stringify({
            section,
            keys: Object.keys(part).sort(),
            moods: strings(part.moods).length,
          });
        case "story":
          return JSON.stringify({
            section,
            trips: records(part.trips).length,
          });
        case "planning":
          return JSON.stringify({
            section,
            questions: records(part.questions).length,
          });
        case "trust":
          return JSON.stringify({
            section,
            items: records(part.items).length,
          });
        case "values":
          return JSON.stringify({
            section,
            principles: records(part.principles).length,
            keys: Object.keys(part).sort(),
          });
        case "customers":
          return JSON.stringify({
            section,
            logos: records(part.logos).map((logo) => text(logo.id)),
            videos: records(part.videos).map((video) => text(video.id)),
            keys: Object.keys(part).sort(),
          });
        case "featured":
          return JSON.stringify({
            section,
            scopes: Object.keys(obj(part.scopes)).sort(),
          });
      }
      return "[]";
    }
    case "settings":
      return JSON.stringify({
        footerLinks: records(data.footerLinks).length,
      });
  }
}

export function createTranslationSnapshot(
  kind: TranslationKind,
  data: Obj,
  section?: string,
): TranslationSnapshot {
  const fields = collectTranslationFields(kind, data, section);
  return {
    structure: translationStructureSignature(kind, data, section),
    fields: Object.fromEntries(
      fields.map((field) => [
        field.path,
        {
          source: field.value,
          target: valueAtPath(data, field.target),
        },
      ]),
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Apply                                                                      */
/* -------------------------------------------------------------------------- */

function mergeList(
  source: string[],
  existing: string[],
  base: string,
  values: Map<string, string>,
): string[] {
  const length = Math.max(source.length, existing.length);
  return Array.from({ length }, (_, index) => {
    const translated = values.get(`${base}.${index}`);
    return translated ?? existing[index] ?? source[index] ?? "";
  });
}

function applyTour(data: Obj, values: Map<string, string>): Obj {
  const en = { ...obj(data._en) };

  for (const key of ["title", "summary", "badge", "priceNote"] as const) {
    const translated = values.get(key);
    if (translated !== undefined) en[key] = translated;
  }

  for (const name of [
    "overview",
    "highlights",
    "included",
    "excluded",
    "notes",
    "policies",
    "tags",
    "departurePoints",
  ] as const) {
    if (![...values.keys()].some((path) => path.startsWith(`${name}.`))) continue;
    en[name] = mergeList(
      strings(data[name]),
      strings(en[name]),
      name,
      values,
    ).filter(Boolean);
  }

  if ([...values.keys()].some((path) => path.startsWith("itinerary."))) {
    const existing = records(en.itinerary);
    en.itinerary = records(data.itinerary).map((day, index) => {
      const candidate = existing[index] ?? {};
      const title =
        values.get(`itinerary.${index}.title`) ??
        (text(candidate.title) || text(day.title));
      const summary =
        values.get(`itinerary.${index}.summary`) ??
        (text(candidate.summary) || text(day.summary));
      const accommodation =
        values.get(`itinerary.${index}.accommodation`) ??
        (text(candidate.accommodation) || text(day.accommodation));
      return {
        id: text(day.id) || text(candidate.id) || `day_${index + 1}`,
        index: number(day.index) || index + 1,
        title,
        ...(summary ? { summary } : {}),
        activities: mergeList(
          strings(day.activities),
          strings(candidate.activities),
          `itinerary.${index}.activities`,
          values,
        ).filter(Boolean),
        meals: mergeList(
          strings(day.meals),
          strings(candidate.meals),
          `itinerary.${index}.meals`,
          values,
        ).filter(Boolean),
        places: mergeList(
          strings(day.places),
          strings(candidate.places),
          `itinerary.${index}.places`,
          values,
        ).filter(Boolean),
        ...(accommodation ? { accommodation } : {}),
      };
    });
  }

  if ([...values.keys()].some((path) => path.startsWith("images."))) {
    const existing = strings(en.imageAlts);
    en.imageAlts = records(data.images).map(
      (image, index) =>
        values.get(`images.${index}.alt`) ??
        existing[index] ??
        text(image.alt),
    );
  }

  if ([...values.keys()].some((path) => path.startsWith("seo."))) {
    const previous = obj(en.seo);
    const source = obj(data.seo);
    const title =
      values.get("seo.title") ?? (text(previous.title) || text(source.title));
    const description =
      values.get("seo.description") ??
      (text(previous.description) || text(source.description));
    en.seo = {
      ...previous,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    };
  }

  return { ...data, _en: en };
}

function applyArticle(data: Obj, values: Map<string, string>): Obj {
  const en = { ...obj(data._en) };

  for (const key of ["title", "excerpt"] as const) {
    const translated = values.get(key);
    if (translated !== undefined) en[key] = translated;
  }

  if ([...values.keys()].some((path) => path.startsWith("tags."))) {
    en.tags = mergeList(strings(data.tags), strings(en.tags), "tags", values).filter(Boolean);
  }

  if ([...values.keys()].some((path) => path.startsWith("body."))) {
    const existing = records(en.body);
    const body = records(data.body).map((block, index) => {
      const candidate = existing[index] ?? {};
      const type = text(block.type);
      // Structure always comes from the Vietnamese block. Existing English
      // text is only reused for leaves this request did not translate.
      switch (type) {
        case "paragraph":
        case "heading":
          return {
            ...block,
            text:
              values.get(`body.${index}.text`) ??
              (text(candidate.text) || text(block.text)),
          };
        case "list":
          return {
            ...block,
            items: mergeList(
              strings(block.items),
              strings(candidate.items),
              `body.${index}.items`,
              values,
            ).filter(Boolean),
          };
        case "quote": {
          const cite =
            values.get(`body.${index}.cite`) ??
            (text(candidate.cite) || text(block.cite));
          return {
            ...block,
            text:
              values.get(`body.${index}.text`) ??
              (text(candidate.text) || text(block.text)),
            ...(cite ? { cite } : {}),
          };
        }
        case "callout": {
          const title =
            values.get(`body.${index}.title`) ??
            (text(candidate.title) || text(block.title));
          return {
            ...block,
            ...(title ? { title } : {}),
            text:
              values.get(`body.${index}.text`) ??
              (text(candidate.text) || text(block.text)),
          };
        }
        case "image": {
          const caption =
            values.get(`body.${index}.caption`) ??
            (text(candidate.caption) || text(block.caption));
          return {
            ...block,
            alt:
              values.get(`body.${index}.alt`) ??
              (text(candidate.alt) || text(block.alt)),
            ...(caption ? { caption } : {}),
          };
        }
        default:
          return block;
      }
    });
    // Preserve English-only blocks the owner added after the Vietnamese body
    // ended; translation must never silently delete content.
    for (let index = records(data.body).length; index < existing.length; index += 1) {
      body.push(existing[index]);
    }
    en.body = body;
  }

  if ([...values.keys()].some((path) => path.startsWith("seo."))) {
    const previous = obj(en.seo);
    const source = obj(data.seo);
    const title =
      values.get("seo.title") ?? (text(previous.title) || text(source.title));
    const description =
      values.get("seo.description") ??
      (text(previous.description) || text(source.description));
    en.seo = {
      ...previous,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    };
  }

  return { ...data, _en: en };
}

function applyGeneric(
  kind: TranslationKind,
  data: Obj,
  section: string | undefined,
  values: Map<string, string>,
): Obj {
  const targets = new Map(
    collectTranslationFields(kind, data, section).map((field) => [
      field.path,
      field.target,
    ]),
  );
  const next = clone(data);
  for (const [path, value] of values) {
    const target = targets.get(path);
    if (target) setAtPath(next, target, value);
  }
  return next;
}

/**
 * Writes translations into the English counterpart.
 *
 * When `snapshot` is supplied, every path is re-checked against the current
 * form:
 * - a different structure cancels the whole batch;
 * - a changed Vietnamese source value drops that path;
 * - a changed English target value drops that path (the owner's newer edit
 *   always wins).
 */
export function applyTranslationResults(
  kind: TranslationKind,
  data: Obj,
  section: string | undefined,
  results: readonly TranslationResult[],
  snapshot?: TranslationSnapshot,
): ApplyTranslationResult {
  const wanted = new Map<string, string>();
  for (const result of results) {
    if (
      typeof result?.path !== "string" ||
      typeof result?.value !== "string" ||
      !isAllowedTranslationPath(kind, result.path, section)
    )
      continue;
    const clean = result.value.trim();
    if (clean) wanted.set(result.path, clean);
  }

  let skipped = 0;
  if (snapshot) {
    if (translationStructureSignature(kind, data, section) !== snapshot.structure) {
      return { data, applied: 0, skipped: wanted.size, stale: true };
    }
    const current = new Map(
      collectTranslationFields(kind, data, section).map((field) => [field.path, field]),
    );
    for (const path of [...wanted.keys()]) {
      const field = current.get(path);
      const guard = snapshot.fields[path];
      if (
        !field ||
        !guard ||
        field.value !== guard.source ||
        valueAtPath(data, field.target) !== guard.target
      ) {
        wanted.delete(path);
        skipped += 1;
      }
    }
  }

  if (wanted.size === 0) {
    return { data, applied: 0, skipped, stale: false };
  }

  const next =
    kind === "tour"
      ? applyTour(data, wanted)
      : kind === "article"
        ? applyArticle(data, wanted)
        : applyGeneric(kind, data, section, wanted);

  return { data: next, applied: wanted.size, skipped, stale: false };
}

/**
 * Batch strings for providers that cap the number of strings/characters per
 * request. Order is preserved so callers can map results straight back.
 */
export function batchTranslationTexts(
  values: readonly string[],
  batchSize = TRANSLATION_LIMITS.batchSize,
  maxChars = 25_000,
): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let chars = 0;
  for (const value of values) {
    const length = [...value].length;
    if (
      current.length > 0 &&
      (current.length >= batchSize || chars + length > maxChars)
    ) {
      batches.push(current);
      current = [];
      chars = 0;
    }
    current.push(value);
    chars += length;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

/** Total Unicode codepoints, matching the limit documented to the owner. */
export function translationCharacterCount(values: readonly string[]): number {
  return values.reduce((total, value) => total + [...value].length, 0);
}

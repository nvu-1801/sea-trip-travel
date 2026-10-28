import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  TRANSLATION_LIMITS,
  applyTranslationResults,
  batchTranslationTexts,
  collectTranslationFields,
  createTranslationSnapshot,
  existingTranslationCount,
  hasExistingTranslation,
  isAllowedTranslationPath,
  translationSourceSignature,
  translationStructureSignature,
  valueAtPath,
} from "../src/domain/translation";
import {
  TRANSLATION_BUDGET_DEFAULTS,
  decideTranslationBudget,
  translationBudgetLimit,
  translationBudgetPeriods,
  type TranslationBudgetLimits,
} from "../src/domain/translation-budget";
import {
  decodeTranslationEntities,
  protectTranslationText,
  restoreTranslationText,
} from "../src/domain/translation-protect";
import { hasEnglishOverlay, previewRecord } from "../src/lib/admin-preview";
import {
  TranslationInvalidResponseError,
  TranslationNotConfiguredError,
  TranslationTimeoutError,
  TranslationUpstreamError,
  translateWithGoogle,
} from "../src/server/translation/google-cloud";
import { handleTranslate } from "../src/server/translation/route-handler";
import {
  consumeTranslationBudget,
  refundTranslationBudget,
} from "../src/server/translation/budget";
import { HttpError } from "../src/server/cms/auth";

const tour = {
  id: "tour_demo",
  slug: "tour-demo",
  title: "Tour Kỳ Co một ngày",
  summary: "Một ngày chạm biển xanh.",
  tourCode: "QNPY-01",
  badge: "Đề xuất",
  priceNote: "Giá đã gồm ăn sáng.",
  overview: ["Đoạn giới thiệu."],
  highlights: ["Điểm nổi bật."],
  itinerary: [
    {
      id: "day_1",
      index: 1,
      title: "Ngày 1",
      summary: "Bắt đầu hành trình.",
      activities: ["Tắm biển"],
      meals: ["Sáng"],
      places: ["Kỳ Co"],
      accommodation: "Khách sạn ven biển",
    },
  ],
  included: ["Xe đưa đón"],
  excluded: ["Vé tham quan"],
  notes: ["Mang kem chống nắng"],
  policies: ["Hủy trước 48 giờ"],
  tags: ["1 ngày"],
  departurePoints: ["Quy Nhơn"],
  images: [{ src: "/images/ky-co.jpg", alt: "Bãi biển Kỳ Co" }],
  seo: { title: "Tour Kỳ Co", description: "Mô tả SEO", ogImage: "/og.jpg" },
  categoryIds: ["cat_qnpy"],
  duration: { days: 1, nights: 0 },
  priceFrom: { amount: 990000, currency: "VND" },
  contentStatus: "verified",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const article = {
  id: "art_demo",
  slug: "bai-viet",
  title: "Kinh nghiệm đi Kỳ Co",
  excerpt: "Những điều cần biết.",
  body: [
    { type: "heading", level: 2, text: "Chuẩn bị gì" },
    { type: "paragraph", text: "Mang kem chống nắng." },
    { type: "list", ordered: true, items: ["Áo bơi", "Mũ"] },
    { type: "quote", text: "Biển rất đẹp.", cite: "Du khách" },
    { type: "callout", tone: "tip", title: "Lưu ý", text: "Đi sớm." },
    {
      type: "image",
      alt: "Ảnh Kỳ Co",
      src: "/images/ky-co.jpg",
      caption: "Bãi biển buổi sáng",
    },
  ],
  tags: ["Kỳ Co"],
  seo: { title: "SEO bài viết", description: "Mô tả bài viết" },
};

const hero = {
  id: "home",
  mode: "carousel",
  autoplay: true,
  intervalSeconds: 5,
  primaryHref: "/tour-quy-nhon-phu-yen",
  secondaryHref: "/lien-he",
  vi: {
    badge: "Biển xanh",
    titleLine1: "Chạm",
    titleLine2: "đại dương",
    description: "Một chuyến đi nhẹ nhàng.",
    primaryLabel: "Xem tour",
    secondaryLabel: "Liên hệ",
  },
  en: { badge: "Blue sea" },
  collageMain: { src: "/a.jpg", alt: "Ảnh", positionX: 50, positionY: 50 },
  collageSecondary: { src: "/b.jpg", alt: "Ảnh", positionX: 50, positionY: 50 },
  slides: [
    {
      id: "coast_1",
      image: { src: "/a.jpg", alt: "Ảnh", positionX: 50, positionY: 50 },
      caption: "Chạm vào mùa xanh",
      captionEn: "Into the blue",
      title: "Kỳ Co",
      titleEn: "",
      description: "Nước trong",
      descriptionEn: "",
    },
  ],
};

const landing = {
  id: "home-sections",
  explore: {
    eyebrow: "Khám phá",
    titleA: "Chạm vào",
    titleB: "biển xanh",
    body: "Một đoạn giới thiệu.",
    footnote: "Đi chậm.",
  },
  story: {
    trips: [{ days: "1", title: "Một ngày", body: "Đi nhẹ nhàng." }],
  },
  planning: {
    questions: [{ q: "Đi khi nào?", a: "Mùa khô.", tag: "Thời điểm" }],
  },
  trust: {
    items: [{ icon: "calendar", title: "Rõ lịch", body: "Từng ngày." }],
  },
  values: {
    badge: "Đi chậm",
    photoAlt: "Vịnh biển",
    principles: [{ title: "Ít điểm", body: "Đi sâu." }],
  },
  regions: {
    eyebrow: "Vùng miền",
    titleA: "Một",
    titleB: "Việt Nam",
    intro: "Từ núi đến biển.",
    moods: ["Biển", "Núi"],
  },
  customers: {
    eyebrow: "Khách hàng",
    title: "Dấu ấn",
    body: "Chia sẻ.",
    ctaLabel: "Kể chuyện",
    logosTitle: "Đối tác",
    videosTitle: "Video",
    videos: [
      { id: "v1", title: "Một ngày", body: "Vui", customer: "Chị Lan" },
    ],
  },
  featured: {
    scopes: {
      cat_qnpy: { mode: "auto", title: "Tour nổi bật", eyebrow: "Gợi ý" },
    },
  },
};

const settings = {
  id: "site",
  contact: { workingHours: "8:00 – 18:00" },
  footerLinks: [{ label: "Cẩm nang" }],
  seo: { homeTitle: "Tiêu đề", homeDescription: "Mô tả" },
};

test("tour translation allowlist skips identity, prices, codes and image src", () => {
  const fields = collectTranslationFields("tour", tour);
  const paths = fields.map((field) => field.path);
  assert.ok(paths.includes("title"));
  assert.ok(paths.includes("images.0.alt"));
  assert.ok(paths.includes("itinerary.0.activities.0"));
  assert.ok(!paths.includes("slug"));
  assert.ok(!paths.includes("tourCode"));
  assert.ok(!paths.includes("priceFrom"));
  assert.ok(!paths.includes("images.0.src"));
  assert.ok(fields.some((field) => field.target === "_en.imageAlts.0"));
  assert.equal(isAllowedTranslationPath("tour", "title"), true);
  assert.equal(isAllowedTranslationPath("tour", "tourCode"), false);
  assert.equal(isAllowedTranslationPath("tour", "images.0.src"), false);
  assert.equal(isAllowedTranslationPath("tour", "itinerary.0.activities.2"), true);
  assert.equal(isAllowedTranslationPath("tour", "itinerary.0.unknown"), false);
});

test("applying tour translations preserves ids, money, src and itinerary order", () => {
  const results = collectTranslationFields("tour", tour).map((field) => ({
    path: field.path,
    value: `EN ${field.value}`,
  }));
  const applied = applyTranslationResults("tour", tour, undefined, results);
  const en = (applied.data._en ?? {}) as Record<string, unknown>;
  assert.equal(applied.applied, results.length);
  assert.equal(applied.data.tourCode, "QNPY-01");
  assert.deepEqual(applied.data.images, tour.images);
  assert.equal((en.title as string), "EN Tour Kỳ Co một ngày");
  assert.equal((en.imageAlts as string[])[0], "EN Bãi biển Kỳ Co");
  const itinerary = en.itinerary as Record<string, unknown>[];
  assert.equal(itinerary.length, 1);
  assert.equal(itinerary[0].id, "day_1");
  assert.equal(itinerary[0].index, 1);
  assert.deepEqual(itinerary[0].activities, ["EN Tắm biển"]);
  assert.equal(
    (en.seo as Record<string, unknown>).ogImage,
    undefined,
    "ogImage is never written by translation",
  );
  assert.equal((en.seo as Record<string, unknown>).title, "EN Tour Kỳ Co");
});

test("article translation keeps block type, order, level, list mode and image src", () => {
  const fields = collectTranslationFields("article", article);
  assert.ok(fields.some((field) => field.path === "body.2.items.1"));
  assert.ok(fields.some((field) => field.path === "body.5.alt"));
  assert.ok(!fields.some((field) => field.path.includes("body.5.src")));
  assert.equal(isAllowedTranslationPath("article", "body.0.type"), false);

  const results = fields.map((field) => ({
    path: field.path,
    value: `EN ${field.value}`,
  }));
  const applied = applyTranslationResults("article", article, undefined, results);
  const body = (applied.data._en as { body: Record<string, unknown>[] }).body;
  assert.deepEqual(
    body.map((block) => block.type),
    article.body.map((block) => block.type),
  );
  assert.equal(body[0].level, 2);
  assert.equal(body[2].ordered, true);
  assert.equal(body[3].cite, "EN Du khách");
  assert.equal(body[4].tone, "tip");
  assert.equal(body[5].src, "/images/ky-co.jpg");
  assert.equal(body[5].alt, "EN Ảnh Kỳ Co");
  assert.equal(applied.data.title, article.title);
});

test("hero, landing and settings map only fields with an English counterpart", () => {
  const heroFields = collectTranslationFields("hero", hero);
  assert.ok(heroFields.some((field) => field.path === "vi.titleLine1"));
  assert.ok(heroFields.some((field) => field.path === "slides.0.caption"));
  assert.ok(!heroFields.some((field) => field.path === "slides.0.image.alt"));
  assert.equal(isAllowedTranslationPath("hero", "vi.badge"), true);
  assert.equal(isAllowedTranslationPath("hero", "slides.0.image.src"), false);

  const appliedHero = applyTranslationResults(
    "hero",
    hero,
    undefined,
    heroFields.map((field) => ({ path: field.path, value: `EN ${field.value}` })),
  );
  const heroEn = appliedHero.data.en as Record<string, unknown>;
  const slides = appliedHero.data.slides as Record<string, unknown>[];
  assert.equal(heroEn.titleLine1, "EN Chạm");
  assert.deepEqual(appliedHero.data.vi, hero.vi);
  assert.equal(slides[0].captionEn, "EN Chạm vào mùa xanh");
  assert.equal((slides[0].image as Record<string, unknown>).src, "/a.jpg");

  const explore = collectTranslationFields("landing", landing, "explore");
  assert.deepEqual(
    explore.map((field) => field.target),
    [
      "explore.eyebrowEn",
      "explore.titleAEn",
      "explore.titleBEn",
      "explore.bodyEn",
      "explore.footnoteEn",
    ],
  );
  assert.equal(isAllowedTranslationPath("landing", "explore.titleA", "explore"), true);
  assert.equal(isAllowedTranslationPath("landing", "explore.titleA", "story"), false);
  assert.equal(isAllowedTranslationPath("landing", "finder.suggestions.0.label", "explore"), false);

  const featured = collectTranslationFields("landing", landing, "featured");
  assert.equal(featured[0].target, "featured.scopes.cat_qnpy.titleEn");

  const settingsFields = collectTranslationFields("settings", settings);
  assert.deepEqual(
    settingsFields.map((field) => field.target).sort(),
    [
      "contact.workingHoursEn",
      "footerLinks.0.labelEn",
      "seo.homeDescriptionEn",
      "seo.homeTitleEn",
    ].sort(),
  );
});

test("overwrite confirmation only appears when an English counterpart already has text", () => {
  assert.equal(hasExistingTranslation("tour", tour), false);
  assert.equal(existingTranslationCount("tour", tour), 0);
  const withEn = { ...tour, _en: { title: "An owner-written title" } };
  assert.equal(hasExistingTranslation("tour", withEn), true);
  assert.equal(existingTranslationCount("tour", withEn), 1);
});

test("late response cannot overwrite an English edit made while waiting", () => {
  const initial = {
    ...tour,
    _en: { title: "Old title", summary: "Existing summary" },
  };
  const snapshot = createTranslationSnapshot("tour", initial);
  const edited = {
    ...initial,
    _en: { title: "Owner edited this while waiting", summary: "Existing summary" },
  };
  const results = collectTranslationFields("tour", tour).map((field) => ({
    path: field.path,
    value: `EN ${field.value}`,
  }));
  const applied = applyTranslationResults("tour", edited, undefined, results, snapshot);
  const en = applied.data._en as Record<string, unknown>;
  assert.equal(en.title, "Owner edited this while waiting");
  assert.equal(en.summary, "EN Một ngày chạm biển xanh.");
  assert.equal(applied.skipped, 1);
  assert.ok(applied.applied > 0);
});

test("late response cannot overwrite a Vietnamese edit made while waiting", () => {
  const snapshot = createTranslationSnapshot("article", article);
  const edited = { ...article, title: "Tiêu đề vừa sửa" };
  const applied = applyTranslationResults(
    "article",
    edited,
    undefined,
    [{ path: "title", value: "Late title" }, { path: "excerpt", value: "Late excerpt" }],
    snapshot,
  );
  const en = applied.data._en as Record<string, unknown>;
  assert.equal(en.title, undefined);
  assert.equal(en.excerpt, "Late excerpt");
  assert.equal(applied.skipped, 1);
});

test("a structural edit while waiting cancels the whole batch", () => {
  const snapshot = createTranslationSnapshot("tour", tour);
  const edited = {
    ...tour,
    itinerary: [
      ...tour.itinerary,
      {
        id: "day_2",
        index: 2,
        title: "Ngày 2",
        activities: [],
        meals: [],
        places: [],
      },
    ],
  };
  const applied = applyTranslationResults(
    "tour",
    edited,
    undefined,
    [{ path: "title", value: "Late title" }],
    snapshot,
  );
  assert.equal(applied.stale, true);
  assert.equal(applied.applied, 0);
  assert.equal(applied.data, edited);
});

test("source signature ignores English edits and changes with Vietnamese text", () => {
  const base = translationSourceSignature("tour", tour);
  const enEdit = translationSourceSignature("tour", {
    ...tour,
    _en: { title: "English only" },
  });
  assert.equal(enEdit, base);
  const viEdit = translationSourceSignature("tour", { ...tour, title: "Khác" });
  assert.notEqual(viEdit, base);
  assert.equal(translationStructureSignature("tour", { ...tour, title: "Khác" }), translationStructureSignature("tour", tour));
});

test("valueAtPath reads nested and indexed targets", () => {
  assert.equal(valueAtPath({ _en: { itinerary: [{ title: "Day" }] } }, "_en.itinerary.0.title"), "Day");
  assert.equal(valueAtPath(tour, "missing.path"), "");
});

test("brand, links, prices and placeholders survive masking", () => {
  const source = "SEA TRIP · 1.250.000 ₫ · https://example.com/tour · {name} · 09:00";
  const protectedText = protectTranslationText(source);
  assert.ok(protectedText.tokens.length >= 4);
  assert.ok(!protectedText.text.includes("SEA TRIP"));
  assert.ok(!protectedText.text.includes("https://"));
  assert.ok(!protectedText.text.includes("1.250.000"));
  const restored = restoreTranslationText(
    `Bản dịch ${protectedText.text}`,
    protectedText.tokens,
  );
  assert.equal(restored.restored, true);
  assert.ok(restored.text.includes("SEA TRIP"));
  assert.ok(restored.text.includes("1.250.000 ₫"));
  assert.ok(restored.text.includes("https://example.com/tour"));
  assert.ok(restored.text.includes("{name}"));
  const missing = restoreTranslationText("No token returned", ["SEA TRIP"]);
  assert.equal(missing.restored, false);
});

test("Google responses decode HTML entities without executing markup", () => {
  assert.equal(decodeTranslationEntities("Xin chào &#39;bạn&#39; &amp; &#x1F30A;"), "Xin chào 'bạn' & 🌊");
});

test("preview overlays English on unsaved form data and falls back per field", () => {
  const data = { ...tour, _en: { title: "English title", imageAlts: ["English alt"] } };
  const vi = previewRecord("tours", data, "vi");
  const en = previewRecord("tours", data, "en");
  assert.equal(vi.title, tour.title);
  assert.equal(en.title, "English title");
  assert.equal(en.summary, tour.summary);
  assert.equal((en.images as { alt: string }[])[0].alt, "English alt");
  assert.equal((en.images as { src: string }[])[0].src, "/images/ky-co.jpg");
  assert.equal(hasEnglishOverlay("tours", data), true);
  assert.equal(hasEnglishOverlay("tours", tour), false);
});

test("batches stay under the provider string cap while preserving order", () => {
  const values = Array.from({ length: 200 }, (_, index) => `value-${index}`);
  const batches = batchTranslationTexts(values);
  assert.ok(batches.length >= 2);
  assert.ok(batches.every((batch) => batch.length <= TRANSLATION_LIMITS.batchSize));
  assert.deepEqual(batches.flat(), values);
});

/* -------------------------------------------------------------------------- */
/* HTTP handler                                                               */
/* -------------------------------------------------------------------------- */

function translateRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://example.com/api/admin/translate", {
    method: "POST",
    headers: {
      origin: "https://example.com",
      "x-csrf-token": "csrf",
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function translateRawRequest(body: string) {
  return new Request("https://example.com/api/admin/translate", {
    method: "POST",
    headers: {
      origin: "https://example.com",
      "x-csrf-token": "csrf",
      "content-type": "application/json",
    },
    body,
  });
}

function deps(overrides: Partial<Parameters<typeof handleTranslate>[1]> = {}) {
  const used = { dayChars: 0, monthChars: 0 };
  return {
    requireSession: async () => ({ hash: "session-hash" }),
    consumeLimit: () => true,
    consumeBudget: (characters: number) => {
      const decision = decideTranslationBudget({
        limits: TRANSLATION_BUDGET_DEFAULTS,
        usage: { ...used },
        characters,
      });
      if (decision.allowed) {
        used.dayChars += characters;
        used.monthChars += characters;
      }
      return decision;
    },
    refundBudget: (characters: number) => {
      used.dayChars = Math.max(0, used.dayChars - characters);
      used.monthChars = Math.max(0, used.monthChars - characters);
    },
    translate: async (values: readonly string[]) => values.map((value) => `EN ${value}`),
    ...overrides,
  };
}

function budgetDeps(limits: TranslationBudgetLimits) {
  const used = { dayChars: 0, monthChars: 0 };
  return {
    consumeBudget: (characters: number) => {
      const decision = decideTranslationBudget({
        limits,
        usage: { ...used },
        characters,
      });
      if (decision.allowed) {
        used.dayChars += characters;
        used.monthChars += characters;
      }
      return decision;
    },
    refundBudget: (characters: number) => {
      used.dayChars = Math.max(0, used.dayChars - characters);
      used.monthChars = Math.max(0, used.monthChars - characters);
    },
  };
}

test("translation route returns path-keyed English text without writing data", async () => {
  const response = await handleTranslate(
    translateRequest({ kind: "tour", fields: [{ path: "title", value: "Kỳ Co" }] }),
    deps(),
  );
  assert.equal(response.status, 200);
  const payload = (await response.json()) as {
    translations: unknown;
    usage: unknown;
  };
  assert.deepEqual(payload.translations, [{ path: "title", value: "EN Kỳ Co" }]);
  assert.deepEqual(payload.usage, {
    characters: 5,
    day: { used: 5, limit: 15_000, remaining: 14_995 },
    month: { used: 5, limit: 450_000, remaining: 449_995 },
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("translation route rejects missing session, bad origin/CSRF and rate limits", async () => {
  const unauthorized = await handleTranslate(
    translateRequest({ kind: "tour", fields: [{ path: "title", value: "x" }] }),
    deps({
      requireSession: async () => {
        throw new HttpError(401, "Vui lòng đăng nhập");
      },
    }),
  );
  assert.equal(unauthorized.status, 401);

  const forbidden = await handleTranslate(
    translateRequest({ kind: "tour", fields: [{ path: "title", value: "x" }] }),
    deps({
      requireSession: async () => {
        throw new HttpError(403, "Nguồn yêu cầu không hợp lệ");
      },
    }),
  );
  assert.equal(forbidden.status, 403);

  const limited = await handleTranslate(
    translateRequest({ kind: "tour", fields: [{ path: "title", value: "x" }] }),
    deps({ consumeLimit: () => false }),
  );
  assert.equal(limited.status, 429);
});

test("translation route rejects paths outside the allowlist and unknown sections", async () => {
  const pathResponse = await handleTranslate(
    translateRequest({ kind: "tour", fields: [{ path: "slug", value: "demo" }] }),
    deps(),
  );
  assert.equal(pathResponse.status, 400);
  assert.match(
    ((await pathResponse.json()) as { error: string }).error,
    /không được phép/,
  );

  const sectionResponse = await handleTranslate(
    translateRequest({
      kind: "landing",
      fields: [{ path: "explore.titleA", value: "x" }],
    }),
    deps(),
  );
  assert.equal(sectionResponse.status, 400);

  const duplicated = await handleTranslate(
    translateRequest({
      kind: "tour",
      fields: [
        { path: "title", value: "a" },
        { path: "title", value: "b" },
      ],
    }),
    deps(),
  );
  assert.equal(duplicated.status, 400);
});

test("translation route enforces body/field character limits", async () => {
  const tooLong = await handleTranslate(
    translateRequest({
      kind: "tour",
      fields: Array.from({ length: 5 }, (_, index) => ({
        path: `highlights.${index}`,
        value: "x".repeat(TRANSLATION_LIMITS.maxFieldChars),
      })),
    }),
    deps(),
  );
  assert.equal(tooLong.status, 413);

  const tooLargeBody = await handleTranslate(
    translateRawRequest(
      JSON.stringify({
        kind: "tour",
        fields: [{ path: "title", value: "x" }],
        padding: "x".repeat(TRANSLATION_LIMITS.maxRequestBodyBytes + 1),
      }),
    ),
    deps(),
  );
  assert.equal(tooLargeBody.status, 413);
});

test("translation route maps provider failures to safe errors", async () => {
  const timeout = await handleTranslate(
    translateRequest({ kind: "tour", fields: [{ path: "title", value: "x" }] }),
    deps({
      translate: async () => {
        throw new TranslationTimeoutError();
      },
    }),
  );
  assert.equal(timeout.status, 504);

  const upstream = await handleTranslate(
    translateRequest({ kind: "tour", fields: [{ path: "title", value: "x" }] }),
    deps({
      translate: async () => {
        throw new TranslationUpstreamError(500);
      },
    }),
  );
  assert.equal(upstream.status, 502);

  const invalid = await handleTranslate(
    translateRequest({ kind: "tour", fields: [{ path: "title", value: "x" }] }),
    deps({ translate: async () => [] }),
  );
  assert.equal(invalid.status, 502);

  const missingConfig = await handleTranslate(
    translateRequest({ kind: "tour", fields: [{ path: "title", value: "x" }] }),
    deps({
      translate: async () => {
        throw new TranslationNotConfiguredError();
      },
    }),
  );
  assert.equal(missingConfig.status, 503);
});

/* -------------------------------------------------------------------------- */
/* Free-tier character budget                                                 */
/* -------------------------------------------------------------------------- */

test("budget periods follow the Vietnam calendar day and month", () => {
  // 17:30 UTC is already 00:30 of the next day in Vietnam (UTC+7).
  assert.deepEqual(translationBudgetPeriods(new Date("2026-10-28T17:30:00Z")), {
    day: "day:2026-10-29",
    month: "month:2026-10",
  });
  assert.deepEqual(translationBudgetPeriods(new Date("2026-10-31T16:59:00Z")), {
    day: "day:2026-10-31",
    month: "month:2026-10",
  });
  // 17:00 UTC on 31 Oct is 1 Nov in Vietnam, so the month resets too.
  assert.deepEqual(translationBudgetPeriods(new Date("2026-10-31T17:00:00Z")), {
    day: "day:2026-11-01",
    month: "month:2026-11",
  });
});

test("budget limits keep a safe default instead of silently disabling the guard", () => {
  assert.equal(translationBudgetLimit(undefined, 15_000), 15_000);
  assert.equal(translationBudgetLimit("", 15_000), 15_000);
  assert.equal(translationBudgetLimit("abc", 15_000), 15_000);
  assert.equal(translationBudgetLimit("-5", 15_000), 15_000);
  assert.equal(translationBudgetLimit("0", 15_000), 0);
  assert.equal(translationBudgetLimit("12000", 15_000), 12_000);
  assert.equal(translationBudgetLimit(15_000.9, 1), 15_000);
  assert.equal(translationBudgetLimit("999999999", 1), 20_000_000);
});

test("budget decision blocks the day first, then the month, and allows exact fits", () => {
  const limits = { dailyChars: 100, monthlyChars: 1000 };
  const exact = decideTranslationBudget({
    limits,
    usage: { dayChars: 0, monthChars: 0 },
    characters: 100,
  });
  assert.equal(exact.allowed, true);
  assert.deepEqual(exact.remaining, { day: 0, month: 900 });

  const overDay = decideTranslationBudget({
    limits,
    usage: { dayChars: 96, monthChars: 96 },
    characters: 5,
  });
  assert.equal(overDay.allowed, false);
  assert.equal(overDay.reason, "day");
  assert.equal(overDay.usage.dayChars, 96);

  const overMonth = decideTranslationBudget({
    limits,
    usage: { dayChars: 0, monthChars: 998 },
    characters: 3,
  });
  assert.equal(overMonth.allowed, false);
  assert.equal(overMonth.reason, "month");

  const unlimited = decideTranslationBudget({
    limits: { dailyChars: 0, monthlyChars: 0 },
    usage: { dayChars: 10_000, monthChars: 10_000 },
    characters: 50_000,
  });
  assert.equal(unlimited.allowed, true);
  assert.deepEqual(unlimited.remaining, { day: null, month: null });
});

test("translation route stops at the daily free-tier budget", async () => {
  const translated: string[][] = [];
  const response = await handleTranslate(
    translateRequest({ kind: "tour", fields: [{ path: "title", value: "Kỳ Co" }] }),
    deps({
      ...budgetDeps({ dailyChars: 6, monthlyChars: 450_000 }),
      translate: async (values) => {
        translated.push([...values]);
        return values.map((value) => `EN ${value}`);
      },
    }),
  );
  assert.equal(response.status, 200);

  const blocked = await handleTranslate(
    translateRequest({ kind: "tour", fields: [{ path: "title", value: "Bãi Xép" }] }),
    deps({
      ...budgetDeps({ dailyChars: 6, monthlyChars: 450_000 }),
      consumeBudget: (characters: number) =>
        decideTranslationBudget({
          limits: { dailyChars: 6, monthlyChars: 450_000 },
          usage: { dayChars: 5, monthChars: 5 },
          characters,
        }),
      translate: async (values) => {
        translated.push([...values]);
        return values.map((value) => `EN ${value}`);
      },
    }),
  );
  assert.equal(blocked.status, 429);
  const message = ((await blocked.json()) as { error: string }).error;
  assert.match(message, /hạn mức/i);
  assert.match(message, /TRANSLATION_DAILY_CHAR_LIMIT/);
  // The provider is never called once the guard refuses the request.
  assert.equal(translated.length, 1);
});

test("translation route stops at the monthly free-tier budget", async () => {
  const blocked = await handleTranslate(
    translateRequest({ kind: "tour", fields: [{ path: "title", value: "Kỳ Co" }] }),
    deps({
      consumeBudget: (characters: number) =>
        decideTranslationBudget({
          limits: { dailyChars: 0, monthlyChars: 10 },
          usage: { dayChars: 8, monthChars: 8 },
          characters,
        }),
    }),
  );
  assert.equal(blocked.status, 429);
  const message = ((await blocked.json()) as { error: string }).error;
  assert.match(message, /tháng này/);
  assert.match(message, /TRANSLATION_MONTHLY_CHAR_LIMIT/);
});

test("a missing provider key refunds the reserved characters", async () => {
  const limits: TranslationBudgetLimits = { dailyChars: 10, monthlyChars: 100 };
  const budget = budgetDeps(limits);
  const failed = await handleTranslate(
    translateRequest({ kind: "tour", fields: [{ path: "title", value: "abcdefghij" }] }),
    deps({
      ...budget,
      translate: async () => {
        throw new TranslationNotConfiguredError();
      },
    }),
  );
  assert.equal(failed.status, 503);

  // The reservation was returned, so the same 10 characters still fit today.
  const decision = budget.consumeBudget(10);
  assert.equal(decision.allowed, true);
  assert.equal(decision.usage.dayChars, 10);
});

test("translation budget counters persist in SQLite across days and months", () => {
  const directory = mkdtempSync(join(tmpdir(), "seatrip-translation-budget-"));
  const previous = process.env.CMS_DB_PATH;
  process.env.CMS_DB_PATH = join(directory, "seatrip.sqlite");
  try {
    const day1 = consumeTranslationBudget(100, new Date("2026-10-28T03:00:00Z"));
    assert.equal(day1.allowed, true);
    assert.equal(day1.usage.dayChars, 100);

    const sameDay = consumeTranslationBudget(100, new Date("2026-10-28T04:00:00Z"));
    assert.equal(sameDay.usage.dayChars, 200);
    assert.equal(sameDay.usage.monthChars, 200);

    const nextDay = consumeTranslationBudget(100, new Date("2026-10-29T01:00:00Z"));
    assert.equal(nextDay.usage.dayChars, 100);
    assert.equal(nextDay.usage.monthChars, 300);

    refundTranslationBudget(100, new Date("2026-10-29T02:00:00Z"));
    const refunded = consumeTranslationBudget(0, new Date("2026-10-29T02:00:00Z"));
    assert.equal(refunded.usage.dayChars, 0);
    assert.equal(refunded.usage.monthChars, 200);

    // A refund can never drive the stored counter below zero.
    refundTranslationBudget(999, new Date("2026-10-29T02:00:00Z"));
    const floored = consumeTranslationBudget(0, new Date("2026-10-29T02:00:00Z"));
    assert.equal(floored.usage.dayChars, 0);
    assert.equal(floored.usage.monthChars, 0);
  } finally {
    if (previous === undefined) delete process.env.CMS_DB_PATH;
    else process.env.CMS_DB_PATH = previous;
  }
});

/* -------------------------------------------------------------------------- */
/* Google adapter                                                             */
/* -------------------------------------------------------------------------- */

test("Google adapter posts q/source/target/format and restores protected text", async () => {
  let seenUrl = "";
  let seenBody: Record<string, unknown> = {};
  const fakeFetch = (async (url: URL | RequestInfo, init?: RequestInit) => {
    seenUrl = String(url);
    seenBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    const q = seenBody.q as string[];
    return new Response(
      JSON.stringify({
        data: {
          translations: [
            { translatedText: `${q[0]}` },
            { translatedText: "Second" },
          ],
        },
      }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;

  const result = await translateWithGoogle(["SEA TRIP 'hello'", "Hai"], {
    apiKey: "test-key",
    fetchImpl: fakeFetch,
  });
  assert.deepEqual(result, ["SEA TRIP 'hello'", "Second"]);
  assert.match(seenUrl, /translation\.googleapis\.com\/language\/translate\/v2/);
  assert.match(seenUrl, /key=test-key/);
  assert.deepEqual(seenBody, {
    q: ["[[SEATRIP_A]] 'hello'", "Hai"],
    source: "vi",
    target: "en",
    format: "text",
  });
});

test("Google adapter never reports a raw key or upstream body", async () => {
  await assert.rejects(
    translateWithGoogle(["x"], { apiKey: "" }),
    TranslationNotConfiguredError,
  );

  const failing = (async () =>
    new Response("upstream detail with key=secret", { status: 500 })) as unknown as typeof fetch;
  await assert.rejects(
    translateWithGoogle(["x"], { apiKey: "secret", fetchImpl: failing }),
    (error: unknown) =>
      error instanceof TranslationUpstreamError &&
      error.status === 500 &&
      !error.message.includes("secret"),
  );

  const malformed = (async () =>
    new Response(JSON.stringify({ data: { translations: [] } }), {
      status: 200,
    })) as unknown as typeof fetch;
  await assert.rejects(
    translateWithGoogle(["x"], { apiKey: "secret", fetchImpl: malformed }),
    TranslationInvalidResponseError,
  );
});

test("Google adapter aborts on timeout and reports a timeout, not partial data", async () => {
  const hanging = ((_: URL | RequestInfo, init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      if (init?.signal?.aborted) {
        const error = new Error("aborted");
        error.name = "TimeoutError";
        reject(error);
        return;
      }
      // Keep the event loop alive so the timeout signal can fire under node:test.
      const keepAlive = setInterval(() => {}, 50);
      init?.signal?.addEventListener("abort", () => {
        clearInterval(keepAlive);
        const error = new Error("aborted");
        error.name = "TimeoutError";
        reject(error);
      });
    })) as unknown as typeof fetch;

  await assert.rejects(
    translateWithGoogle(["x"], {
      apiKey: "secret",
      fetchImpl: hanging,
      timeoutMs: 10,
    }),
    TranslationTimeoutError,
  );
});

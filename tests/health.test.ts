import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Tour } from "../src/domain/tour";
import type { TravelArticle } from "../src/domain/article";
import type { TourCategory } from "../src/domain/category";
import {
  budgetStatus,
  deviceOf,
  formatBytes,
  percentUsed,
  percentile75,
  PROJECT_MEMORY_LIMIT_BYTES,
  PROJECT_STORAGE_LIMIT_BYTES,
  ratingFor,
  seoStatus,
} from "../src/lib/health";
import { auditSeo } from "../src/server/health/seo";
import { measureStorage } from "../src/server/health/disk";

const tourTitle = "Tour Quy Nhơn – Phú Yên 3 ngày 2 đêm trọn gói";
const articleTitle = "Kinh nghiệm du lịch Quy Nhơn – Phú Yên mùa hè";
const categoryTitle = "Tour Quy Nhơn – Phú Yên chọn lọc theo ngày";
const tourDescription =
  "Khám phá Kỳ Co, Eo Gió và Ghềnh Đá Đĩa trong hành trình ba ngày hai đêm, có xe đưa đón và khách sạn gần biển.";
const articleDescription =
  "Chia sẻ lịch trình, chi phí và kinh nghiệm đi Quy Nhơn – Phú Yên tự túc, phù hợp cho gia đình và nhóm bạn.";
const categoryDescription =
  "Tổng hợp tour Quy Nhơn – Phú Yên theo số ngày, có giá tham khảo, điểm đón rõ ràng và lịch trình chi tiết.";

function tour(overrides: Record<string, unknown> = {}): Tour {
  return {
    id: "tour_health_a",
    slug: "tour-health-a",
    title: "Tour sức khỏe A",
    summary: tourDescription,
    categoryIds: ["cat_health"],
    destinationIds: ["dest_health"],
    duration: { days: 2, nights: 1 },
    departurePoints: [],
    returnPoints: [],
    transport: [],
    sourceDocuments: [],
    pricingOptions: [],
    gifts: [],
    priceFrom: null,
    highlights: [],
    images: [{ src: "/images/health-a.jpg", alt: "Ảnh tour A" }],
    overview: [],
    itinerary: [],
    included: [],
    excluded: [],
    notes: [],
    policies: [],
    tags: [],
    badge: "",
    seo: { title: tourTitle, description: tourDescription },
    contentStatus: "verified",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  } as unknown as Tour;
}

function article(overrides: Record<string, unknown> = {}): TravelArticle {
  return {
    id: "art_health_a",
    slug: "bai-viet-health-a",
    title: "Kinh nghiệm đi Quy Nhơn mùa hè",
    excerpt: articleDescription,
    destinationIds: ["dest_health"],
    relatedTourSlugs: ["tour-health-a"],
    tags: [],
    cover: { src: "/images/health-article.jpg", alt: "Ảnh bài viết" },
    body: [],
    author: "SEA TRIP TRAVEL",
    publishedAt: "2026-10-01",
    featured: false,
    seo: { title: articleTitle, description: articleDescription },
    contentStatus: "verified",
    ...overrides,
  } as unknown as TravelArticle;
}

function category(overrides: Record<string, unknown> = {}): TourCategory {
  return {
    id: "cat_health",
    slug: "tour-suc-khoe",
    path: "/tour-suc-khoe",
    name: "Tour sức khỏe",
    parentId: null,
    region: "mien-trung",
    description: categoryDescription,
    order: 0,
    seo: { title: categoryTitle, description: categoryDescription },
    contentStatus: "verified",
    ...overrides,
  } as unknown as TourCategory;
}

test("health formatting and thresholds stay stable", () => {
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1536), "1,5 KB");
  assert.equal(formatBytes(5 * 1024 ** 3), "5 GB");
  assert.equal(formatBytes(null), "—");
  assert.equal(PROJECT_STORAGE_LIMIT_BYTES, 5 * 1024 ** 3);
  assert.equal(PROJECT_MEMORY_LIMIT_BYTES, 5 * 1024 ** 3);
  assert.equal(percentUsed(0, PROJECT_STORAGE_LIMIT_BYTES), 0);
  assert.equal(percentUsed(88, 100), 88);
  assert.equal(percentUsed(150, 100), 100);
  assert.equal(percentUsed(1, 0), 0);
  assert.equal(budgetStatus(50), "good");
  assert.equal(budgetStatus(88), "warn");
  assert.equal(budgetStatus(95), "bad");
  assert.equal(percentile75([1, 2, 3, 4]), 3);
  assert.equal(percentile75([4, 1, 3, 2]), 3);
  assert.equal(percentile75([]), null);
  assert.equal(ratingFor("lcp", 2000), "good");
  assert.equal(ratingFor("lcp", 3000), "warn");
  assert.equal(ratingFor("lcp", 5000), "bad");
  assert.equal(seoStatus(90), "good");
  assert.equal(seoStatus(70), "warn");
  assert.equal(seoStatus(40), "bad");
  assert.equal(deviceOf(390), "mobile");
  assert.equal(deviceOf(800), "tablet");
  assert.equal(deviceOf(1440), "desktop");
});

test("a healthy catalogue scores 100 and reports no issues", () => {
  const result = auditSeo({
    tours: [tour()],
    articles: [article()],
    categories: [category()],
    sitemapUrls: 12,
    englishStatus: () => "reviewed",
  });
  assert.equal(result.score, 100);
  assert.equal(result.status, "good");
  assert.equal(result.issues.length, 0);
  assert.equal(result.translation.reviewed, 3);
});

test("missing metadata, placeholder slugs and dead ends are reported", () => {
  const result = auditSeo({
    tours: [
      tour({
        id: "tour_health_b",
        slug: "noi-dung-abc123",
        title: "Tour B",
        seo: undefined,
        images: [],
      }),
      tour({
        id: "tour_health_c",
        slug: "tour-health-c",
        title: "Tour C",
        seo: { title: tourTitle, description: tourDescription },
        destinationIds: [],
      }),
    ],
    articles: [
      article({
        id: "art_health_b",
        slug: "bai-viet-health-b",
        relatedTourSlugs: [],
        cover: undefined,
        seo: undefined,
      }),
    ],
    categories: [
      category({ id: "cat_empty", slug: "cat-empty", name: "Danh mục rỗng" }),
    ],
    sitemapUrls: 0,
    englishStatus: (_kind, id) => (id === "tour_health_b" ? "draft" : "missing"),
  });

  const ids = new Set(result.issues.map((issue) => issue.id));
  for (const expected of [
    "missing-seo-title",
    "missing-seo-description",
    "placeholder-slug",
    "missing-cover",
    "article-no-tour",
    "empty-category",
    "sitemap",
    "english-draft",
    "english-missing",
  ])
    assert.ok(ids.has(expected), `expected issue ${expected}`);
  assert.ok(result.score < 80);
  assert.equal(result.status !== "good", true);
  assert.equal(result.translation.reviewed, 0);
});

test("duplicate titles and descriptions are caught", () => {
  const result = auditSeo({
    tours: [
      tour({ id: "tour_dup_a", slug: "tour-dup-a" }),
      tour({ id: "tour_dup_b", slug: "tour-dup-b" }),
    ],
    articles: [],
    categories: [],
    sitemapUrls: 4,
    englishStatus: () => "reviewed",
  });
  const duplicate = result.issues.find((issue) => issue.id === "duplicate-title");
  assert.ok(duplicate);
  assert.equal(duplicate?.count, 2);
  assert.equal(duplicate?.severity, "high");
});

test("each issue lists affected pages and links into the editor", () => {
  const many = Array.from({ length: 30 }, (_, index) =>
    tour({
      id: `tour_cap_${index}`,
      slug: `tour-cap-${index}`,
      title: `Tour cap ${index}`,
      seo: undefined,
    }),
  );
  const result = auditSeo({
    tours: many,
    articles: [],
    categories: [],
    sitemapUrls: 10,
    englishStatus: () => "draft",
  });
  const titles = result.issues.find((issue) => issue.id === "missing-seo-title");
  assert.ok(titles);
  assert.equal(titles?.area, "metadata");
  assert.equal(titles?.count, 30);
  // The drill-down is capped so the payload stays readable.
  assert.equal(titles?.items.length, 25);
  assert.equal(titles?.hidden, 5);
  assert.equal(titles?.items[0].href, "/admin/tours?edit=tour-cap-0");
  assert.equal(titles?.items[0].label, "Tour cap 0");

  const english = result.issues.find((issue) => issue.id === "english-draft");
  assert.ok(english);
  assert.equal(english?.area, "translation");
  assert.match(
    english?.items[0].href ?? "",
    /^\/admin\/tours\?edit=tour-cap-0#tour-section-translations$/,
  );
});

test("storage reports database, uploads and the rest of the data folder", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "seatrip-health-disk-"));
  const uploads = path.join(root, "uploads");
  mkdirSync(uploads);
  const dbPath = path.join(root, "seatrip.sqlite");
  writeFileSync(dbPath, Buffer.alloc(100));
  writeFileSync(path.join(uploads, "a.jpg"), Buffer.alloc(200));
  writeFileSync(path.join(uploads, "b.webp"), Buffer.alloc(100));
  writeFileSync(path.join(root, "other.json"), Buffer.alloc(50));
  try {
    const result = await measureStorage({
      dataDir: root,
      dbPath,
      uploadsDir: uploads,
      includeVolume: false,
    });
    assert.equal(result.available, true);
    assert.equal(result.databaseBytes, 100);
    assert.equal(result.uploadsBytes, 300);
    assert.equal(result.uploadFiles, 2);
    assert.equal(result.dataBytes, 450);
    assert.equal(result.otherBytes, 50);
    assert.equal(result.volumeTotalBytes, null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("real-user vitals are stored anonymously and aggregated as p75", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "seatrip-health-vitals-"));
  process.env.CMS_DB_PATH = path.join(root, "cms.sqlite");
  process.env.CMS_ENABLED = "1";
  process.env.LEAD_ENCRYPTION_KEY = "a".repeat(64);
  const { db } = await import("../src/server/cms/db");
  const { recordVitals, getSpeed } = await import("../src/server/health/vitals");
  try {
    const base = {
      path: "/tour/quy-nhon-ky-co",
      device: "mobile",
      navigationType: "navigate",
      userAgent: "Mozilla/5.0 Chrome/120",
    };
    for (const value of [1000, 2000, 3000, 4000])
      recordVitals({ ...base, metrics: [{ name: "LCP", value }] });
    recordVitals({ ...base, metrics: [{ name: "LCP", value: 9999 }], path: "/admin" });
    recordVitals({
      ...base,
      metrics: [{ name: "LCP", value: 9999 }],
      userAgent: "Googlebot/2.1",
    });
    recordVitals({
      ...base,
      metrics: [
        { name: "CLS", value: 0.04 },
        { name: "INP", value: 120 },
      ],
    });

    const speed = getSpeed(7);
    assert.equal(speed.hasData, true);
    assert.equal(speed.samples, 4);
    const lcp = speed.metrics.find((metric) => metric.key === "lcp");
    assert.equal(lcp?.value, 3000);
    assert.equal(lcp?.status, "warn");
    assert.equal(lcp?.samples, 4);
    const cls = speed.metrics.find((metric) => metric.key === "cls");
    assert.equal(cls?.value, 0.04);
    // One sample is shown but not rated; the card waits for three.
    assert.equal(cls?.status, "unknown");
    assert.equal(speed.worstPages.length, 1);
    assert.equal(speed.worstPages[0].path, "/tour/quy-nhon-ky-co");
  } finally {
    db().close();
    rmSync(root, { recursive: true, force: true });
  }
});

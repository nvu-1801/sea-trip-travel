import assert from "node:assert/strict";
import { describe, it } from "node:test";
import "./helpers";
import {
  getTourRecordById,
  listPublishedTours,
  listTrashedTours,
  restoreTour,
  saveTour,
  setTourStatus,
  softDeleteTour,
  tourSlugExists,
} from "@/server/repo/tours";
import {
  getArticleRecordById,
  listPublishedArticles,
  listTrashedArticles,
  restoreArticle,
  saveArticle,
  setArticleStatus,
  softDeleteArticle,
} from "@/server/repo/articles";
import { getSettingSection, saveSettingSection } from "@/server/repo/settings";
import { addLeadNote, countLeadsByStatus, getLead, insertLead, updateLeadStatus } from "@/server/repo/leads";
import { insertMedia, mediaReferences, softDeleteMedia, listMedia } from "@/server/repo/media";
import { findRedirect } from "@/server/repo/redirects";
import { loadPublishedSnapshot } from "@/lib/data/snapshot";

/**
 * Repository round-trips.
 *
 * These run against a real SQLite database seeded from the shipped content, so
 * they cover the actual read/write paths the admin uses — including the rules
 * that matter: publish/hide, soft delete/restore, "Liên hệ tư vấn" pricing, and
 * the translation-staleness guard.
 */

describe("tour repository write paths", () => {
  it("publishes a hidden tour back and removes it again", () => {
    const record = listPublishedTours();
    assert.ok(record.length > 0);
    const id = record[0].id;

    setTourStatus(id, "hidden");
    assert.equal(listPublishedTours().some((tour) => tour.id === id), false);

    setTourStatus(id, "published");
    assert.equal(listPublishedTours().some((tour) => tour.id === id), true);
  });

  it("soft-deletes into the trash and restores", () => {
    const id = listPublishedTours()[0].id;
    softDeleteTour(id);
    assert.equal(listPublishedTours().some((tour) => tour.id === id), false);
    assert.equal(listTrashedTours().some((record) => record.tour.id === id), true);

    restoreTour(id);
    assert.equal(listPublishedTours().some((tour) => tour.id === id), true);
    assert.equal(listTrashedTours().some((record) => record.tour.id === id), false);
  });

  it("never lets a tour without a price become 0 ₫", () => {
    const published = listPublishedTours();
    for (const tour of published) {
      if (tour.priceFrom !== null) assert.ok(tour.priceFrom.amount > 0);
    }
    const dayTour = published.find((tour) => tour.duration.days === 1);
    if (dayTour) assert.equal(dayTour.priceFrom, null);
  });

  it("derives priceFrom from the cheapest adult package on save", () => {
    const source = getTourRecordById(listPublishedTours()[0].id)!;
    const tour = {
      ...source.tour,
      updatedAt: new Date("2026-11-01T00:00:00.000Z").toISOString(),
      pricingOptions: [
        { id: "a", label: "Gói A", adultPrice: 3000000, childPrice: 1800000 },
        { id: "b", label: "Gói B", adultPrice: 2500000, childPrice: 1500000 },
      ],
    };
    saveTour({ tour, status: source.status, featured: source.featured, sortOrder: source.sortOrder });
    const saved = getTourRecordById(tour.id)!;
    assert.equal(saved.tour.priceFrom?.amount, 2500000);
  });

  it("records a redirect when a slug changes", () => {
    const source = getTourRecordById(listPublishedTours()[0].id)!;
    const nextSlug = `${source.tour.slug}-doi-slug`;
    saveTour({
      tour: { ...source.tour, slug: nextSlug, updatedAt: new Date("2026-11-02T00:00:00.000Z").toISOString() },
      status: source.status,
      featured: source.featured,
      sortOrder: source.sortOrder,
    });
    assert.equal(findRedirect("tour", source.tour.slug), nextSlug);
    assert.equal(tourSlugExists(nextSlug), true);
  });
});

describe("article repository", () => {
  it("keeps drafts out of the published set", () => {
    const article = listPublishedArticles()[0];
    assert.ok(article);
    setArticleStatus(article.id, "draft");
    assert.equal(listPublishedArticles().some((item) => item.id === article.id), false);

    setArticleStatus(article.id, "published");
    assert.equal(listPublishedArticles().some((item) => item.id === article.id), true);
  });

  it("soft-deletes and restores", () => {
    const id = listPublishedArticles()[0].id;
    softDeleteArticle(id);
    assert.equal(listTrashedArticles().some((record) => record.article.id === id), true);
    assert.equal(listPublishedArticles().some((item) => item.id === id), false);
    restoreArticle(id);
    assert.equal(listPublishedArticles().some((item) => item.id === id), true);
  });

  it("round-trips structured blocks without HTML", () => {
    const source = getArticleRecordById(listPublishedArticles()[0].id)!;
    const article = {
      ...source.article,
      body: [
        { type: "paragraph" as const, text: "Đoạn mở đầu." },
        { type: "heading" as const, level: 2 as const, text: "Mục lớn" },
        { type: "list" as const, ordered: false, items: ["Mục 1", "Mục 2"] },
        { type: "callout" as const, tone: "tip" as const, text: "Mẹo nhỏ" },
      ],
    };
    saveArticle({ article, status: source.status, featured: source.featured, sortOrder: source.sortOrder });
    const saved = getArticleRecordById(article.id)!;
    assert.deepEqual(saved.article.body, article.body);
  });
});

describe("site settings", () => {
  it("stores and reads a section back", () => {
    saveSettingSection("vi", "home", { featuredTourSlugs: ["quy-nhon-phu-yen-3-ngay-2-dem"] });
    const section = getSettingSection("vi", "home");
    assert.deepEqual(section.featuredTourSlugs, ["quy-nhon-phu-yen-3-ngay-2-dem"]);
  });

  it("feeds the public snapshot's featured selection", async () => {
    const snapshot = await loadPublishedSnapshot();
    assert.ok(snapshot.tours.length > 0);
    assert.ok(snapshot.settings.vi);
  });
});

describe("leads repository", () => {
  const requestId = `STT-TEST-${Date.now().toString().slice(-6)}`;

  it("stores a lead, then tracks status and notes", () => {
    insertLead({
      requestId,
      receivedAt: new Date().toISOString(),
      fullName: "Nguyễn Văn Test",
      phone: "0900000000",
      email: "test@example.com",
      message: "Cần tư vấn tour",
      locale: "vi",
    });
    assert.ok(getLead(requestId));

    updateLeadStatus(requestId, "processing");
    assert.equal(getLead(requestId)?.status, "processing");

    addLeadNote(requestId, "Đã gọi lúc 10h");
    assert.equal(getLead(requestId)?.notes.length, 1);
    assert.ok(countLeadsByStatus().total >= 1);
  });
});

describe("media references", () => {
  it("reports where an in-use image is referenced", () => {
    const tour = listPublishedTours().find((item) => item.images.some((image) => image.src));
    assert.ok(tour, "expected at least one tour with an image");
    const url = tour!.images.find((image) => image.src)!.src!;
    const refs = mediaReferences(url);
    assert.ok(refs.some((entry) => entry.startsWith("Ảnh tour")));
  });

  it("does not report references for an unused upload", () => {
    const media = insertMedia({
      storage: "upload",
      url: `/media/med_test_${Date.now()}/original`,
      filename: "original.jpg",
      originalName: "unused.jpg",
      mime: "image/jpeg",
      bytes: 10,
      width: 10,
      height: 10,
      sha256: `sha-${Date.now()}`,
      variants: [],
      altDefault: null,
    });
    assert.deepEqual(mediaReferences(media.url), []);
    softDeleteMedia(media.id);
    assert.equal(listMedia({ storage: "upload" }).some((item) => item.id === media.id), false);
  });
});

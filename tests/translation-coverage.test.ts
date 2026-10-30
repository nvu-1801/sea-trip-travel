import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isResolvedTranslationComplete,
  isTranslationComplete,
  recordTranslationCoverage,
  resolvedTranslationCoverage,
  translationCoverage,
} from "@/lib/translation-coverage";

/**
 * Translation coverage is the contract behind both the Studio queue and the
 * public draft banner. These tests pin the three states and the "empty means
 * untranslated" rule.
 */

const tour = {
  id: "tour_demo",
  slug: "tour-demo",
  title: "Tour biển xanh",
  summary: "Khám phá biển xanh trong một ngày.",
  overview: ["Điểm khởi hành buổi sáng."],
  highlights: ["Ngắm san hô"],
  included: ["Xe đưa đón"],
  excluded: ["Chi phí cá nhân"],
  notes: [],
  policies: ["Hoàn tiền trước 48 giờ"],
  tags: ["1 ngày"],
  departurePoints: ["Quy Nhơn"],
  priceNote: "Giá phụ thuộc số khách.",
  badge: "",
  itinerary: [
    {
      title: "Ngày 1",
      summary: "Ra đảo và tắm biển.",
      activities: ["Đón khách tại khách sạn"],
      meals: ["Trưa"],
      places: ["Kỳ Co"],
    },
  ],
  images: [{ alt: "Bãi biển Kỳ Co" }],
  seo: { title: "Tour biển xanh", description: "Mô tả tour biển xanh" },
};

const completeTourEn = {
  title: "Blue sea tour",
  summary: "A one-day blue sea discovery.",
  overview: ["Morning departure."],
  highlights: ["Snorkelling"],
  included: ["Shuttle transfer"],
  excluded: ["Personal expenses"],
  policies: ["Refund 48 hours before departure"],
  tags: ["1 day"],
  departurePoints: ["Quy Nhon"],
  priceNote: "Price depends on group size.",
  itinerary: [
    {
      title: "Day 1",
      summary: "Island and beach time.",
      activities: ["Hotel pickup"],
      meals: ["Lunch"],
      places: ["Ky Co"],
    },
  ],
  imageAlts: ["Ky Co beach"],
  seo: { title: "Blue sea tour", description: "Blue sea tour description" },
};

describe("translation coverage", () => {
  it("treats a record without overlay, null or whitespace as untranslated", () => {
    for (const overlay of [undefined, null, {}, { title: "   " }]) {
      const coverage = translationCoverage("tours", tour, overlay);
      assert.equal(coverage.state, "missing");
      assert.equal(coverage.filled, 0);
      assert.ok(coverage.missingFields.includes("Tiêu đề"));
    }
  });

  it("marks a partially filled overlay as incomplete", () => {
    const coverage = translationCoverage("tours", tour, {
      title: "Blue sea tour",
      summary: "",
    });
    assert.equal(coverage.state, "partial");
    assert.equal(coverage.filled, 1);
    assert.ok(coverage.missingFields.includes("Tóm tắt"));
  });

  it("reaches complete only when every source field has English content", () => {
    const coverage = translationCoverage("tours", tour, completeTourEn);
    assert.equal(coverage.state, "complete");
    assert.equal(coverage.required, coverage.filled);
    assert.deepEqual(coverage.missingFields, []);
    assert.equal(isTranslationComplete("tours", tour, completeTourEn), true);
  });

  it("does not count copied Vietnamese copy as translated", () => {
    const coverage = translationCoverage("tours", tour, {
      ...completeTourEn,
      summary: tour.summary,
    });
    assert.equal(coverage.state, "partial");
    assert.ok(coverage.missingFields.includes("Tóm tắt"));
  });

  it("checks itinerary days by position", () => {
    const coverage = translationCoverage("tours", tour, {
      ...completeTourEn,
      itinerary: [{ ...completeTourEn.itinerary[0], activities: [] }],
    });
    assert.equal(coverage.state, "partial");
    assert.ok(
      coverage.missingFields.some((field) =>
        field.startsWith("Lịch trình ngày 1: hoạt động"),
      ),
    );
  });

  it("covers categories, destinations and article blocks", () => {
    const category = {
      name: "Tour Quy Nhơn",
      description: "Khám phá Quy Nhơn.",
      tagline: "Biển xanh gọi mời",
    };
    assert.equal(
      translationCoverage("categories", category, {
        name: "Quy Nhon tours",
        description: "Discover Quy Nhon.",
        tagline: "The blue sea is calling",
      }).state,
      "complete",
    );

    const destination = {
      name: "Quy Nhơn",
      summary: "Thành phố biển miền Trung.",
      province: "Bình Định",
    };
    assert.equal(
      translationCoverage("destinations", destination, {
        name: "Quy Nhon",
        summary: "A coastal city in central Vietnam.",
        province: "Binh Dinh",
      }).state,
      "complete",
    );

    const article = {
      title: "Kinh nghiệm du lịch",
      excerpt: "Những điều cần biết.",
      tags: ["Kinh nghiệm"],
      body: [
        { type: "paragraph", text: "Chuẩn bị hành lý." },
        { type: "list", items: ["Mang kem chống nắng"] },
      ],
    };
    const articleEn = {
      title: "Travel tips",
      excerpt: "What you need to know.",
      tags: ["Tips"],
      body: [
        { type: "paragraph", text: "Pack your bags." },
        { type: "list", items: ["Bring sunscreen"] },
      ],
    };
    assert.equal(
      translationCoverage("articles", article, articleEn).state,
      "complete",
    );
    assert.equal(
      translationCoverage("articles", article, {
        ...articleEn,
        body: [articleEn.body[0]],
      }).state,
      "partial",
    );
  });

  it("reads the overlay from data._en for the Studio queue", () => {
    assert.equal(
      recordTranslationCoverage("tours", { ...tour, _en: completeTourEn }).state,
      "complete",
    );
    assert.equal(
      recordTranslationCoverage("tours", { ...tour, _en: undefined }).state,
      "missing",
    );
  });

  it("checks a resolved public record without mistaking overlay values for source copy", () => {
    const resolved = { ...tour, ...completeTourEn, _en: completeTourEn };
    assert.equal(resolvedTranslationCoverage("tours", resolved).state, "complete");
    assert.equal(isResolvedTranslationComplete("tours", resolved), true);

    // A partial overlay leaves the remaining fields in Vietnamese, so the page
    // is still incomplete even though the resolved object looks fully populated.
    const partial = {
      ...tour,
      ...completeTourEn,
      summary: tour.summary,
      _en: { ...completeTourEn, summary: undefined },
    };
    const coverage = resolvedTranslationCoverage("tours", partial);
    assert.equal(coverage.state, "partial");
    assert.ok(coverage.missingFields.includes("Tóm tắt"));
  });
});

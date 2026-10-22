import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tours } from "@/content";
import {
  getCategories,
  getCategoryByPath,
  getCategoryTourCount,
  getCategoryTrail,
  getTopLevelCategories,
} from "@/lib/data/categories";
import {
  getFeaturedTours,
  getRelatedTours,
  getTourBySlug,
  getTourTags,
  getToursByCategoryId,
} from "@/lib/data/tours";
import { getArticleBySlug, getArticles } from "@/lib/data/articles";
import {
  getDestinationsByRegion,
  getHomeExploreDestinations,
  homeDestinationHref,
} from "@/lib/data/destinations";
import { formatDuration, formatPriceFrom, formatMoney, hasPublishedPrice } from "@/lib/format";
import { ROUTES, primaryNav } from "@/config/navigation";
import { getMessages } from "@/i18n/messages";
import { existsSync } from "node:fs";
import { resolveTour } from "@/lib/data/localize";

/**
 * Content and repository tests.
 *
 * Importing `@/content` runs the Zod parse and the referential-integrity check,
 * so a dangling category id or a duplicate slug fails these tests rather than
 * shipping. Repositories now take a locale; the Vietnamese expectations below
 * pin the source language.
 */

const VI = "vi" as const;

describe("customer tour programmes", () => {
  const imported = tours.filter((tour) => tour.sourceDocuments.length > 0);
  const byCode = (code: string) => imported.find((tour) => tour.tourCode === code)!;

  it("deduplicates the supplied Word copies into eleven programmes", () => {
    assert.equal(imported.length, 11);
    assert.equal(imported.filter((tour) => tour.tourCode === "ST10").length, 1);
  });

  it("uses contact pricing for all seven day tours, not insurance amounts", () => {
    const dayTours = imported.filter((tour) => tour.duration.days === 1);
    assert.equal(dayTours.length, 7);
    for (const tour of dayTours) assert.equal(tour.priceFrom, null);
  });

  it("preserves different child policies and keeps VAT outside inclusions", () => {
    for (const code of ["ST02", "ST04", "ST05", "ST06"]) assert.match(byCode(code).policies.join(" "), /50%/);
    for (const code of ["ST01", "ST03", "ST10"]) assert.match(byCode(code).policies.join(" "), /60%/);
    for (const tour of imported) {
      assert.ok(tour.excluded.some((text) => text.includes("Thuế GTGT")));
      assert.ok(!tour.included.some((text) => text.includes("Thuế GTGT")));
    }
  });

  it("does not promise car pickup for the self-arrival Bai Dua tour", () => {
    assert.deepEqual(byCode("ST10").departurePoints, ["Nhơn Lý"]);
    assert.ok(!byCode("ST10").transport.some((text) => /ô tô/i.test(text)));
    assert.match(byCode("ST01").title, /đường bộ/);
  });

  it("keeps the two four-day Quy Nhon–Phu Yen routes separate", () => {
    const sameAirport = getTourBySlug("quy-nhon-phu-yen-4-ngay-3-dem", VI)!;
    const differentAirport = getTourBySlug("quy-nhon-phu-yen-4-ngay-3-dem-tien-phu-yen", VI)!;
    assert.deepEqual(sameAirport.returnPoints, ["Sân bay Phù Cát (UIH)"]);
    assert.deepEqual(differentAirport.returnPoints, ["Sân bay Tuy Hòa (TBB)"]);
    assert.match(differentAirport.itinerary[2].accommodation!, /Phú Yên/);
  });

  it("matches the supplied adult and child package prices exactly", () => {
    const three = getTourBySlug("quy-nhon-phu-yen-3-ngay-2-dem", VI)!;
    assert.deepEqual(three.pricingOptions.map((p) => [p.adultPrice, p.childPrice]), [[2290000,1374000],[2940000,1764000],[3240000,1944000],[3340000,2004000]]);
    const four = getTourBySlug("quy-nhon-4-ngay-3-dem", VI)!;
    assert.deepEqual(four.pricingOptions.map((p) => p.adultPrice), [2440000,3410000,3860000,4010000]);
    for (const tour of imported.filter((tour) => tour.pricingOptions.length > 0)) {
      assert.equal(tour.priceFrom?.amount, Math.min(...tour.pricingOptions.map((p) => p.adultPrice)));
      for (const option of tour.pricingOptions) assert.equal(option.childPrice, option.adultPrice * 0.6);
    }
  });

  it("retains chronological days and safe image metadata", () => {
    for (const tour of imported) {
      assert.equal(tour.itinerary.length, tour.duration.days);
      assert.deepEqual(tour.itinerary.map((day) => day.index), Array.from({ length: tour.duration.days }, (_, i) => i + 1));
      for (const photo of tour.images) {
        if (photo.src) assert.ok(existsSync(`public${photo.src}`));
        assert.ok(photo.width! > 100 && photo.height! > 100);
      }
    }
  });

  it("never overlays old English itinerary, meals or insurance on imported programmes", () => {
    for (const source of imported) {
      const translated = resolveTour(source, "en");
      assert.deepEqual(translated.itinerary, source.itinerary);
      assert.deepEqual(translated.included, source.included);
      assert.deepEqual(translated.excluded, source.excluded);
      const updated = { ...source, updatedAt: "2026-10-17T00:00:00Z" };
      assert.equal(resolveTour(updated, "en"), updated);
    }
  });
});

describe("content integrity", () => {
  it("loads and validates every tour record", () => {
    assert.ok(tours.length > 0);
  });

  it("has a unique slug and id for every tour", () => {
    assert.equal(new Set(tours.map((tour) => tour.slug)).size, tours.length);
    assert.equal(new Set(tours.map((tour) => tour.id)).size, tours.length);
  });

  it("never publishes a price of zero", () => {
    for (const tour of tours) {
      if (tour.priceFrom !== null) {
        assert.ok(tour.priceFrom.amount > 0, `${tour.slug} has a non-positive price`);
      }
    }
  });

  it("gives every tour a category and at least one itinerary day", () => {
    for (const tour of tours) {
      assert.ok(tour.categoryIds.length >= 1, `${tour.slug} has no category`);
      assert.ok(tour.itinerary.length >= 1, `${tour.slug} has no itinerary`);
    }
  });
});

describe("category repository", () => {
  it("exposes the required menu structure in order", () => {
    const top = getTopLevelCategories(VI).map((category) => category.name);
    assert.deepEqual(top, ["Tour Quy Nhơn - Phú Yên", "Tour Trong Nước"]);
  });

  it("uses the exact menu labels required by the brief", () => {
    const vi = getMessages(VI);
    const labels = primaryNav.map((item) => vi.nav[item.labelKey]);
    assert.deepEqual(labels, [
      "Trang chủ",
      "Tour Quy Nhơn - Phú Yên",
      "Tour Trong Nước",
      "Cẩm Nang Du Lịch",
      "Liên Hệ",
    ]);
  });

  it("keeps the required sub-menu labels under each parent", () => {
    const vi = getMessages(VI);
    const childLabels = (index: number) =>
      (primaryNav[index].children ?? []).map((child) => vi.nav[child.labelKey]);

    assert.deepEqual(childLabels(1), ["Tour Quy Nhơn 1 Ngày", "Tour Quy Nhơn dài Ngày"]);
    assert.deepEqual(childLabels(2), [
      "Tour Miền Bắc",
      "Tour Miền Trung",
      "Tour Miền Nam",
      "Tour Tây Nguyên",
    ]);
  });

  it("includes child-category tours when listing a parent category", () => {
    const parentTours = getToursByCategoryId("cat_quy_nhon_phu_yen", VI);
    const oneDay = getToursByCategoryId("cat_quy_nhon_1_ngay", VI);
    const multiDay = getToursByCategoryId("cat_quy_nhon_dai_ngay", VI);

    assert.ok(oneDay.length > 0 && multiDay.length > 0);
    assert.equal(parentTours.length, oneDay.length + multiDay.length);
    assert.ok(getCategoryTourCount("cat_quy_nhon_phu_yen") >= oneDay.length);
  });

  it("resolves every category path used in navigation", () => {
    for (const item of primaryNav) {
      assert.ok(
        getCategoryByPath(item.href, VI) ||
          item.href === ROUTES.home ||
          item.href === ROUTES.guides ||
          item.href === ROUTES.contact,
        `no destination for ${item.href}`,
      );
      for (const child of item.children ?? []) {
        assert.ok(getCategoryByPath(child.href, VI), `unknown child path ${child.href}`);
      }
    }
  });

  it("builds a breadcrumb trail from root to a child category", () => {
    const trail = getCategoryTrail("cat_mien_bac", VI);
    assert.deepEqual(
      trail.map((category) => category.name),
      ["Tour Trong Nước", "Tour Miền Bắc"],
    );
  });

  it("has no category with a dangling parent reference", () => {
    const ids = new Set(getCategories(VI).map((category) => category.id));
    for (const category of getCategories(VI)) {
      if (category.parentId) assert.ok(ids.has(category.parentId));
    }
  });
});

describe("tour repository", () => {
  it("finds a tour by slug", () => {
    assert.ok(getTourBySlug("quy-nhon-phu-yen-3-ngay-2-dem", VI));
    assert.equal(getTourBySlug("khong-ton-tai", VI), undefined);
  });

  it("prioritises the Quy Nhơn – Phú Yên line-up for the home page", () => {
    const featured = getFeaturedTours(6, VI);
    assert.equal(featured.length, 6);
    const focus = getToursByCategoryId("cat_quy_nhon_phu_yen", VI).map((tour) => tour.slug);
    assert.ok(focus.includes(featured[0].slug));
  });

  it("never includes the current tour in its own related list", () => {
    const slug = "quy-nhon-phu-yen-3-ngay-2-dem";
    const related = getRelatedTours(slug, 3, VI);
    assert.equal(related.length, 3);
    assert.ok(!related.some((tour) => tour.slug === slug));
  });

  it("returns useful filter tags", () => {
    const tags = getTourTags(VI);
    assert.ok(tags.length >= 3);
  });
});

describe("destination and article repository", () => {
  it("groups destinations by region", () => {
    const focus = getDestinationsByRegion("quy-nhon-phu-yen", VI);
    assert.ok(focus.length >= 4);
    assert.ok(focus.some((destination) => destination.name === "Quy Nhơn"));
  });

  it("selects home cards explicitly, in homeOrder, capped at three", () => {
    const home = getHomeExploreDestinations(VI);
    assert.deepEqual(
      home.map((destination) => destination.slug),
      ["quy-nhon", "ky-co-eo-gio", "hon-kho"],
    );
    assert.ok(home.every((destination) => destination.showOnHome === true));
    // Region membership alone no longer earns a card: Cù Lao Xanh is in the
    // focus region but is explicitly opted out.
    const focus = getDestinationsByRegion("quy-nhon-phu-yen", VI);
    assert.ok(focus.some((destination) => destination.showOnHome === false));
    assert.ok(!home.some((destination) => destination.slug === "cu-lao-xanh"));
  });

  it("links a home card to tour search using the destination name", () => {
    const [first] = getHomeExploreDestinations(VI);
    assert.equal(
      homeDestinationHref(first, VI),
      "/tim-tour?q=Quy%20Nh%C6%A1n",
    );
    assert.equal(
      homeDestinationHref({ name: "Kỳ Co – Eo Gió" }, "en"),
      "/en/tim-tour?q=K%E1%BB%B3%20Co",
    );
  });

  it("resolves an article by slug and links it to real tours", () => {
    const article = getArticleBySlug("kinh-nghiem-du-lich-quy-nhon-phu-yen", VI);
    assert.ok(article);
    if (!article) return;
    for (const slug of article.relatedTourSlugs) {
      assert.ok(getTourBySlug(slug, VI), `article links to a missing tour: ${slug}`);
    }
    assert.ok(getArticles(VI).length >= 4);
  });
});

describe("formatting rules", () => {
  it("renders an unpublished price as 'Liên hệ tư vấn', never as 0 ₫", () => {
    assert.equal(formatPriceFrom(null, VI), "Liên hệ tư vấn");
    assert.ok(!formatPriceFrom(null, VI).includes("0"));
    assert.equal(hasPublishedPrice(null), false);
  });

  it("renders an unpublished price in English as 'Contact us for pricing'", () => {
    assert.equal(formatPriceFrom(null, "en"), "Contact us for pricing");
    assert.ok(!formatPriceFrom(null, "en").includes("0"));
  });

  it("formats VND with thousands separators (vi)", () => {
    assert.equal(formatMoney({ amount: 1250000, currency: "VND" }, VI), "1.250.000 ₫");
    assert.equal(
      formatPriceFrom({ amount: 890000, currency: "VND" }, VI),
      "Từ 890.000 ₫",
    );
    assert.equal(hasPublishedPrice({ amount: 890000, currency: "VND" }), true);
  });

  it("keeps the currency VND in English, only regrouping digits", () => {
    assert.equal(
      formatPriceFrom({ amount: 890000, currency: "VND" }, "en"),
      "From 890,000 ₫",
    );
  });

  it("formats a single-day tour without mentioning nights", () => {
    assert.equal(formatDuration({ days: 1, nights: 0 }, VI), "1 ngày");
    assert.equal(formatDuration({ days: 3, nights: 2 }, VI), "3 ngày 2 đêm");
  });

  it("pluralises a duration correctly in English", () => {
    assert.equal(formatDuration({ days: 1, nights: 0 }, "en"), "1 day");
    assert.equal(formatDuration({ days: 3, nights: 1 }, "en"), "3 days 1 night");
    assert.equal(formatDuration({ days: 3, nights: 2 }, "en"), "3 days 2 nights");
  });
});

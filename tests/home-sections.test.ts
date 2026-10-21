import { test } from "node:test";
import assert from "node:assert/strict";
import { HOME_SECTIONS, sectionSummary } from "../src/lib/home-sections";

test("home sections mirror the landing page order with unique keys", () => {
  assert.equal(HOME_SECTIONS.length, 11);
  const keys = HOME_SECTIONS.map((section) => section.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const section of HOME_SECTIONS) {
    assert.ok(section.title.length > 0);
    assert.ok(section.where.length > 0);
    assert.ok(section.illustration.startsWith("/images/"));
  }
  assert.deepEqual(
    HOME_SECTIONS.map((section) => section.key),
    [
      "hero",
      "finder",
      "explore",
      "featured",
      "trust",
      "story",
      "regions",
      "values",
      "guides",
      "planning",
      "footer",
    ],
  );
});

test("section summaries never crash and fall back gracefully", () => {
  for (const section of HOME_SECTIONS) {
    const summary = sectionSummary(section, {});
    assert.equal(typeof summary, "string");
    assert.ok(summary.length > 0);
    assert.equal(sectionSummary(section, null), sectionSummary(section, {}));
  }
});

test("section summaries reflect real record data", () => {
  const byKey = Object.fromEntries(
    HOME_SECTIONS.map((section) => [section.key, section]),
  );
  assert.match(
    sectionSummary(byKey.hero, { slides: [{}, {}, {}], autoplay: true, intervalSeconds: 6 }),
    /3 ảnh/,
  );
  assert.match(
    sectionSummary(byKey.finder, {
      finder: { suggestions: [{ label: "Quy Nhơn" }, { label: "Phú Yên" }] },
    }),
    /Quy Nhơn/,
  );
  assert.match(
    sectionSummary(byKey.featured, { featured: { tourIds: ["a", "b"] } }),
    /2 tour/,
  );
  assert.match(
    sectionSummary(byKey.featured, { featured: { tourIds: [] } }),
    /Tự động/,
  );
  assert.match(
    sectionSummary(byKey.guides, { guides: { featuredSlug: "bai-viet" } }),
    /bai-viet/,
  );
});

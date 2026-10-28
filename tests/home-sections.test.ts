import { test } from "node:test";
import assert from "node:assert/strict";
import {
  HOME_GROUPS,
  HOME_SECTIONS,
  sectionPreview,
  sectionSummary,
} from "../src/lib/home-sections";

test("home sections mirror the landing page order with unique keys", () => {
  assert.equal(HOME_SECTIONS.length, 12);
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
      "customers",
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
  assert.equal(
    sectionSummary(byKey.customers, { customers: { enabled: false } }),
    "Đang tắt",
  );
  assert.match(
    sectionSummary(byKey.customers, {
      customers: {
        enabled: true,
        logos: [{ visible: true }, { visible: false }],
        videos: [{ visible: true }],
      },
    }),
    /1 logo · 1 video/,
  );
});

test("home sections carry admin display metadata (icon, group, tip)", () => {  assert.deepEqual(
    HOME_GROUPS.map((group) => group.key),
    ["top", "main", "bottom"],
  );
  const groupKeys = new Set(HOME_GROUPS.map((group) => group.key));
  for (const section of HOME_SECTIONS) {
    assert.ok(section.icon.length > 0, `${section.key} needs an icon`);
    assert.ok(section.tip.length > 0, `${section.key} needs a tip`);
    assert.ok(
      groupKeys.has(section.group),
      `${section.key} has an unknown group`,
    );
  }
  assert.deepEqual(
    HOME_SECTIONS.filter((section) => section.group === "top").map(
      (section) => section.key,
    ),
    ["hero", "finder"],
  );
  assert.deepEqual(
    HOME_SECTIONS.filter((section) => section.group === "bottom").map(
      (section) => section.key,
    ),
    ["guides", "planning", "footer"],
  );
});

test("section previews surface the real copy and never crash on empty data", () => {
  const byKey = Object.fromEntries(
    HOME_SECTIONS.map((section) => [section.key, section]),
  );
  for (const section of HOME_SECTIONS) {
    const preview = sectionPreview(section, {});
    assert.equal(typeof preview.text, "string");
    assert.ok(preview.text.length > 0, `${section.key} needs preview copy`);
    assert.equal(typeof preview.meta, "string");
    assert.deepEqual(sectionPreview(section, null), sectionPreview(section, {}));
  }
  assert.equal(
    sectionPreview(byKey.hero, {
      vi: { titleLine1: "Chạm vào", titleLine2: "miền biển" },
    }).text,
    "Chạm vào miền biển",
  );
  assert.equal(
    sectionPreview(byKey.explore, {
      explore: { titleA: "Chạm vào", titleB: "một miền" },
    }).text,
    "Chạm vào một miền",
  );
  assert.equal(
    sectionPreview(byKey.trust, {
      trust: { items: [{ title: "Giá công khai" }] },
    }).text,
    "Giá công khai",
  );
  assert.equal(
    sectionPreview(byKey.featured, {
      featured: {
        categoryId: "cat_qnpy",
        tourIds: ["a", "b"],
        scopes: { cat_qnpy: { title: "Tour nổi bật Quy Nhơn" } },
      },
    }).text,
    "Tour nổi bật Quy Nhơn",
  );
  assert.equal(
    sectionPreview(byKey.footer, {}).meta,
    "Sửa trong tab Website & footer",
  );
});

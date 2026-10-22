import { test } from "node:test";
import assert from "node:assert/strict";
import { tourCategories, tours } from "../src/content";
import {
  CATEGORY_SEO,
  HOME_SEO,
  TOUR_SEO,
} from "../src/content/seo";
import { fillSeoFields } from "../src/lib/seo-content";

const forbiddenClaims = [
  "rẻ nhất",
  "số 1",
  "tốt nhất",
  "cam kết tốt nhất",
  "đánh giá 5 sao",
];

function assertSafeCopy(value: string) {
  for (const claim of forbiddenClaims)
    assert.equal(
      value.toLowerCase().includes(claim),
      false,
      `unverified claim: ${claim}`,
    );
  assert.ok(value.length <= 220, `copy too long: ${value}`);
}

test("home SEO copy names the real destination without unverified claims", () => {
  for (const copy of Object.values(HOME_SEO)) {
    assert.match(copy.title, /Quy Nhon|Quy Nhơn/);
    assertSafeCopy(copy.description);
  }
});

test("SEO defaults only target categories and tours that exist", () => {
  const categoryIds = new Set(tourCategories.map((category) => category.id));
  const tourSlugs = new Set(tours.map((tour) => tour.slug));
  for (const id of Object.keys(CATEGORY_SEO))
    assert.ok(categoryIds.has(id), `unknown category ${id}`);
  for (const slug of Object.keys(TOUR_SEO))
    assert.ok(tourSlugs.has(slug), `unknown tour ${slug}`);
});

test("every SEO default has a unique title and a safe description", () => {
  const titles = new Set<string>();
  for (const copy of [...Object.values(CATEGORY_SEO), ...Object.values(TOUR_SEO)]) {
    assert.ok(copy.title.trim().length > 10);
    assert.equal(titles.has(copy.title), false, `duplicate title: ${copy.title}`);
    titles.add(copy.title);
    assertSafeCopy(copy.description);
  }
});

test("fillSeoFields preserves owner edits and only fills empty fields", () => {
  const fallback = { title: "Default title", description: "Default description" };

  assert.deepEqual(fillSeoFields(undefined, fallback), fallback);
  assert.deepEqual(fillSeoFields({}, fallback), fallback);

  const owned = { title: "Owner title", description: "Owner description" };
  assert.equal(fillSeoFields(owned, fallback), null);

  assert.deepEqual(
    fillSeoFields({ title: "Owner title" }, fallback),
    { title: "Owner title", description: "Default description" },
  );
  assert.deepEqual(
    fillSeoFields({ description: "Owner description" }, fallback),
    { title: "Default title", description: "Owner description" },
  );
});

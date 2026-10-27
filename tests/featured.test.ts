import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FEATURED_CATEGORY_FALLBACK,
  FEATURED_LIMIT,
  activateFeaturedScope,
  descendantCategoryIds,
  featuredConfigOf,
  featuredKeys,
  featuredScopeOf,
  pickAutomaticFeatured,
  setFeaturedScope,
} from "../src/lib/featured";

const tour = (slug: string, categoryIds: string[], days: number) => ({
  slug,
  categoryIds,
  duration: { days, nights: days > 1 ? days - 1 : 0 },
});

test("legacy featured rows keep their meaning", () => {
  const empty = featuredConfigOf({ tourIds: [] });
  assert.equal(empty.categoryId, FEATURED_CATEGORY_FALLBACK);
  assert.equal(empty.mode, "auto");
  assert.deepEqual(empty.tourIds, []);

  const pinned = featuredConfigOf({ tourIds: ["a", "b"] });
  assert.equal(pinned.mode, "manual");
  assert.deepEqual(pinned.tourIds, ["a", "b"]);
  assert.deepEqual(pinned.scopes[FEATURED_CATEGORY_FALLBACK], {
    mode: "manual",
    tourIds: ["a", "b"],
  });
});

test("every route keeps its own pins when the owner switches around", () => {
  let config = featuredConfigOf(null);
  config = setFeaturedScope(config, "cat_quy_nhon_phu_yen", {
    mode: "manual",
    tourIds: ["q1", "q2"],
  });
  config = activateFeaturedScope(config, "cat_mien_bac");
  config = setFeaturedScope(config, "cat_mien_bac", {
    mode: "manual",
    tourIds: ["b1"],
    title: "Miền Bắc nổi bật",
  });

  assert.equal(config.categoryId, "cat_mien_bac");
  assert.deepEqual(config.tourIds, ["b1"]);

  const back = activateFeaturedScope(config, "cat_quy_nhon_phu_yen");
  assert.equal(back.categoryId, "cat_quy_nhon_phu_yen");
  assert.deepEqual(featuredScopeOf(back).tourIds, ["q1", "q2"]);
  assert.deepEqual(back.scopes.cat_mien_bac.tourIds, ["b1"]);
  assert.equal(back.scopes.cat_mien_bac.title, "Miền Bắc nổi bật");
});

test("auto mode keeps the manual list so it can be restored later", () => {
  let config = setFeaturedScope(featuredConfigOf(null), "cat_mien_bac", {
    mode: "manual",
    tourIds: ["b1", "b2"],
  });
  config = setFeaturedScope(config, "cat_mien_bac", {
    ...featuredScopeOf(config, "cat_mien_bac"),
    mode: "auto",
  });
  assert.equal(config.mode, "auto");
  assert.deepEqual(config.scopes.cat_mien_bac.tourIds, ["b1", "b2"]);
});

test("duplicate and empty keys are ignored", () => {
  assert.deepEqual(featuredKeys(["a", "", "a", "b", 3, null]), ["a", "b"]);
});

test("descendants include the category tree, not just direct children", () => {
  const ids = descendantCategoryIds(
    [
      { id: "root", parentId: null },
      { id: "child", parentId: "root" },
      { id: "grandchild", parentId: "child" },
      { id: "other", parentId: null },
    ],
    "root",
  );
  assert.deepEqual(new Set(ids), new Set(["root", "child", "grandchild"]));
});

test("automatic line-up mixes day trips and overnight tours inside the route", () => {
  const scope = new Set(["north"]);
  const tours = [
    tour("day-1", ["north"], 1),
    tour("day-2", ["north"], 1),
    tour("day-3", ["north"], 1),
    tour("day-4", ["north"], 1),
    tour("long-1", ["north"], 4),
    tour("long-2", ["north"], 3),
    tour("south-1", ["south"], 1),
  ];
  const picked = pickAutomaticFeatured(tours, scope, 6);
  assert.equal(picked.length, 6);
  assert.ok(picked.every((item) => item.categoryIds.includes("north")));
  assert.ok(picked.filter((item) => item.duration.days === 1).length >= 3);
  assert.ok(picked.filter((item) => item.duration.days > 1).length >= 2);
});

test("a thin route shows only what it has", () => {
  const picked = pickAutomaticFeatured(
    [tour("a", ["south"], 2), tour("b", ["south"], 3), tour("c", ["north"], 1)],
    new Set(["south"]),
    FEATURED_LIMIT,
  );
  assert.deepEqual(
    picked.map((item) => item.slug),
    ["a", "b"],
  );
});

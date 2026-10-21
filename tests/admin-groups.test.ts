import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TRASH_RETENTION_DAYS,
  coverSrcOf,
  durationBadgeOf,
  durationGroupOf,
  lineGroupOf,
  priceLabelOf,
  qnpyCategoryIds,
  trashDaysLeft,
} from "../src/lib/admin-tour-groups";

test("duration groups split 1-day tours from longer ones", () => {
  assert.equal(durationGroupOf({ duration: { days: 1 } }), "1day");
  assert.equal(durationGroupOf({ duration: { days: 3, nights: 2 } }), "multi");
  assert.equal(durationGroupOf({}), "unknown");
  assert.equal(durationGroupOf({ duration: { days: 0 } }), "unknown");
  assert.equal(durationGroupOf(null), "unknown");
});

test("line groups follow the Quy Nhon - Phu Yen category tree", () => {
  const qnpy = qnpyCategoryIds([
    { id: "cat_quy_nhon_phu_yen", parentId: null },
    { id: "cat_quy_nhon_1_ngay", parentId: "cat_quy_nhon_phu_yen" },
    { id: "cat_tour_trong_nuoc", parentId: null },
  ]);
  assert.ok(qnpy.has("cat_quy_nhon_1_ngay"));
  assert.equal(
    lineGroupOf({ categoryIds: ["cat_quy_nhon_1_ngay"] }, qnpy),
    "qnpy",
  );
  assert.equal(
    lineGroupOf({ categoryIds: ["cat_tour_trong_nuoc"] }, qnpy),
    "domestic",
  );
  assert.equal(lineGroupOf({ categoryIds: [] }, qnpy), "unknown");
  assert.equal(lineGroupOf({}, qnpy), "unknown");
});

test("empty category tree falls back to the known Quy Nhon ids", () => {
  const qnpy = qnpyCategoryIds([]);
  assert.ok(qnpy.has("cat_quy_nhon_1_ngay"));
  assert.equal(
    lineGroupOf({ categoryIds: ["cat_quy_nhon_1_ngay"] }, qnpy),
    "qnpy",
  );
});

test("trash countdown counts down from the delete timestamp", () => {
  const now = Date.now();
  const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(trashDaysLeft(tenDaysAgo, now), TRASH_RETENTION_DAYS - 10);
  const ancient = new Date(
    now - (TRASH_RETENTION_DAYS + 5) * 24 * 60 * 60 * 1000,
  ).toISOString();
  assert.equal(trashDaysLeft(ancient, now), 0);
  assert.equal(trashDaysLeft("not-a-date", now), null);
});

test("price and cover helpers read tour records defensively", () => {
  assert.equal(priceLabelOf({ priceFrom: { amount: 2290000 } }), "2.290.000 ₫");
  assert.equal(priceLabelOf({ priceFrom: null }), null);
  assert.equal(priceLabelOf({}), null);
  assert.equal(durationBadgeOf({ duration: { days: 3, nights: 2 } }), "3N2Đ");
  assert.equal(durationBadgeOf({ duration: { days: 1 } }), "1 ngày");
  assert.equal(durationBadgeOf({}), null);
  assert.equal(coverSrcOf({ images: [{ src: "/images/x.webp" }] }), "/images/x.webp");
  assert.equal(coverSrcOf({ images: [] }), null);
  assert.equal(coverSrcOf({}), null);
});

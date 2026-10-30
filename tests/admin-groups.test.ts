import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TRASH_RETENTION_DAYS,
  coverSrcOf,
  durationBadgeOf,
  durationGroupOf,
  adminTourPriceOf,
  formatAdminMoney,
  lineGroupOf,
  priceLabelOf,
  qnpyCategoryIds,
  tourEditorHeading,
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

test("admin prices reuse the public discount derivation", () => {
  const priced = adminTourPriceOf({
    priceFrom: { amount: 2440000 },
    originalPriceFrom: { amount: 3050000 },
    pricingOptions: [],
  });
  assert.deepEqual(priced, {
    contact: false,
    current: 2440000,
    original: 3050000,
    percent: 20,
    hiddenPackages: 0,
  });
  assert.equal(formatAdminMoney(2440000), "2.440.000 ₫");

  // Package rows win over the legacy top-level original price, exactly like
  // the public card. The package tied to the "from" price supplies the badge.
  const packaged = adminTourPriceOf({
    priceFrom: { amount: 2440000 },
    originalPriceFrom: { amount: 9990000 },
    pricingOptions: [
      {
        id: "pkg_a",
        label: "Tiêu chuẩn",
        adultPrice: 2440000,
        childPrice: 0,
        originalAdultPrice: 3050000,
      },
    ],
  });
  assert.equal(packaged.original, 3050000);
  assert.equal(packaged.percent, 20);
});

test("contact-priced tours never become 0 ₫ in the admin list", () => {
  assert.deepEqual(adminTourPriceOf({ priceFrom: null }), {
    contact: true,
    current: null,
    original: null,
    percent: null,
    hiddenPackages: 0,
  });
  assert.deepEqual(adminTourPriceOf({ priceFrom: { amount: 0 } }), {
    contact: true,
    current: null,
    original: null,
    percent: null,
    hiddenPackages: 0,
  });
  assert.equal(priceLabelOf({ priceFrom: { amount: 0 } }), null);

  // Packages saved while the tour is still in contact mode are counted so the
  // Studio list can explain why no price is shown.
  assert.deepEqual(
    adminTourPriceOf({
      priceFrom: null,
      pricingOptions: [
        { id: "pkg_a", adultPrice: 2440000 },
        { id: "pkg_b", adultPrice: 0 },
      ],
    }),
    {
      contact: true,
      current: null,
      original: null,
      percent: null,
      hiddenPackages: 1,
    },
  );
});

test("the editor heading distinguishes new, unnamed and named tours", () => {
  assert.equal(tourEditorHeading({ title: "Quy Nhơn 4 ngày 3 đêm" }, false), "Quy Nhơn 4 ngày 3 đêm");
  assert.equal(tourEditorHeading({ title: "" }, true), "Tạo tour mới");
  assert.equal(tourEditorHeading({ title: "Nội dung mới" }, true), "Tạo tour mới");
  assert.equal(tourEditorHeading({ title: "" }, false), "Tour chưa có tên");
  assert.equal(tourEditorHeading({ title: "  " }, false), "Tour chưa có tên");
});

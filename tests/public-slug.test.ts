import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPlaceholderSlug,
  slugFollowsTitle,
  slugFromTitle,
  tourSlugFromTitle,
  uniqueSlug,
} from "../src/lib/public-slug";

test("only Studio placeholder slugs count as replaceable", () => {
  assert.equal(isPlaceholderSlug("noi-dung-1697cdc7"), true);
  assert.equal(isPlaceholderSlug("noi-dung-moi"), true);
  assert.equal(isPlaceholderSlug("ninh-binh-trang-an-2-ngay-1-dem"), false);
  assert.equal(isPlaceholderSlug(""), false);
  assert.equal(isPlaceholderSlug(undefined), false);
});

test("unnamed records keep their temporary slug", () => {
  assert.equal(slugFromTitle("Nội dung mới"), "");
  assert.equal(slugFromTitle("  "), "");
  assert.equal(slugFromTitle("Kinh nghiệm du lịch Quy Nhơn"), "kinh-nghiem-du-lich-quy-nhon");
});

test("tour slugs read like the programme they sell", () => {
  assert.equal(
    tourSlugFromTitle("Tour Ninh Bình – Tràng An 2N1Đ"),
    "ninh-binh-trang-an-2-ngay-1-dem",
  );
  assert.equal(
    tourSlugFromTitle("Tour Hà Giang 3 ngày 2 đêm"),
    "ha-giang-3-ngay-2-dem",
  );
  assert.equal(tourSlugFromTitle("Tour mới"), "");
});

test("duplicate names get a stable numeric suffix", () => {
  assert.equal(uniqueSlug("quy-nhon-1-ngay", []), "quy-nhon-1-ngay");
  assert.equal(
    uniqueSlug("quy-nhon-1-ngay", ["quy-nhon-1-ngay"]),
    "quy-nhon-1-ngay-2",
  );
  assert.equal(
    uniqueSlug("quy-nhon-1-ngay", ["quy-nhon-1-ngay", "quy-nhon-1-ngay-2"]),
    "quy-nhon-1-ngay-3",
  );
});

test("a new tour slug follows the title until the owner decides", () => {
  const title = "Tour Quy Nhơn – Phú Yên Ghềnh Đá Đĩa 1 ngày";
  const derived = tourSlugFromTitle(title);
  assert.equal(derived, "quy-nhon-phu-yen-ghenh-da-dia-1-ngay");
  // A fresh record keeps the placeholder: still generated.
  assert.equal(slugFollowsTitle("noi-dung-1697cdc7", "Tour mới", "tour"), true);
  // The slug derived from the previous title keeps following the next edit.
  assert.equal(slugFollowsTitle(derived, title, "tour"), true);
  // A hand-written slug is a decision and must not be rewritten.
  assert.equal(
    slugFollowsTitle("tour-rieng-cua-toi", title, "tour"),
    false,
  );
});

test("an article slug follows its title the same way", () => {
  const title = "Kinh nghiệm du lịch Quy Nhơn – Phú Yên";
  const derived = slugFromTitle(title);
  assert.equal(derived, "kinh-nghiem-du-lich-quy-nhon-phu-yen");
  assert.equal(slugFollowsTitle("noi-dung-ab12cd34", title), true);
  assert.equal(slugFollowsTitle(derived, title), true);
  assert.equal(slugFollowsTitle("bai-viet-cua-toi", title), false);
});

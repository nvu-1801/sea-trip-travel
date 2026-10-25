import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPlaceholderSlug,
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

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOMER_VIDEO_COVER_REVISION,
  customerDisplayTitle,
  customerVideoCoverSrc,
  customerVideoSideCount,
  customerVideoSlot,
} from "../src/lib/customer-carousel";

test("coverflow slots wrap seamlessly around both ends", () => {
  assert.equal(customerVideoSlot(0, 0, 6), 0);
  assert.equal(customerVideoSlot(5, 0, 6), -1);
  assert.equal(customerVideoSlot(0, 5, 6), 1);
  assert.equal(customerVideoSlot(1, 5, 6), 2);
  assert.equal(customerVideoSlot(3, 5, 6), -2);
  assert.equal(customerVideoSlot(4, 0, 6), -2);
  assert.equal(customerVideoSlot(3, 0, 6), 3);
});

test("coverflow shows fewer layers on compact and sparse lists", () => {
  assert.equal(customerVideoSideCount(1, false), 0);
  assert.equal(customerVideoSideCount(2, false), 1);
  assert.equal(customerVideoSideCount(4, false), 1);
  assert.equal(customerVideoSideCount(5, false), 2);
  assert.equal(customerVideoSideCount(6, false), 2);
  assert.equal(customerVideoSideCount(6, true), 1);
});

test("stock covers get a revision while custom owner covers stay untouched", () => {
  const stock = "/images/customers/videos/cKpNJv2x-3I.jpg";
  assert.equal(
    customerVideoCoverSrc(stock),
    `${stock}?v=${CUSTOMER_VIDEO_COVER_REVISION}`,
  );
  assert.equal(
    customerVideoCoverSrc("/api/media/custom-cover.webp"),
    "/api/media/custom-cover.webp",
  );
  assert.equal(customerVideoCoverSrc(undefined), undefined);
});

test("card titles drop repeated organizer suffixes but keep a fallback", () => {
  assert.equal(
    customerDisplayTitle(
      "Du lịch Phú Yên - Trường THPT Ngô Lê Tân - Đơn vị tổ chức: Sea Trip Travel.",
    ),
    "Du lịch Phú Yên - Trường THPT Ngô Lê Tân",
  );
  assert.equal(
    customerDisplayTitle(
      "Sea Trip Travel đồng hành cùng VLIFE I Teambuilding - Gala Dinner 2025",
    ),
    "VLIFE I Teambuilding - Gala Dinner 2025",
  );
  assert.equal(
    customerDisplayTitle("Team Building FPT Bình Định 2025 | Sea Trip Travel"),
    "Team Building FPT Bình Định 2025",
  );
  assert.equal(customerDisplayTitle("  "), "");
});

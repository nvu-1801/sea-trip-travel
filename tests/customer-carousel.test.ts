import { test } from "node:test";
import assert from "node:assert/strict";
import {
  customerDisplayTitle,
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

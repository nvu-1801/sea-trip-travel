import { test } from "node:test";
import assert from "node:assert/strict";
import { slugify } from "../src/lib/slugify";

test("slugify produces URL-safe Vietnamese slugs", () => {
  assert.equal(
    slugify("Tour Quy Nhơn – Phú Yên 4N3Đ"),
    "tour-quy-nhon-phu-yen-4n3d",
  );
  assert.equal(slugify("Điểm đến mới"), "diem-den-moi");
  assert.equal(slugify("  --Hello, World!! -- "), "hello-world");
  assert.equal(slugify(""), "");
});

test("slugify caps the length and never ends on a dash", () => {
  const value = slugify("a".repeat(100), 20);
  assert.equal(value.length, 20);
  assert.ok(!value.endsWith("-"));
  assert.equal(slugify("abc ".repeat(30), 10).endsWith("-"), false);
});

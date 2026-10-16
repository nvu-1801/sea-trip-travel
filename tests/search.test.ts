import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { matchesNormalized, normalizeForSearch } from "@/lib/search";

/**
 * Search normalisation. Vietnamese visitors type with or without diacritics and
 * expect the same result, so this is load-bearing for the quick search.
 */

describe("normalizeForSearch", () => {
  it("strips diacritics so 'Quy Nhon' matches 'Quy Nhơn'", () => {
    assert.equal(normalizeForSearch("Quy Nhơn"), "quy nhon");
    assert.equal(normalizeForSearch("Phú Yên"), "phu yen");
    assert.equal(normalizeForSearch("Kỳ Co – Eo Gió"), "ky co eo gio");
  });

  it("folds đ/Đ explicitly (NFD does not decompose them)", () => {
    assert.equal(normalizeForSearch("Ghềnh Đá Đĩa"), "ghenh da dia");
    assert.equal(normalizeForSearch("Đà Nẵng"), "da nang");
  });

  it("collapses punctuation and spacing", () => {
    assert.equal(normalizeForSearch("  Tour  3 ngày 2 đêm "), "tour 3 ngay 2 dem");
  });
});

describe("matchesNormalized", () => {
  it("requires every token of the query to appear", () => {
    const haystack = normalizeForSearch("Quy Nhơn – Phú Yên 3 ngày 2 đêm");
    assert.equal(matchesNormalized(haystack, normalizeForSearch("quy nhon")), true);
    assert.equal(matchesNormalized(haystack, normalizeForSearch("phu yen 3 ngay")), true);
    assert.equal(matchesNormalized(haystack, normalizeForSearch("da lat")), false);
  });

  it("treats an empty query as 'match everything'", () => {
    assert.equal(matchesNormalized("anything", ""), true);
  });
});

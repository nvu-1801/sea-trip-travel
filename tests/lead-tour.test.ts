import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tourSlugForLead } from "@/lib/lead-tour";

const options = [
  { value: "quy-nhon-ky-co", label: "Kỳ Co – Eo Gió 1 ngày" },
  { value: "quy-nhon-phu-yen", label: "Quy Nhơn – Phú Yên 3 ngày" },
];

describe("tourSlugForLead", () => {
  it("uses the tour slug the lead already chose", () => {
    assert.equal(
      tourSlugForLead(
        { tourSlug: "quy-nhon-ky-co", interest: "Quy Nhơn" },
        options,
      ),
      "quy-nhon-ky-co",
    );
  });

  it("falls back to an exact interest title when the slug is missing", () => {
    assert.equal(
      tourSlugForLead(
        { tourSlug: "", interest: "  quy nhơn – phú yên 3 ngày " },
        options,
      ),
      "quy-nhon-phu-yen",
    );
  });

  it("does not guess when neither the slug nor an exact title matches", () => {
    assert.equal(
      tourSlugForLead({ tourSlug: "gone", interest: "Quy Nhơn" }, options),
      "",
    );
    assert.equal(tourSlugForLead(undefined, options), "");
  });
});

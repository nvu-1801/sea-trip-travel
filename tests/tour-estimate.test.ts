import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_ESTIMATE_PARTY,
  MAX_ESTIMATE_TOTAL,
  estimateTourForParty,
} from "@/domain/tour-estimate";

/** Tour-side reference price: package choice, party maths, missing child price. */

const tour = {
  slug: "tour-demo",
  title: "Tour demo",
  priceFrom: { amount: 1_500_000, currency: "VND" as const },
  pricingOptions: [
    {
      id: "std",
      label: "Khách sạn 4 sao",
      adultPrice: 3_000_000,
      childPrice: 1_800_000,
    },
    {
      id: "basic",
      label: "Khách sạn 3 sao",
      adultPrice: 2_400_000,
      childPrice: 1_440_000,
    },
  ],
};

describe("estimateTourForParty", () => {
  it("uses the cheapest published package and names it", () => {
    const estimate = estimateTourForParty(tour, 2, 1);
    assert.equal(estimate.packageId, "basic");
    assert.equal(estimate.packageLabel, "Khách sạn 3 sao");
    assert.equal(estimate.adultSubtotal, 4_800_000);
    assert.equal(estimate.childSubtotal, 1_440_000);
    assert.equal(estimate.total, 6_240_000);
    assert.equal(estimate.status, "quoted");
  });

  it("falls back to the published from-price when there is no package", () => {
    const estimate = estimateTourForParty(
      { ...tour, pricingOptions: [] },
      2,
      0,
    );
    assert.equal(estimate.adultPrice, 1_500_000);
    assert.equal(estimate.total, 3_000_000);
    assert.equal(estimate.status, "quoted");
  });

  it("asks for a quote when a child is travelling without a child price", () => {
    const estimate = estimateTourForParty(
      { ...tour, pricingOptions: [] },
      2,
      1,
    );
    assert.equal(estimate.status, "needs_quote");
    assert.equal(estimate.reason, "child_price_unknown");
    assert.equal(estimate.total, null);
    assert.equal(estimate.adultSubtotal, 3_000_000);
  });

  it("asks for a quote when no price exists at all", () => {
    const estimate = estimateTourForParty(
      { ...tour, pricingOptions: [], priceFrom: null },
      2,
      0,
    );
    assert.equal(estimate.status, "needs_quote");
    assert.equal(estimate.reason, "no_price");
    assert.equal(estimate.total, null);
  });

  it("clamps an absurd party size instead of multiplying it", () => {
    const estimate = estimateTourForParty(tour, 9999, 9999);
    assert.equal(estimate.adults, MAX_ESTIMATE_PARTY);
    assert.equal(estimate.children, 10);
    assert.ok(estimate.total === null || estimate.total <= MAX_ESTIMATE_TOTAL);
  });

  it("accepts a zero child price as a real published price", () => {
    const estimate = estimateTourForParty(
      {
        ...tour,
        pricingOptions: [
          {
            id: "kids-free",
            label: "Trẻ em miễn phí",
            adultPrice: 1_000_000,
            childPrice: 0,
          },
        ],
      },
      1,
      2,
    );
    assert.equal(estimate.status, "quoted");
    assert.equal(estimate.total, 1_000_000);
  });

  it("does not pick a package with an invalid price", () => {
    const estimate = estimateTourForParty(
      {
        ...tour,
        priceFrom: { amount: 900_000, currency: "VND" },
        pricingOptions: [
          { id: "bad", label: "Bad", adultPrice: 0, childPrice: 0 },
        ],
      },
      1,
      0,
    );
    assert.equal(estimate.packageId, null);
    assert.equal(estimate.adultPrice, 900_000);
    assert.equal(estimate.status, "quoted");
  });
});

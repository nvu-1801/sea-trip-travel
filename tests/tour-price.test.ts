import assert from "node:assert/strict";
import test from "node:test";
import { tours } from "../src/content/tours";
import { tourSchema } from "../src/domain/tour";
import { collectTourBusinessIssues } from "../src/domain/tour-rules";
import { toTourCard } from "../src/features/tours/tour-card-model";
import {
  discountPercent,
  pricePairDiscount,
  tourPrice,
} from "../src/lib/tour-price";

const source = tours[0];
const context = {
  categories: new Set(source.categoryIds),
  destinations: new Set(source.destinationIds),
};

function parse(patch: Record<string, unknown> = {}) {
  return tourSchema.parse({ ...source, ...patch });
}

test("discount percent is derived, rounded and never shows a meaningless 0%", () => {
  assert.equal(discountPercent(1_500_000, 1_200_000), 20);
  assert.equal(discountPercent(1_000, 667), 33);
  assert.equal(discountPercent(1_000, 990), 1);
  assert.equal(discountPercent(1_000, 999), null, "under 1% is not a badge");
  assert.equal(discountPercent(1_000, 1_000), null);
  assert.equal(discountPercent(900, 1_000), null, "original must be higher");
  assert.equal(discountPercent(0, 1_000), null);
  assert.equal(discountPercent(undefined, 1_000), null);
  assert.deepEqual(pricePairDiscount(1_200_000, 1_500_000), {
    current: 1_200_000,
    original: 1_500_000,
    percent: 20,
  });
  assert.deepEqual(pricePairDiscount(0, 0), {
    current: 0,
    original: null,
    percent: null,
  });
});

test("the card discount comes from the package that supplies the lowest from price", () => {
  const tour = parse({
    pricingOptions: [
      {
        id: "pkg_high",
        label: "Cao cấp",
        adultPrice: 1_800_000,
        childPrice: 900_000,
        originalAdultPrice: 2_400_000,
      },
      {
        id: "pkg_low",
        label: "Tiết kiệm",
        adultPrice: 1_200_000,
        childPrice: 600_000,
        originalAdultPrice: 1_500_000,
      },
    ],
    priceFrom: { amount: 1_200_000, currency: "VND" },
    // Tour-level original must not override the package source.
    originalPriceFrom: { amount: 9_000_000, currency: "VND" },
  });
  const price = tourPrice(tour);
  assert.equal(price?.current, 1_200_000);
  assert.equal(price?.original, 1_500_000);
  assert.equal(price?.percent, 20);
  assert.equal(price?.packageId, "pkg_low");

  const card = toTourCard(tour, "vi");
  assert.equal(card.discountPercent, 20);
  assert.equal(card.discountLabel, "-20%");
  assert.equal(card.priceOriginalLabel, "1.500.000 ₫");
  assert.match(card.discountAria ?? "", /20%/);
});

test("tied lowest packages prefer the larger honest discount", () => {
  const tour = parse({
    pricingOptions: [
      {
        id: "pkg_a",
        label: "A",
        adultPrice: 1_200_000,
        childPrice: 0,
        originalAdultPrice: 1_500_000,
      },
      {
        id: "pkg_b",
        label: "B",
        adultPrice: 1_200_000,
        childPrice: 0,
        originalAdultPrice: 1_600_000,
      },
    ],
    priceFrom: { amount: 1_200_000, currency: "VND" },
  });
  assert.equal(tourPrice(tour)?.percent, 25);
  assert.equal(tourPrice(tour)?.packageId, "pkg_b");
});

test("legacy records and contact tours never advertise a discount", () => {
  const legacy = parse({
    pricingOptions: [
      { id: "pkg_a", label: "A", adultPrice: 1_200_000, childPrice: 0 },
    ],
    priceFrom: { amount: 1_200_000, currency: "VND" },
  });
  assert.equal(tourPrice(legacy)?.percent, null);
  assert.equal(toTourCard(legacy, "vi").discountLabel, null);

  const contact = parse({
    pricingOptions: [
      {
        id: "pkg_a",
        label: "A",
        adultPrice: 1_200_000,
        childPrice: 600_000,
        originalAdultPrice: 1_500_000,
      },
    ],
    priceFrom: null,
  });
  assert.equal(tourPrice(contact), null);
  const card = toTourCard(contact, "vi");
  assert.equal(card.priceIsContact, true);
  assert.equal(card.discountLabel, null);
  assert.equal(card.priceOriginalLabel, null);
});

test("tour without packages uses its own original price", () => {
  const tour = parse({
    pricingOptions: [],
    priceFrom: { amount: 2_000_000, currency: "VND" },
    originalPriceFrom: { amount: 2_500_000, currency: "VND" },
  });
  assert.deepEqual(tourPrice(tour), {
    current: 2_000_000,
    original: 2_500_000,
    percent: 20,
    packageId: null,
  });
});

test("original prices must be higher than the current price", () => {
  const tour = parse({
    pricingOptions: [
      {
        id: "pkg_bad",
        label: "Sai",
        adultPrice: 1_200_000,
        childPrice: 600_000,
        originalAdultPrice: 1_000_000,
        originalChildPrice: 500_000,
      },
    ],
    priceFrom: { amount: 1_200_000, currency: "VND" },
  });
  const issues = collectTourBusinessIssues(tour, context);
  assert.ok(
    issues.some(
      (issue) =>
        issue.path.join(".") ===
        "pricingOptions.0.originalAdultPrice",
    ),
  );
  assert.ok(
    issues.some(
      (issue) =>
        issue.path.join(".") ===
        "pricingOptions.0.originalChildPrice",
    ),
  );
});

test("contact pricing with retained packages is valid", () => {
  const tour = parse({
    pricingOptions: [
      {
        id: "pkg_a",
        label: "A",
        adultPrice: 1_200_000,
        childPrice: 600_000,
        originalAdultPrice: 1_500_000,
      },
    ],
    priceFrom: null,
  });
  const issues = collectTourBusinessIssues(tour, context);
  assert.equal(
    issues.some((issue) => issue.path.join(".") === "priceFrom.amount"),
    false,
  );
});

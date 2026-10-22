import test from "node:test";
import assert from "node:assert/strict";
import { tours } from "../src/content/tours";
import { tourSchema, type Tour } from "../src/domain/tour";
import { tourRecordSchema } from "../src/domain/tour-cms";
import {
  collectTourBusinessIssues,
  collectTourIssues,
  describeTourIssue,
  humanizeZodIssue,
} from "../src/domain/tour-rules";

const source = tours[0];
const context = {
  categories: new Set(source.categoryIds),
  destinations: new Set(source.destinationIds),
};

const parse = (patch: Record<string, unknown> = {}): Tour =>
  tourSchema.parse({ ...source, ...patch });

test("a seeded tour passes every business rule", () => {
  assert.deepEqual(collectTourBusinessIssues(source, context), []);
});

test("price from must match the lowest adult package price", () => {
  const tour = parse({
    pricingOptions: [
      {
        id: "price_test_low",
        label: "Gói thử",
        adultPrice: 1200000,
        childPrice: 600000,
      },
    ],
    priceFrom: { amount: 900000, currency: "VND" },
  });
  const issues = collectTourBusinessIssues(tour, context);
  assert.ok(
    issues.some(
      (issue) =>
        issue.path.join(".") === "priceFrom.amount" &&
        /thấp nhất/.test(issue.message),
    ),
  );
});

test("itinerary length and order must match the duration", () => {
  const tour = parse({
    duration: { days: source.duration.days + 1, nights: source.duration.nights },
  });
  const issues = collectTourBusinessIssues(tour, context);
  assert.ok(issues.some((issue) => issue.path.join(".") === "itinerary"));
});

test("duplicate day ids are rejected before they reach the API", () => {
  if (source.itinerary.length < 2) return;
  const itinerary = source.itinerary.map((day, index) => ({
    ...day,
    id: index === 1 ? source.itinerary[0].id : day.id,
  }));
  const issues = collectTourBusinessIssues(parse({ itinerary }), context);
  assert.ok(
    issues.some(
      (issue) =>
        issue.path.join(".") === "itinerary" &&
        /trùng/.test(issue.message),
    ),
  );
});

test("missing category and destination references are reported by field", () => {
  const issues = collectTourBusinessIssues(source, {
    categories: new Set(),
    destinations: new Set(),
  });
  assert.ok(issues.some((issue) => issue.path.join(".") === "categoryIds"));
  assert.ok(issues.some((issue) => issue.path.join(".") === "destinationIds"));
});

test("the English itinerary must keep the same number of days", () => {
  const record = tourRecordSchema.parse({
    ...source,
    _en: { itinerary: [] },
  });
  const issues = collectTourBusinessIssues(record, context);
  assert.ok(
    issues.some(
      (issue) =>
        issue.path.join(".") === "_en.itinerary" &&
        /tiếng Anh/.test(issue.message),
    ),
  );
});

test("type errors are turned into field-level Vietnamese messages", () => {
  const issues = collectTourIssues({ ...source, title: "", summary: "" });
  const title = issues.find((issue) => issue.path.join(".") === "title");
  const summary = issues.find((issue) => issue.path.join(".") === "summary");
  assert.equal(title?.message, "Không được để trống");
  assert.equal(summary?.message, "Không được để trống");
  assert.equal(title?.section, "general");
});

test("humanizeZodIssue covers the rules the form can hit", () => {
  assert.equal(
    humanizeZodIssue({
      code: "too_small",
      origin: "string",
      minimum: 1,
      message: "",
    }),
    "Không được để trống",
  );
  assert.equal(
    humanizeZodIssue({
      code: "too_small",
      origin: "string",
      minimum: 3,
      message: "",
    }),
    "Cần ít nhất 3 ký tự",
  );
  assert.equal(
    humanizeZodIssue({
      code: "too_big",
      origin: "string",
      maximum: 220,
      message: "",
    }),
    "Tối đa 220 ký tự",
  );
  assert.equal(
    humanizeZodIssue({
      code: "invalid_format",
      format: "datetime",
      message: "",
    }),
    "Thời gian không hợp lệ",
  );
});

test("issue labels point at the right page section and row", () => {
  assert.equal(
    describeTourIssue({
      path: ["itinerary", 1, "title"],
      message: "",
      section: "itinerary",
    }),
    "Lịch trình · Ngày 2 · Tiêu đề",
  );
  assert.equal(
    describeTourIssue({
      path: ["images", 0, "alt"],
      message: "",
      section: "media",
    }),
    "Ảnh & thư viện · Ảnh 1 · Mô tả ảnh",
  );
});

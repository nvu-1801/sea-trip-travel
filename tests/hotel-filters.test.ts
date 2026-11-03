import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_HOTEL_QUERY,
  availableFacets,
  filterAndPaginate,
  hotelQueryToSearch,
  isCanonicalHotelQuery,
  parseHotelQuery,
  type FilterableHotel,
  type HotelQuery,
} from "@/lib/hotel-filters";

function hotel(
  id: string,
  overrides: Partial<FilterableHotel> = {},
): FilterableHotel {
  return {
    id,
    name: `Khách sạn ${id}`,
    province: "Bình Định",
    searchText: `Khách sạn ${id} Quy Nhơn`,
    starRating: 4,
    lodgingType: "hotel",
    amenities: ["Hồ bơi", "Bãi biển"],
    priceFrom: 1_500_000,
    recommendedRank: 0,
    ...overrides,
  };
}

function query(overrides: Partial<HotelQuery> = {}): HotelQuery {
  return { ...EMPTY_HOTEL_QUERY, ...overrides };
}

describe("parseHotelQuery", () => {
  it("returns the default query for empty params", () => {
    assert.deepEqual(parseHotelQuery({}), EMPTY_HOTEL_QUERY);
  });

  it("clamps a bad star, page and budget instead of trusting the URL", () => {
    const parsed = parseHotelQuery({
      star: "9",
      page: "-3",
      budget: "not-a-bucket",
      sort: "cheapest",
    });
    assert.equal(parsed.star, 0);
    assert.equal(parsed.page, 1);
    assert.equal(parsed.minPrice, 0);
    assert.equal(parsed.maxPrice, 0);
    assert.equal(parsed.sort, "recommended");
  });

  it("keeps a valid range and reads the budget bucket", () => {
    const parsed = parseHotelQuery({
      checkIn: "2026-12-30",
      checkOut: "2027-01-02",
      budget: "3000000-5000000",
      star: "5",
      page: "2",
    });
    assert.equal(parsed.checkIn, "2026-12-30");
    assert.equal(parsed.checkOut, "2027-01-02");
    assert.equal(parsed.minPrice, 3_000_000);
    assert.equal(parsed.maxPrice, 5_000_000);
    assert.equal(parsed.star, 5);
    assert.equal(parsed.page, 2);
  });

  it("drops half a date range", () => {
    const parsed = parseHotelQuery({ checkIn: "2026-12-30" });
    assert.equal(parsed.checkIn, "");
    assert.equal(parsed.checkOut, "");
  });
});

describe("hotelQueryToSearch", () => {
  it("omits defaults and round-trips the rest", () => {
    assert.equal(hotelQueryToSearch(EMPTY_HOTEL_QUERY), "");
    const value = hotelQueryToSearch(
      query({
        province: "Phú Yên",
        minPrice: 1_500_000,
        maxPrice: 3_000_000,
        sort: "price-asc",
        page: 3,
        checkIn: "2026-12-30",
        checkOut: "2027-01-02",
      }),
    );
    assert.match(value, /province=Ph%C3%BA\+Y%C3%AAn/);
    assert.match(value, /budget=1500000-3000000/);
    assert.match(value, /sort=price-asc/);
    assert.match(value, /page=3/);
    assert.match(value, /checkIn=2026-12-30/);
    assert.match(value, /checkOut=2027-01-02/);
  });
});

describe("isCanonicalHotelQuery", () => {
  it("indexes only the unfiltered first page", () => {
    assert.equal(isCanonicalHotelQuery(EMPTY_HOTEL_QUERY), true);
    assert.equal(isCanonicalHotelQuery(query({ page: 2 })), false);
    assert.equal(isCanonicalHotelQuery(query({ star: 4 })), false);
    assert.equal(isCanonicalHotelQuery(query({ q: "resort" })), false);
    assert.equal(
      isCanonicalHotelQuery(query({ checkIn: "2026-12-30", checkOut: "2027-01-02" })),
      false,
    );
  });
});

describe("filterAndPaginate", () => {
  const hotels = [
    hotel("a", { recommendedRank: 0, priceFrom: 2_000_000, starRating: 5 }),
    hotel("b", { recommendedRank: 1, priceFrom: null, starRating: 3 }),
    hotel("c", {
      recommendedRank: 2,
      priceFrom: 1_200_000,
      province: "Phú Yên",
      lodgingType: "resort",
      amenities: ["Hồ bơi"],
      searchText: "resort biển Phú Yên",
      name: "Resort biển",
    }),
  ];

  it("filters by province, star, type and amenity", () => {
    assert.deepEqual(
      filterAndPaginate(hotels, query({ province: "Phú Yên" })).items.map((h) => h.id),
      ["c"],
    );
    assert.deepEqual(
      filterAndPaginate(hotels, query({ star: 5 })).items.map((h) => h.id),
      ["a"],
    );
    assert.deepEqual(
      filterAndPaginate(hotels, query({ type: "resort" })).items.map((h) => h.id),
      ["c"],
    );
    assert.deepEqual(
      filterAndPaginate(hotels, query({ amenity: "Bãi biển" })).items.map((h) => h.id),
      ["a", "b"],
    );
  });

  it("searches the precomputed text, not only the name", () => {
    assert.deepEqual(
      filterAndPaginate(hotels, query({ q: "quy nhơn" })).items.map((h) => h.id),
      ["a", "b"],
    );
  });

  it("sorts by price and always puts unknown prices last", () => {
    assert.deepEqual(
      filterAndPaginate(hotels, query({ sort: "price-asc" })).items.map((h) => h.id),
      ["c", "a", "b"],
    );
    assert.deepEqual(
      filterAndPaginate(hotels, query({ sort: "price-desc" })).items.map((h) => h.id),
      ["a", "c", "b"],
    );
  });

  it("excludes hotels without a price when a budget is applied", () => {
    assert.deepEqual(
      filterAndPaginate(hotels, query({ maxPrice: 1_500_000 })).items.map((h) => h.id),
      ["c"],
    );
  });

  it("clamps a page beyond the last one instead of showing an empty list", () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      hotel(`h${index}`, { recommendedRank: index }),
    );
    const page = filterAndPaginate(many, query({ page: 99 }));
    assert.equal(page.page, 2);
    assert.equal(page.pageCount, 2);
    assert.equal(page.items.length, 3);
    assert.equal(page.total, 12);
  });

  it("returns an empty result, not an error, when nothing matches", () => {
    const page = filterAndPaginate(hotels, query({ q: "không tồn tại" }));
    assert.equal(page.total, 0);
    assert.deepEqual(page.items, []);
    assert.equal(page.page, 1);
  });
});

describe("availableFacets", () => {
  it("offers only values that exist, most common first", () => {
    const facets = availableFacets([
      hotel("a"),
      hotel("b"),
      hotel("c", { province: "Phú Yên", amenities: ["Hồ bơi"] }),
    ]);
    assert.deepEqual(
      facets.provinces.map((entry) => entry.value),
      ["Bình Định", "Phú Yên"],
    );
    assert.equal(
      facets.amenities.find((entry) => entry.value === "Hồ bơi")?.count,
      3,
    );
    assert.deepEqual(
      facets.types.map((entry) => entry.value),
      ["hotel"],
    );
  });
});

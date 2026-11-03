/**
 * URL state for the hotel list.
 *
 * Pure and framework-free so the same parsing feeds the server render, the
 * pagination links and the unit tests. Back/Forward works because every filter
 * lives in the query string; nothing is kept in component state that the URL
 * cannot restore.
 */

export const HOTEL_PAGE_SIZE = 9;
export const HOTEL_SORTS = ["recommended", "price-asc", "price-desc"] as const;
export type HotelSort = (typeof HOTEL_SORTS)[number];

export type HotelQuery = {
  q: string;
  province: string;
  /** 0 = any, otherwise 1–5. */
  star: number;
  /** Lodging type id, "" = any. */
  type: string;
  amenity: string;
  /** VND per night; 0 = no bound. */
  minPrice: number;
  maxPrice: number;
  sort: HotelSort;
  page: number;
  checkIn: string;
  checkOut: string;
};

export const EMPTY_HOTEL_QUERY: HotelQuery = {
  q: "",
  province: "",
  star: 0,
  type: "",
  amenity: "",
  minPrice: 0,
  maxPrice: 0,
  sort: "recommended",
  page: 1,
  checkIn: "",
  checkOut: "",
};

export const BUDGET_OPTIONS = [
  { value: "", label: "Mọi mức giá", min: 0, max: 0 },
  { value: "under-1500000", label: "Dưới 1,5 triệu", min: 0, max: 1_500_000 },
  {
    value: "1500000-3000000",
    label: "1,5 – 3 triệu",
    min: 1_500_000,
    max: 3_000_000,
  },
  {
    value: "3000000-5000000",
    label: "3 – 5 triệu",
    min: 3_000_000,
    max: 5_000_000,
  },
  { value: "over-5000000", label: "Trên 5 triệu", min: 5_000_000, max: 0 },
] as const;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function text(value: string | string[] | undefined, max: number): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().slice(0, max);
}

function positiveInt(value: string, max: number): number {
  if (!/^\d+$/.test(value)) return 0;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= max
    ? parsed
    : 0;
}

function budget(value: string): { minPrice: number; maxPrice: number } {
  const option = BUDGET_OPTIONS.find((entry) => entry.value === value);
  return option
    ? { minPrice: option.min, maxPrice: option.max }
    : { minPrice: 0, maxPrice: 0 };
}

export function parseHotelQuery(
  params: Record<string, string | string[] | undefined>,
): HotelQuery {
  const budgetValue = text(params.budget, 40);
  const bounds = budget(budgetValue);
  const starRaw = positiveInt(text(params.star, 2), 5);
  const page = Math.max(1, positiveInt(text(params.page, 4), 500));
  const checkIn = text(params.checkIn, 10);
  const checkOut = text(params.checkOut, 10);
  const pairedDates =
    DATE_PATTERN.test(checkIn) && DATE_PATTERN.test(checkOut);
  const sortValue = text(params.sort, 20) as HotelSort;
  return {
    q: text(params.q, 80),
    province: text(params.province, 80),
    star: starRaw >= 1 && starRaw <= 5 ? starRaw : 0,
    type: text(params.type, 30),
    amenity: text(params.amenity, 60),
    ...bounds,
    sort: HOTEL_SORTS.includes(sortValue) ? sortValue : "recommended",
    page,
    // Both dates or none: half a range is not a stay.
    checkIn: pairedDates ? checkIn : "",
    checkOut: pairedDates ? checkOut : "",
  };
}

/** Canonical query string for links, omitting defaults. */
export function hotelQueryToSearch(query: HotelQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.province) params.set("province", query.province);
  if (query.star) params.set("star", String(query.star));
  if (query.type) params.set("type", query.type);
  if (query.amenity) params.set("amenity", query.amenity);
  if (query.minPrice || query.maxPrice) {
    const match = BUDGET_OPTIONS.find(
      (option) =>
        option.min === query.minPrice && option.max === query.maxPrice,
    );
    if (match?.value) params.set("budget", match.value);
    else {
      if (query.minPrice) params.set("min", String(query.minPrice));
      if (query.maxPrice) params.set("max", String(query.maxPrice));
    }
  }
  if (query.sort !== "recommended") params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.checkIn) {
    params.set("checkIn", query.checkIn);
    params.set("checkOut", query.checkOut);
  }
  const value = params.toString();
  return value ? `?${value}` : "";
}

/**
 * Only the unfiltered first page is worth indexing. Filter permutations are
 * real URLs for humans, but they are not search landing pages.
 */
export function isCanonicalHotelQuery(query: HotelQuery): boolean {
  return (
    query.q === "" &&
    query.province === "" &&
    query.star === 0 &&
    query.type === "" &&
    query.amenity === "" &&
    query.minPrice === 0 &&
    query.maxPrice === 0 &&
    query.page === 1 &&
    query.checkIn === ""
  );
}

export type FilterableHotel = {
  id: string;
  name: string;
  province: string;
  searchText: string;
  starRating: number | null;
  lodgingType: string;
  amenities: readonly string[];
  /** Lowest valid nightly price; `null` = ask for a quote. */
  priceFrom: number | null;
  recommendedRank: number;
};

function matchesQuery(hotel: FilterableHotel, query: HotelQuery): boolean {
  if (query.q) {
    const needle = query.q.toLocaleLowerCase("vi");
    if (!hotel.searchText.toLocaleLowerCase("vi").includes(needle))
      return false;
  }
  if (query.province && hotel.province !== query.province) return false;
  if (query.star && hotel.starRating !== query.star) return false;
  if (query.type && hotel.lodgingType !== query.type) return false;
  if (query.amenity && !hotel.amenities.includes(query.amenity)) return false;
  if (query.maxPrice && hotel.priceFrom === null) return false;
  if (query.minPrice && (hotel.priceFrom ?? 0) < query.minPrice) return false;
  if (query.maxPrice && (hotel.priceFrom ?? 0) > query.maxPrice) return false;
  return true;
}

function compare(a: FilterableHotel, b: FilterableHotel, sort: HotelSort) {
  if (sort === "price-asc" || sort === "price-desc") {
    // A hotel with no valid price always sorts last, in both directions.
    if (a.priceFrom === null && b.priceFrom === null)
      return a.recommendedRank - b.recommendedRank;
    if (a.priceFrom === null) return 1;
    if (b.priceFrom === null) return -1;
    const delta = a.priceFrom - b.priceFrom;
    if (delta !== 0) return sort === "price-asc" ? delta : -delta;
  }
  return a.recommendedRank - b.recommendedRank;
}

export function filterAndPaginate<T extends FilterableHotel>(
  hotels: readonly T[],
  query: HotelQuery,
): { items: T[]; total: number; pageCount: number; page: number } {
  const matched = hotels
    .filter((hotel) => matchesQuery(hotel, query))
    .sort((a, b) => compare(a, b, query.sort));
  const pageCount = Math.max(1, Math.ceil(matched.length / HOTEL_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * HOTEL_PAGE_SIZE;
  return {
    items: matched.slice(start, start + HOTEL_PAGE_SIZE),
    total: matched.length,
    pageCount,
    page,
  };
}

/** Options actually present in the catalogue, so no empty filter is offered. */
export function availableFacets(hotels: readonly FilterableHotel[]) {
  const provinces = new Map<string, number>();
  const amenities = new Map<string, number>();
  const types = new Map<string, number>();
  for (const hotel of hotels) {
    provinces.set(hotel.province, (provinces.get(hotel.province) ?? 0) + 1);
    types.set(hotel.lodgingType, (types.get(hotel.lodgingType) ?? 0) + 1);
    for (const amenity of hotel.amenities)
      amenities.set(amenity, (amenities.get(amenity) ?? 0) + 1);
  }
  const byCount = (map: Map<string, number>) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"))
      .map(([value, count]) => ({ value, count }));
  return {
    provinces: byCount(provinces),
    amenities: byCount(amenities).slice(0, 12),
    types: byCount(types),
  };
}

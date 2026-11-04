import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import {
  BUDGET_OPTIONS,
  HOTEL_SORTS,
  type HotelQuery,
} from "@/lib/hotel-filters";
import { LODGING_LABELS, LODGING_TYPES } from "@/domain/hotel";
import {
  HotelFilterPanel,
  type HotelFilterLabels,
  type HotelFilterSets,
} from "./hotel-filter-panel";

/**
 * Catalogue filters as a plain GET form.
 *
 * The labels and the option lists are resolved here (server) so the client
 * panel receives plain strings; the panel itself owns the controls and keeps
 * each value in a named hidden input, so the URL always describes the state.
 */
export function HotelFilterForm({
  locale,
  query,
  provinces,
  amenities,
}: {
  locale: Locale;
  query: HotelQuery;
  provinces: { value: string; count: number }[];
  amenities: { value: string; count: number }[];
}) {
  const m = getMessages(locale);
  const t = m.hotels.list;
  const budgetLabel = (value: string) =>
    value === "under-1500000"
      ? t.budgetUnder15
      : value === "1500000-3000000"
        ? t.budget15to30
        : value === "3000000-5000000"
          ? t.budget30to50
          : value === "over-5000000"
            ? t.budgetOver50
            : t.budgetAny;

  const labels: HotelFilterLabels = {
    formLabel: t.filters,
    searchLabel: t.searchLabel,
    searchPlaceholder: t.searchPlaceholder,
    checkIn: t.checkIn,
    checkOut: t.checkOut,
    apply: t.applyFilters,
    clear: t.clearFilters,
    province: t.province,
    budget: t.budget,
    star: t.star,
    type: t.type,
    amenity: t.amenity,
    sort: t.sortLabel,
  };

  const sets: HotelFilterSets = {
    provinces: [
      { value: "", label: t.allProvinces },
      ...provinces.map((province) => ({
        value: province.value,
        label: `${province.value} (${province.count})`,
      })),
    ],
    budgets: BUDGET_OPTIONS.map((option) => ({
      value: option.value,
      label: budgetLabel(option.value),
    })),
    stars: [
      { value: "", label: t.allStars },
      ...[5, 4, 3, 2, 1].map((star) => ({
        value: String(star),
        label: `${star} ★`,
      })),
    ],
    types: [
      { value: "", label: t.allTypes },
      ...LODGING_TYPES.map((type) => ({
        value: type,
        label: LODGING_LABELS[type],
      })),
    ],
    amenities: [
      { value: "", label: t.allAmenities },
      ...amenities.map((amenity) => ({
        value: amenity.value,
        label: amenity.value,
      })),
    ],
    sorts: HOTEL_SORTS.map((sort) => ({
      value: sort,
      label:
        sort === "recommended"
          ? t.sortRecommended
          : sort === "price-asc"
            ? t.sortPriceAsc
            : t.sortPriceDesc,
    })),
  };

  const initialBudget =
    BUDGET_OPTIONS.find(
      (option) =>
        option.min === query.minPrice && option.max === query.maxPrice,
    )?.value ?? "";

  return (
    <HotelFilterPanel
      action={localizePath(locale, "/khach-san")}
      initial={query}
      initialBudget={initialBudget}
      labels={labels}
      sets={sets}
      datePicker={m.datePicker}
    />
  );
}

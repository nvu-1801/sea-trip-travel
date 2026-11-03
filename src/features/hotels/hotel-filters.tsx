import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import {
  BUDGET_OPTIONS,
  HOTEL_SORTS,
  type HotelQuery,
} from "@/lib/hotel-filters";
import { LODGING_LABELS, LODGING_TYPES } from "@/domain/hotel";

/**
 * Catalogue filters as a plain GET form.
 *
 * Every control is server-rendered and named, so the URL always describes the
 * state: Back/Forward, sharing a link and reloading all work without a client
 * store. On a phone the block collapses into a `<details>` sheet.
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
  return (
    <form
      className="stt-hotel-filters"
      method="get"
      action={localizePath(locale, "/khach-san")}
      role="search"
      aria-label={t.filters}
    >
      <div className="stt-hotel-filters-head">
        <label className="stt-hotel-field stt-hotel-field--search">
          <span>{t.searchLabel}</span>
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            maxLength={80}
            placeholder={t.searchPlaceholder}
          />
        </label>
        <label className="stt-hotel-field">
          <span>{t.checkIn}</span>
          <input type="date" name="checkIn" defaultValue={query.checkIn} />
        </label>
        <label className="stt-hotel-field">
          <span>{t.checkOut}</span>
          <input type="date" name="checkOut" defaultValue={query.checkOut} />
        </label>
        <button type="submit" className="stt-btn-primary stt-hotel-search">
          {t.applyFilters}
        </button>
      </div>

      <div className="stt-hotel-filters-grid">
        <label className="stt-hotel-field">
          <span>{t.province}</span>
          <select name="province" defaultValue={query.province}>
            <option value="">{t.allProvinces}</option>
            {provinces.map((province) => (
              <option key={province.value} value={province.value}>
                {province.value} ({province.count})
              </option>
            ))}
          </select>
        </label>
        <label className="stt-hotel-field">
          <span>{t.budget}</span>
          <select
            name="budget"
            defaultValue={
              BUDGET_OPTIONS.find(
                (option) =>
                  option.min === query.minPrice && option.max === query.maxPrice,
              )?.value ?? ""
            }
          >
            {BUDGET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {budgetLabel(option.value)}
              </option>
            ))}
          </select>
        </label>
        <label className="stt-hotel-field">
          <span>{t.star}</span>
          <select name="star" defaultValue={query.star ? String(query.star) : ""}>
            <option value="">{t.allStars}</option>
            {[5, 4, 3, 2, 1].map((star) => (
              <option key={star} value={star}>
                {star} ★
              </option>
            ))}
          </select>
        </label>
        <label className="stt-hotel-field">
          <span>{t.type}</span>
          <select name="type" defaultValue={query.type}>
            <option value="">{t.allTypes}</option>
            {LODGING_TYPES.map((type) => (
              <option key={type} value={type}>
                {LODGING_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="stt-hotel-field">
          <span>{t.amenity}</span>
          <select name="amenity" defaultValue={query.amenity}>
            <option value="">{t.allAmenities}</option>
            {amenities.map((amenity) => (
              <option key={amenity.value} value={amenity.value}>
                {amenity.value}
              </option>
            ))}
          </select>
        </label>
        <label className="stt-hotel-field">
          <span>{t.sortLabel}</span>
          <select name="sort" defaultValue={query.sort}>
            {HOTEL_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {sort === "recommended"
                  ? t.sortRecommended
                  : sort === "price-asc"
                    ? t.sortPriceAsc
                    : t.sortPriceDesc}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="stt-hotel-filters-foot">
        <a
          className="stt-hotel-clear"
          href={localizePath(locale, "/khach-san")}
        >
          {t.clearFilters}
        </a>
        <button type="submit" className="stt-btn-secondary">
          {t.applyFilters}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker, type DatePickerLabels } from "@/components/ui/date-picker";
import { Input, Select } from "@/components/ui/form-controls";
import type { HotelQuery } from "@/lib/hotel-filters";

/**
 * Catalogue filters.
 *
 * Every control is a design-system control (Input, Select, DatePicker, Button),
 * so the open list and the calendar are drawn in the site's tokens instead of
 * the operating system's blue popup.
 *
 * The form stays a plain GET form: each control writes a named value (the
 * custom select and the date picker keep a hidden input), so the URL always
 * describes the state and Back/Forward, sharing and reloading keep working.
 */

export type HotelFilterOption = { value: string; label: string };

export type HotelFilterLabels = {
  formLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  checkIn: string;
  checkOut: string;
  apply: string;
  clear: string;
  province: string;
  budget: string;
  star: string;
  type: string;
  amenity: string;
  sort: string;
};

export type HotelFilterSets = {
  provinces: HotelFilterOption[];
  budgets: HotelFilterOption[];
  stars: HotelFilterOption[];
  types: HotelFilterOption[];
  amenities: HotelFilterOption[];
  sorts: HotelFilterOption[];
};

export function HotelFilterPanel({
  action,
  initial,
  initialBudget,
  labels,
  sets,
  datePicker,
}: {
  action: string;
  initial: HotelQuery;
  initialBudget: string;
  labels: HotelFilterLabels;
  sets: HotelFilterSets;
  datePicker: DatePickerLabels;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fieldId = (name: string) => `hotel-filter-${uid}-${name}`;
  const labelId = (name: string) => `${fieldId(name)}-label`;

  const [q, setQ] = useState(initial.q);
  const [checkIn, setCheckIn] = useState(initial.checkIn);
  const [checkOut, setCheckOut] = useState(initial.checkOut);
  const [province, setProvince] = useState(initial.province);
  const [budget, setBudget] = useState(
    sets.budgets.some((option) => option.value === initialBudget)
      ? initialBudget
      : "",
  );
  const [star, setStar] = useState(initial.star ? String(initial.star) : "");
  const [type, setType] = useState(initial.type);
  const [amenity, setAmenity] = useState(initial.amenity);
  const [sort, setSort] = useState<HotelQuery["sort"]>(initial.sort);

  const activeCount = [
    q.trim() !== "",
    checkIn !== "" || checkOut !== "",
    province !== "",
    budget !== "",
    star !== "",
    type !== "",
    amenity !== "",
    sort !== "recommended",
  ].filter(Boolean).length;

  return (
    <form
      className="stt-hotel-filters"
      method="get"
      action={action}
      role="search"
      aria-label={labels.formLabel}
    >
      <div className="stt-hotel-filters-head">
        <label
          className="stt-hotel-field stt-hotel-field--search"
          htmlFor={fieldId("q")}
        >
          <span>{labels.searchLabel}</span>
          <Input
            id={fieldId("q")}
            name="q"
            type="search"
            value={q}
            maxLength={80}
            placeholder={labels.searchPlaceholder}
            onChange={(event) => setQ(event.target.value)}
          />
        </label>

        <div className="stt-hotel-field">
          <span>{labels.checkIn}</span>
          <DatePicker
            id={fieldId("checkIn")}
            value={checkIn}
            onChange={setCheckIn}
            labels={datePicker}
            ariaLabel={labels.checkIn}
          />
          <input type="hidden" name="checkIn" value={checkIn} />
        </div>

        <div className="stt-hotel-field">
          <span>{labels.checkOut}</span>
          <DatePicker
            id={fieldId("checkOut")}
            value={checkOut}
            onChange={setCheckOut}
            labels={datePicker}
            ariaLabel={labels.checkOut}
          />
          <input type="hidden" name="checkOut" value={checkOut} />
        </div>

        <Button type="submit" size="md" className="stt-hotel-search">
          {labels.apply}
        </Button>
      </div>

      <div className="stt-hotel-filters-grid">
        <div className="stt-hotel-field">
          <span id={labelId("province")}>{labels.province}</span>
          <Select
            value={province}
            options={sets.provinces}
            onChange={setProvince}
            name="province"
            aria-labelledby={labelId("province")}
          />
        </div>
        <div className="stt-hotel-field">
          <span id={labelId("budget")}>{labels.budget}</span>
          <Select
            value={budget}
            options={sets.budgets}
            onChange={setBudget}
            name="budget"
            aria-labelledby={labelId("budget")}
          />
        </div>
        <div className="stt-hotel-field">
          <span id={labelId("star")}>{labels.star}</span>
          <Select
            value={star}
            options={sets.stars}
            onChange={setStar}
            name="star"
            aria-labelledby={labelId("star")}
          />
        </div>
        <div className="stt-hotel-field">
          <span id={labelId("type")}>{labels.type}</span>
          <Select
            value={type}
            options={sets.types}
            onChange={setType}
            name="type"
            aria-labelledby={labelId("type")}
          />
        </div>
        <div className="stt-hotel-field">
          <span id={labelId("amenity")}>{labels.amenity}</span>
          <Select
            value={amenity}
            options={sets.amenities}
            onChange={setAmenity}
            name="amenity"
            aria-labelledby={labelId("amenity")}
          />
        </div>
        <div className="stt-hotel-field">
          <span id={labelId("sort")}>{labels.sort}</span>
          <Select
            value={sort}
            options={sets.sorts}
            onChange={(value) => setSort(value as HotelQuery["sort"])}
            name="sort"
            aria-labelledby={labelId("sort")}
          />
        </div>
      </div>

      {activeCount > 0 ? (
        <div className="stt-hotel-filters-foot">
          <a className="stt-hotel-clear" href={action}>
            {labels.clear} ({activeCount})
          </a>
        </div>
      ) : null}
    </form>
  );
}

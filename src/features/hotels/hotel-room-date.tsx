"use client";

import { useId, useState } from "react";
import { DatePicker, type DatePickerLabels } from "@/components/ui/date-picker";

export function HotelRoomDate({
  name,
  label,
  initialValue,
  labels,
  invalid,
}: {
  name: "checkIn" | "checkOut";
  label: string;
  initialValue: string;
  labels: DatePickerLabels;
  invalid: boolean;
}) {
  const id = useId();
  const [value, setValue] = useState(initialValue);

  return (
    <div className="stt-room-filter-field stt-room-filter-date">
      <label htmlFor={id}>{label}</label>
      <DatePicker
        id={id}
        ariaLabel={label}
        value={value}
        onChange={setValue}
        labels={labels}
        invalid={invalid && value === initialValue}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

"use client";

import { rememberHotelRequest, type HotelRequestDraft } from "./hotel-request-store";

export function HotelRoomRequest({
  href,
  draft,
  label,
}: {
  href: string;
  draft: HotelRequestDraft;
  label: string;
}) {
  return (
    <a className="stt-hotel-room-cta" href={href} onClick={() => rememberHotelRequest(draft)}>
      {label} <span aria-hidden="true">→</span>
    </a>
  );
}

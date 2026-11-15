"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();

  return (
    <button
      type="button"
      className="stt-hotel-room-cta"
      onClick={() => {
        rememberHotelRequest(draft);
        router.push(href);
      }}
    >
      {label} <span aria-hidden="true">→</span>
    </button>
  );
}

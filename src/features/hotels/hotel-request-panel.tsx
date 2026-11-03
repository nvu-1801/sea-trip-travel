"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import { format } from "@/i18n/messages";
import { Button, ButtonLink } from "@/components/ui/button";
import { formatVnd } from "./hotel-format";
import { rememberHotelRequest } from "./hotel-request-store";

/**
 * Hotel page side panel: the room types and their reference prices, plus one
 * action that hands the choice to the consultation form.
 *
 * There is no form here and no availability claim. The website cannot know what
 * the partner still has, so picking a room only attaches it to `/lien-he` and
 * says so in a dialog before the visitor leaves the page.
 */

export type RequestPanelRoom = {
  id: string;
  name: string;
  priceFrom: number | null;
  image?: string;
};

export type HotelRequestLabels = {
  title: string;
  description: string;
  roomsLabel: string;
  pick: string;
  submit: string;
  fallback: string;
  note: string;
  noRooms: string;
  assignedTitle: string;
  assignedBody: string;
  assignedNote: string;
  continueTours: string;
  goToForm: string;
};

export function HotelRequestPanel({
  locale,
  hotel,
  rooms,
  labels,
  contactHref,
  toursHref,
}: {
  locale: Locale;
  hotel: { id: string; slug: string; name: string; priceFrom: number | null };
  rooms: RequestPanelRoom[];
  labels: HotelRequestLabels;
  contactHref: string;
  toursHref: string;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<RequestPanelRoom | null>(null);
  const [assigned, setAssigned] = useState(false);

  useEffect(() => {
    if (!assigned) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAssigned(false);
    };
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus();
    };
  }, [assigned]);

  function assign(room: RequestPanelRoom | null) {
    setPicked(room);
    rememberHotelRequest({
      id: hotel.id,
      slug: hotel.slug,
      name: hotel.name,
      priceFrom: hotel.priceFrom,
      ...(room ? { roomId: room.id, roomName: room.name } : {}),
    });
    setAssigned(true);
  }

  return (
    <aside className="stt-hotel-panel" aria-labelledby={titleId}>
      <h2 id={titleId}>{labels.title}</h2>
      <p className="stt-hotel-panel-lede">{labels.description}</p>

      {rooms.length === 0 ? (
        <p className="stt-hotel-muted">{labels.noRooms}</p>
      ) : (
        <fieldset className="stt-hotel-request-rooms">
          <legend>{labels.roomsLabel}</legend>
          <ul>
            {rooms.map((room) => (
              <li key={room.id}>
                <button
                  type="button"
                  className="stt-hotel-request-room"
                  data-picked={picked?.id === room.id ? "true" : undefined}
                  onClick={() => assign(room)}
                >
                  {room.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={room.image} alt="" loading="lazy" />
                  ) : null}
                  <span className="stt-hotel-request-copy">
                    <strong>{room.name}</strong>
                    <small>
                      {room.priceFrom !== null
                        ? formatVnd(room.priceFrom, locale)
                        : labels.fallback}
                    </small>
                  </span>
                  <span className="stt-hotel-request-pick">{labels.pick}</span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <Button
        type="button"
        className="stt-hotel-request-cta"
        onClick={() => assign(picked)}
      >
        {labels.submit}
      </Button>
      <p className="stt-hotel-fine">{labels.note}</p>

      {assigned ? (
        <div
          className="stt-hotel-assign"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAssigned(false);
          }}
        >
          <div
            ref={dialogRef}
            className="stt-hotel-assign-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${titleId}-assign`}
            tabIndex={-1}
          >
            <p className="stt-hotel-assign-eyebrow">
              {hotel.name}
              {picked ? ` · ${picked.name}` : ""}
            </p>
            <h3 id={`${titleId}-assign`}>{labels.assignedTitle}</h3>
            <p>{format(labels.assignedBody, { hotel: hotel.name })}</p>
            <p className="stt-hotel-fine">{labels.assignedNote}</p>
            <div className="stt-hotel-assign-actions">
              <ButtonLink href={contactHref} variant="primary" size="md">
                {labels.goToForm}
              </ButtonLink>
              <ButtonLink href={toursHref} variant="secondary" size="md">
                {labels.continueTours}
              </ButtonLink>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

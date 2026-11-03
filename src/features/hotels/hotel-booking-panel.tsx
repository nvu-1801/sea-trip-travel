"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import type { AvailabilityResult } from "@/domain/hotel-availability";
import type { StayQuote, TourRelation } from "@/domain/hotel-pricing";

/**
 * Hotel request panel: dates, room quantities, server-priced reference quote
 * and the consultation form.
 *
 * The browser never calculates money. It sends a selection to
 * `/api/hotels/quote` and displays what the server returns; on submit the lead
 * service re-reads the rules again. "Chưa chốt ngày" and "nhờ tư vấn tour" are
 * first-class choices, not empty fields.
 */

export type BookingRoom = {
  id: string;
  name: string;
  capacityAdults: number;
  capacityChildren: number;
  maxOccupancy: number;
  priceFrom: number | null;
  breakfastIncluded: boolean;
  taxIncluded: boolean;
  availability: AvailabilityResult;
};

export type HotelBookingLabels = {
  title: string;
  description: string;
  dates: string;
  datesFlexible: string;
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  childrenAges: string;
  childrenAgesHint: string;
  rooms: string;
  roomQuantity: string;
  tourOptional: string;
  noTour: string;
  tourHelp: string;
  submit: string;
  submitting: string;
  noRoomsSelected: string;
  quoteTitle: string;
  quoteSubtotal: string;
  quoteNights: string;
  quoteNeeds: string;
  quoteNeedsHint: string;
  quoteIncluded: string;
  quoteUpgrade: string;
  quoteFees: string;
  quoteRefreshing: string;
  quoteError: string;
  quoteNoDates: string;
  quoteNotConfirmed: string;
  estimateTitle: string;
  estimateTotal: string;
  estimateTour: string;
  estimateStay: string;
  estimateNoTour: string;
  estimateRooms: string;
  estimateAdults: string;
  estimateChildren: string;
  estimateNeeds: string;
  estimateNeedsHint: string;
  estimateShow: string;
  estimateHide: string;
  estimateNote: string;
  successTitle: string;
  successBody: string;
  fullName: string;
  phone: string;
  email: string;
  message: string;
  consent: string;
  consentHint: string;
  privacyLabel: string;
  privacyHref: string;
  optional: string;
  genericError: string;
  networkError: string;
  available: string;
  unavailable: string;
  unknown: string;
};

type QuoteResponse = {
  quote: StayQuote;
  availability: Record<string, AvailabilityResult>;
  hotelName: string;
  tourPrice: {
    title: string;
    packageLabel: string | null;
    adultPrice: number | null;
    childPrice: number | null;
    adults: number;
    children: number;
    adultSubtotal: number | null;
    childSubtotal: number | null;
    total: number | null;
    status: "quoted" | "needs_quote";
    reason: string | null;
  } | null;
  estimate: {
    status: "quoted" | "needs_quote";
    lodgingTotal: number | null;
    tourTotal: number | null;
    total: number | null;
    reasons: string[];
  };
};

const MAX_ROOMS_PER_TYPE = 5;

function vnd(amount: number, locale: string): string {
  return `${new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN").format(amount)} ₫`;
}

export function HotelBookingPanel({
  locale,
  hotelId,
  rooms,
  tourOptions,
  labels,
  initial,
  sourcePage,
}: {
  locale: string;
  hotelId: string;
  rooms: BookingRoom[];
  tourOptions: { slug: string; title: string; relation: TourRelation }[];
  labels: HotelBookingLabels;
  initial: {
    checkIn: string;
    checkOut: string;
    tourSlug: string;
    selection: Record<string, number>;
  };
  sourcePage: string;
}) {
  const formId = useId();
  const [flexible, setFlexible] = useState(!initial.checkIn);
  const [checkIn, setCheckIn] = useState(initial.checkIn);
  const [checkOut, setCheckOut] = useState(initial.checkOut);
  const [selection, setSelection] = useState<Record<string, number>>(
    initial.selection,
  );
  const [tourSlug, setTourSlug] = useState(initial.tourSlug);
  const [tourHelp, setTourHelp] = useState(false);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [childrenAges, setChildrenAges] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState("");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteState, setQuoteState] = useState<"idle" | "loading" | "error">("idle");
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ requestId: string } | null>(null);
  const submissionId = useRef("");

  useEffect(() => {
    if (!submissionId.current) submissionId.current = crypto.randomUUID();
  }, []);

  const selectedRooms = rooms.filter((room) => (selection[room.id] ?? 0) > 0);
  // A stable string is the effect dependency; the array itself is new on every
  // render and would refetch in a loop.
  const selectionKey = rooms
    .map((room) => `${room.id}:${selection[room.id] ?? 0}`)
    .filter((entry) => !entry.endsWith(":0"))
    .join(",");
  const validDates =
    !flexible &&
    /^\d{4}-\d{2}-\d{2}$/.test(checkIn) &&
    /^\d{4}-\d{2}-\d{2}$/.test(checkOut) &&
    checkOut > checkIn;

  useEffect(() => {
    if (!selectionKey || !validDates) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setQuoteState("loading");
      try {
        const params = new URLSearchParams({
          hotel: hotelId,
          rooms: selectionKey,
          checkIn,
          checkOut,
          locale,
          adults: String(adults),
          children: String(children),
          ...(tourSlug && !tourHelp ? { tour: tourSlug } : {}),
        });
        const response = await fetch(`/api/hotels/quote?${params}`, {
          signal: controller.signal,
        });
        const body = (await response.json().catch(() => ({}))) as
          | QuoteResponse
          | { error?: string };
        if (!response.ok || !("quote" in body)) throw new Error("quote");
        setQuote(body);
        setQuoteState("idle");
      } catch (cause) {
        if ((cause as Error).name === "AbortError") return;
        setQuote(null);
        setQuoteState("error");
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    adults,
    checkIn,
    checkOut,
    children,
    hotelId,
    locale,
    selectionKey,
    tourHelp,
    tourSlug,
    validDates,
  ]);

  function availabilityText(room: BookingRoom): string {
    const result = quote?.availability[room.id] ?? room.availability;
    if (result.kind === "on_request") return labels.unknown;
    if (result.kind === "unknown") return labels.unknown;
    if (result.kind === "closed") return labels.unavailable;
    return labels.available.replace("{count}", String(result.rooms));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErrors({});
    setFormError("");
    if (selectedRooms.length === 0) {
      setFormError(labels.noRoomsSelected);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "hotel",
          fullName,
          phone,
          ...(email ? { email } : {}),
          ...(message ? { message } : {}),
          consent,
          company,
          locale,
          sourcePage,
          submissionId: submissionId.current || crypto.randomUUID(),
          hotel: {
            hotelId,
            rooms: selectedRooms.map((room) => ({
              roomId: room.id,
              quantity: selection[room.id],
            })),
            ...(flexible
              ? { datesFlexible: true }
              : { checkIn, checkOut, datesFlexible: false }),
            adults,
            children,
            childrenAges: childrenAges
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean)
              .map(Number)
              .filter((value) => Number.isInteger(value)),
            tourHelp,
            ...(tourSlug && !tourHelp ? { tourSlug } : {}),
          },
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        requestId?: string;
        error?: { message?: string; fieldErrors?: Record<string, string[]> };
      };
      if (!response.ok || !body.ok) {
        if (body.error?.fieldErrors) {
          const mapped: Record<string, string[]> = {};
          for (const [key, value] of Object.entries(body.error.fieldErrors)) {
            const field = key.replace(/^hotel\./, "");
            mapped[field] = [...(mapped[field] ?? []), ...value];
          }
          setErrors(mapped);
        }
        setFormError(body.error?.message ?? labels.genericError);
        return;
      }
      setSuccess({ requestId: body.requestId ?? "" });
    } catch {
      setFormError(labels.networkError);
    } finally {
      setSubmitting(false);
    }
  }

  if (success)
    return (
      <aside className="stt-hotel-panel" aria-live="polite">
        <h2>{labels.successTitle}</h2>
        <p>{labels.successBody}</p>
        {success.requestId ? (
          <p className="stt-hotel-ref">
            <strong>{success.requestId}</strong>
          </p>
        ) : null}
      </aside>
    );

  return (
    <aside className="stt-hotel-panel" aria-labelledby={`${formId}-title`}>
      <h2 id={`${formId}-title`}>{labels.title}</h2>
      <p className="stt-hotel-panel-lede">{labels.description}</p>

      <form className="stt-hotel-form" onSubmit={submit} noValidate>
        <fieldset className="stt-hotel-fieldset">
          <legend>{labels.dates}</legend>
          <label className="stt-hotel-check">
            <input
              type="checkbox"
              checked={flexible}
              onChange={(event) => setFlexible(event.target.checked)}
            />
            <span>{labels.datesFlexible}</span>
          </label>
          {!flexible ? (
            <div className="stt-hotel-pair">
              <label className="stt-hotel-field">
                <span>{labels.checkIn}</span>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(event) => setCheckIn(event.target.value)}
                />
              </label>
              <label className="stt-hotel-field">
                <span>{labels.checkOut}</span>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(event) => setCheckOut(event.target.value)}
                />
              </label>
            </div>
          ) : null}
        </fieldset>

        <fieldset className="stt-hotel-fieldset">
          <legend>{labels.rooms}</legend>
          {rooms.length === 0 ? (
            <p className="stt-hotel-muted">{labels.noRoomsSelected}</p>
          ) : null}
          {rooms.map((room) => (
            <div className="stt-hotel-roompick" key={room.id}>
              <div>
                <strong>{room.name}</strong>
                <small>
                  {room.priceFrom !== null
                    ? `${labels.quoteTitle}: ${vnd(room.priceFrom, locale)}`
                    : labels.unknown}
                  {" · "}
                  {availabilityText(room)}
                </small>
              </div>
              <label className="stt-hotel-qty">
                <span className="stt-hotel-sr">{labels.roomQuantity}</span>
                <select
                  value={selection[room.id] ?? 0}
                  onChange={(event) =>
                    setSelection((current) => ({
                      ...current,
                      [room.id]: Number(event.target.value),
                    }))
                  }
                >
                  {Array.from({ length: MAX_ROOMS_PER_TYPE + 1 }, (_, count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
          {errors.rooms ? (
            <p className="stt-hotel-error" role="alert">
              {errors.rooms.join(" · ")}
            </p>
          ) : null}
        </fieldset>

        <div className="stt-hotel-pair">
          <label className="stt-hotel-field">
            <span>{labels.adults}</span>
            <input
              type="number"
              min={1}
              max={40}
              value={adults}
              onChange={(event) => setAdults(Number(event.target.value || 1))}
            />
          </label>
          <label className="stt-hotel-field">
            <span>{labels.children}</span>
            <input
              type="number"
              min={0}
              max={10}
              value={children}
              onChange={(event) => setChildren(Number(event.target.value || 0))}
            />
          </label>
        </div>
        {children > 0 ? (
          <label className="stt-hotel-field">
            <span>{labels.childrenAges}</span>
            <input
              value={childrenAges}
              onChange={(event) => setChildrenAges(event.target.value)}
              placeholder="6, 9"
            />
            <small>{labels.childrenAgesHint}</small>
          </label>
        ) : null}

        <fieldset className="stt-hotel-fieldset">
          <legend>{labels.tourOptional}</legend>
          <label className="stt-hotel-check">
            <input
              type="checkbox"
              checked={tourHelp}
              onChange={(event) => setTourHelp(event.target.checked)}
            />
            <span>{labels.tourHelp}</span>
          </label>
          {!tourHelp ? (
            <label className="stt-hotel-field">
              <span className="stt-hotel-sr">{labels.tourOptional}</span>
              <select
                value={tourSlug}
                onChange={(event) => setTourSlug(event.target.value)}
              >
                <option value="">{labels.noTour}</option>
                {tourOptions.map((tour) => (
                  <option key={tour.slug} value={tour.slug}>
                    {tour.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </fieldset>

        <div className="stt-hotel-quote" aria-live="polite">
          <h3>{labels.quoteTitle}</h3>
          {!validDates ? (
            <p className="stt-hotel-muted">{labels.quoteNoDates}</p>
          ) : !selectionKey ? (
            <p className="stt-hotel-muted">{labels.noRoomsSelected}</p>
          ) : quoteState === "loading" ? (
            <p className="stt-hotel-muted">{labels.quoteRefreshing}</p>
          ) : quoteState === "error" ? (
            <p className="stt-hotel-error">{labels.quoteError}</p>
          ) : quote ? (
            <>
              {quote.quote.status === "quoted" && quote.quote.lodgingTotal !== null ? (
                <p className="stt-hotel-quote-total">
                  {labels.quoteSubtotal.replace(
                    "{amount}",
                    vnd(quote.quote.lodgingTotal, locale),
                  )}
                </p>
              ) : quote.quote.includedByTour ? (
                <p>{labels.quoteIncluded}</p>
              ) : (
                <p className="stt-hotel-quote-total">{labels.quoteNeeds}</p>
              )}
              <p className="stt-hotel-muted">
                {labels.quoteNights.replace("{count}", String(quote.quote.nights))}
              </p>
              {quote.quote.reasons.includes("unknown_fees") ? (
                <p className="stt-hotel-muted">{labels.quoteFees}</p>
              ) : null}
              {quote.quote.reasons.includes("upgrade_needs_quote") ? (
                <p className="stt-hotel-muted">{labels.quoteUpgrade}</p>
              ) : null}
              {quote.quote.status !== "quoted" ? (
                <p className="stt-hotel-muted">{labels.quoteNeedsHint}</p>
              ) : null}
              <p className="stt-hotel-fine">{labels.quoteNotConfirmed}</p>
            </>
          ) : (
            <p className="stt-hotel-muted">{labels.quoteNoDates}</p>
          )}
        </div>

        {quote && selectionKey ? (
          <section
            className="stt-hotel-estimate"
            aria-labelledby={`${formId}-estimate-title`}
          >
            <button
              type="button"
              className="stt-hotel-estimate-toggle"
              aria-expanded={estimateOpen}
              aria-controls={`${formId}-estimate`}
              onClick={() => setEstimateOpen((open) => !open)}
            >
              <span className="stt-hotel-estimate-copy">
                <small id={`${formId}-estimate-title`}>
                  {labels.estimateTitle}
                </small>
                <strong>
                  {quote.estimate.total !== null
                    ? vnd(quote.estimate.total, locale)
                    : labels.estimateNeeds}
                </strong>
                <em>
                  {estimateOpen ? labels.estimateHide : labels.estimateShow}
                </em>
              </span>
              <span
                className="stt-hotel-estimate-chevron"
                data-open={estimateOpen}
                aria-hidden="true"
              >
                ⌄
              </span>
            </button>

            <div
              id={`${formId}-estimate`}
              className="stt-hotel-estimate-detail"
              data-open={estimateOpen}
              hidden={!estimateOpen}
            >
              <div className="stt-hotel-estimate-line">
                <div>
                  <strong>{labels.estimateTour}</strong>
                  <small>
                    {quote.tourPrice
                      ? `${quote.tourPrice.title}${
                          quote.tourPrice.packageLabel
                            ? ` · ${quote.tourPrice.packageLabel}`
                            : ""
                        }`
                      : labels.estimateNoTour}
                  </small>
                </div>
                <div>
                  {quote.tourPrice &&
                  quote.tourPrice.adultSubtotal !== null &&
                  quote.tourPrice.adultPrice !== null ? (
                    <p>
                      {labels.estimateAdults
                        .replace("{count}", String(quote.tourPrice.adults))
                        .replace(
                          "{price}",
                          vnd(quote.tourPrice.adultPrice, locale),
                        )}
                    </p>
                  ) : null}
                  {quote.tourPrice && quote.tourPrice.children > 0 ? (
                    <p>
                      {quote.tourPrice.childPrice !== null
                        ? labels.estimateChildren
                            .replace("{count}", String(quote.tourPrice.children))
                            .replace(
                              "{price}",
                              vnd(quote.tourPrice.childPrice, locale),
                            )
                        : labels.estimateNeeds}
                    </p>
                  ) : null}
                  <strong>
                    {quote.tourPrice?.total !== null &&
                    quote.tourPrice?.total !== undefined
                      ? vnd(quote.tourPrice.total, locale)
                      : quote.tourPrice
                        ? labels.estimateNeeds
                        : "—"}
                  </strong>
                </div>
              </div>

              <div className="stt-hotel-estimate-line">
                <div>
                  <strong>{labels.estimateStay}</strong>
                  <small>
                    {quote.quote.nights > 0
                      ? labels.quoteNights.replace(
                          "{count}",
                          String(quote.quote.nights),
                        )
                      : labels.quoteNoDates}
                  </small>
                </div>
                <div>
                  {quote.quote.includedByTour ? (
                    <p>{labels.quoteIncluded}</p>
                  ) : null}
                  <ul>
                    {quote.quote.rooms.map((line) => {
                      const room = rooms.find((item) => item.id === line.roomId);
                      return (
                        <li key={line.roomId}>
                          <span>
                            {labels.estimateRooms
                              .replace("{name}", room?.name ?? line.roomId)
                              .replace("{count}", String(line.quantity))}
                          </span>
                          <span>
                            {line.total !== null
                              ? vnd(line.total, locale)
                              : labels.estimateNeeds}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <strong>
                    {quote.estimate.lodgingTotal !== null
                      ? vnd(quote.estimate.lodgingTotal, locale)
                      : labels.estimateNeeds}
                  </strong>
                </div>
              </div>

              <div className="stt-hotel-estimate-total">
                <span>{labels.estimateTotal}</span>
                <strong>
                  {quote.estimate.total !== null
                    ? vnd(quote.estimate.total, locale)
                    : labels.estimateNeeds}
                </strong>
              </div>
              {quote.estimate.status !== "quoted" ? (
                <p className="stt-hotel-fine">{labels.estimateNeedsHint}</p>
              ) : null}
              <p className="stt-hotel-fine">{labels.estimateNote}</p>
            </div>
          </section>
        ) : null}

        <label className="stt-hotel-field">
          <span>{labels.fullName}</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoComplete="name"
            required
          />
          {errors.fullName ? (
            <small className="stt-hotel-error">{errors.fullName.join(" · ")}</small>
          ) : null}
        </label>
        <label className="stt-hotel-field">
          <span>{labels.phone}</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            inputMode="tel"
            required
          />
          {errors.phone ? (
            <small className="stt-hotel-error">{errors.phone.join(" · ")}</small>
          ) : null}
        </label>
        <label className="stt-hotel-field">
          <span>
            {labels.email} <em>({labels.optional})</em>
          </span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            type="email"
          />
          {errors.email ? (
            <small className="stt-hotel-error">{errors.email.join(" · ")}</small>
          ) : null}
        </label>
        <label className="stt-hotel-field">
          <span>
            {labels.message} <em>({labels.optional})</em>
          </span>
          <textarea
            rows={3}
            value={message}
            maxLength={2000}
            onChange={(event) => setMessage(event.target.value)}
          />
          {errors.message ? (
            <small className="stt-hotel-error">{errors.message.join(" · ")}</small>
          ) : null}
        </label>

        <label className="stt-hotel-check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            required
          />
          <span>{labels.consent}</span>
        </label>
        <p className="stt-hotel-fine">
          {labels.consentHint}{" "}
          <Link href={labels.privacyHref}>{labels.privacyLabel}</Link>
        </p>
        {errors.consent ? (
          <p className="stt-hotel-error" role="alert">
            {errors.consent.join(" · ")}
          </p>
        ) : null}

        <label className="stt-hotel-honeypot" aria-hidden="true">
          <span>Công ty</span>
          <input
            tabIndex={-1}
            autoComplete="off"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>

        {formError ? (
          <p className="stt-hotel-error" role="alert">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          className="stt-btn-primary stt-hotel-submit"
          disabled={submitting}
        >
          {submitting ? labels.submitting : labels.submit}
        </button>
        <p className="stt-hotel-fine">{labels.quoteNotConfirmed}</p>
      </form>
    </aside>
  );
}

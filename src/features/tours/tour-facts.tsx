import type { Tour } from "@/domain/tour";
import { format, getMessages } from "@/i18n/messages";
import type { Locale } from "@/i18n/config";
import { formatDuration, formatPriceFrom, hasPublishedPrice } from "@/lib/format";
import { SectionHeading } from "@/components/ui/layout";
import { CheckIcon, CloseIcon, ClockIcon, InfoIcon, MapPinIcon, UsersIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * The headline facts strip.
 *
 * This is a FULL-WIDTH, three-up strip (grid-cols-3 from `sm` up). Do not drop
 * it into a narrow grid column — at ~200px per cell the values wrap to pieces.
 */
export function TourKeyFacts({ tour, locale }: { tour: Tour; locale: Locale }) {
  const m = getMessages(locale);
  const facts = [
    {
      icon: ClockIcon,
      label: m.common.duration,
      value: formatDuration(tour.duration, locale),
    },
    {
      icon: MapPinIcon,
      label: m.common.destinationsCount,
      value:
        tour.destinationIds.length > 0
          ? format(m.tour.destinationsCountValue, { count: tour.destinationIds.length })
          : m.common.updating,
    },
    {
      icon: UsersIcon,
      label: m.common.departure,
      value: tour.departurePoints.join(", ") || m.common.departureFallback,
    },
  ];

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="flex items-start gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3.5"
        >
          <fact.icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary-strong" />
          <div className="min-w-0">
            <dt className="text-[0.6875rem] font-bold uppercase tracking-wider text-foreground-subtle">
              {fact.label}
            </dt>
            <dd className="text-sm font-semibold text-foreground">{fact.value}</dd>
          </div>
        </div>
      ))}
    </dl>
  );
}

/** Price + booking-condition block. */
export function TourPriceBlock({ tour, locale }: { tour: Tour; locale: Locale }) {
  const m = getMessages(locale);
  const hasPrice = hasPublishedPrice(tour.priceFrom);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-foreground-subtle">
        {hasPrice ? m.common.priceLabelFrom : m.common.priceLabelContact}
      </p>
      <p
        className={cn(
          "mt-1 font-extrabold text-foreground",
          hasPrice ? "text-display-sm" : "text-xl text-primary-strong",
        )}
      >
        {formatPriceFrom(tour.priceFrom, locale)}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-foreground-muted">
        {tour.priceNote ?? (hasPrice ? m.common.priceNoteKnown : m.common.priceNoteUnknown)}
      </p>
      <p className="mt-3 flex items-start gap-1.5 text-xs text-foreground-subtle">
        <InfoIcon className="mt-px h-3.5 w-3.5 shrink-0" />
        {m.common.noOnlineBooking}
      </p>
    </div>
  );
}

/** Included / excluded services. */
export function TourServices({ tour, locale }: { tour: Tour; locale: Locale }) {
  const m = getMessages(locale);
  if (tour.included.length === 0 && tour.excluded.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {tour.included.length > 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success-soft">
              <CheckIcon className="h-3.5 w-3.5 text-success" />
            </span>
            {m.tour.includedTitle}
          </h3>
          <ul className="mt-4 flex flex-col gap-2.5">
            {tour.included.map((item) => (
              <li key={item} className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-foreground-muted">
                <CheckIcon className="mt-1 h-4 w-4 shrink-0 text-success" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tour.excluded.length > 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-sunken">
              <CloseIcon className="h-3.5 w-3.5 text-foreground-subtle" />
            </span>
            {m.tour.excludedTitle}
          </h3>
          <ul className="mt-4 flex flex-col gap-2.5">
            {tour.excluded.map((item) => (
              <li key={item} className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-foreground-muted">
                <CloseIcon className="mt-1 h-4 w-4 shrink-0 text-foreground-subtle" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Practical notes ("Lưu ý"). */
export function TourNotes({ tour, locale }: { tour: Tour; locale: Locale }) {
  const m = getMessages(locale);
  if (tour.notes.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-warning-soft p-5 sm:p-6">
      <h3 className="text-base font-bold text-foreground">{m.tour.notesTitle}</h3>
      <ul className="mt-4 flex flex-col gap-2.5">
        {tour.notes.map((note) => (
          <li key={note} className="flex gap-2.5 text-[0.9375rem] leading-relaxed text-foreground">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Cancellation / payment terms.
 * Rendered only when the owner has supplied verified wording — an empty array
 * hides the block entirely rather than showing invented policy text.
 */
export function TourPolicies({ tour, locale }: { tour: Tour; locale: Locale }) {
  const m = getMessages(locale);
  if (tour.policies.length === 0) return null;

  return (
    <section aria-labelledby="tour-policies" className="flex flex-col gap-4">
      <h2 id="tour-policies" className="text-display-sm font-display font-semibold text-foreground">
        {m.tour.policiesTitle}
      </h2>
      <ul className="flex flex-col gap-2.5">
        {tour.policies.map((policy) => (
          <li key={policy} className="text-[0.9375rem] leading-relaxed text-foreground-muted">
            {policy}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * "Điểm nổi bật".
 *
 * Rendered as a numbered editorial list in one or two columns. A plain card grid
 * looked sparse with only a handful of short lines; numbering gives the eye a
 * path and the hairline rules keep two columns from reading as one long list.
 */
export function TourHighlights({ tour, locale }: { tour: Tour; locale: Locale }) {
  const m = getMessages(locale);
  if (tour.highlights.length === 0) return null;

  return (
    <section aria-labelledby="tour-highlights" className="flex flex-col gap-6">
      <SectionHeading
        eyebrow={m.tour.highlightsEyebrow}
        title={<span id="tour-highlights">{m.tour.highlightsTitle}</span>}
        as="h2"
      />

      <ol className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
        {tour.highlights.map((highlight, index) => (
          <li
            key={highlight}
            className="flex items-start gap-4 border-b border-border py-4 first:border-t sm:[&:nth-child(2)]:border-t"
          >
            <span
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-xs font-extrabold tabular-nums tracking-tight text-brand-400"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-[0.9375rem] leading-relaxed text-foreground">{highlight}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

import type { ItineraryDay } from "@/domain/tour";
import { Badge } from "@/components/ui/badge";
import { MapPinIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { format, getMessages } from "@/i18n/server";

/**
 * Day-by-day itinerary.
 *
 * The connecting gradient rail is the site's "journey line" motif: it is the
 * one decorative device used consistently, and it encodes the sequence the
 * content already has rather than adding ornament.
 */
export function ItineraryTimeline({
  days,
  locale,
}: {
  days: readonly ItineraryDay[];
  locale: Locale;
}) {
  const m = getMessages(locale);

  if (days.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border-strong bg-surface px-5 py-6 text-sm text-foreground-muted">
        {m.tour.itineraryEmpty}
      </p>
    );
  }

  return (
    <ol className="relative flex flex-col gap-8">
      {days.map((day, index) => {
        const isLast = index === days.length - 1;
        return (
          <li key={day.id} className="relative pl-12 sm:pl-16">
            {/* Journey line */}
            {!isLast ? (
              <span
                aria-hidden="true"
                className="absolute left-[1.375rem] top-12 bottom-[-2rem] w-px bg-gradient-to-b from-brand-300 via-brand-200 to-transparent sm:left-[1.625rem]"
              />
            ) : null}

            {/* Day marker */}
            <span
              aria-hidden="true"
              className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-full brand-gradient text-sm font-extrabold text-white shadow-card sm:h-13 sm:w-13 sm:text-base"
            >
              {day.index}
            </span>

            <details
              open={index === 0}
              className="group rounded-2xl border border-border bg-surface p-5 shadow-soft transition-shadow duration-300 hover:shadow-card sm:p-6"
            >
              <summary className="cursor-pointer list-none rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-strong">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-lg font-bold text-foreground">
                    <span className="text-primary-strong">
                      {format(m.tour.dayLabel, { index: day.index })}
                    </span>{" "}
                    {day.title}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="text-xl font-light text-primary-strong transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                  {day.accommodation ? (
                    <span className="text-xs font-medium text-foreground-subtle">
                      {day.accommodation}
                    </span>
                  ) : null}
                </div>
              </summary>
              <div className="mt-5 flex flex-col gap-4 border-t border-border pt-5">
                {day.summary ? (
                  <p className="text-[0.9375rem] leading-relaxed text-foreground-muted">
                    {day.summary}
                  </p>
                ) : null}

                {day.activities.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {day.activities.map((activity, activityIndex) => (
                      <li
                        key={`${activityIndex}-${activity}`}
                        className="flex gap-3 text-[0.9375rem] leading-relaxed text-foreground"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400"
                        />
                        {activity}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {day.places.length > 0 || day.meals.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {day.places.map((place) => (
                      <Badge key={place} tone="brand">
                        <MapPinIcon className="h-3 w-3" />
                        {place}
                      </Badge>
                    ))}
                    {day.meals.length > 0 ? (
                      <Badge tone="neutral">
                        {format(m.tour.mealsLabel, {
                          meals: day.meals.join(", "),
                        })}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </details>
          </li>
        );
      })}
    </ol>
  );
}

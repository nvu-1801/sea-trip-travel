import { getMessages } from "@/i18n/server";
import { ROUTES } from "@/config/navigation";
import { Container } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ClockIcon,
  MapPinIcon,
} from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { landingSections } from "@/server/cms/store";
import { localizePath } from "@/i18n/routing";

/**
 * Trip planner section.
 *
 * A full planning block instead of a bare search bar: headline, the search
 * form (GET to `/tim-tour`, unchanged contract), then three panels —
 * suggested destinations, durations and a help card — so visitors who are
 * not ready to type still have somewhere to go.
 */
export function QuickFinder({ locale }: { locale: Locale }) {
  let suggestions = [
    { label: "Quy Nhơn", query: "quy nhon" },
    { label: "Phú Yên", query: "phu yen" },
    { label: "Kỳ Co", query: "ky co" },
  ];
  try {
    const saved = landingSections().finder.suggestions;
    if (saved.length) suggestions = saved;
  } catch {
    // fallback seed khi CMS chưa bật
  }
  const en = locale === "en";
  const copy = getMessages(locale).home.finder;
  const action = localizePath(locale, "/tim-tour");
  const durations = copy.durations;

  return (
    <section
      id="tim-hanh-trinh"
      className="journey-finder"
      aria-labelledby="finder-title"
    >
      <Container>
        <Reveal className="intro-centered">
          <p className="eyebrow-pill">
            <span aria-hidden="true" />
            {copy.eyebrow}
          </p>
          <h2 id="finder-title">{copy.title}</h2>
          <p>{copy.description}</p>
        </Reveal>

        <Reveal variant="zoom" className="finder-search-card">
          <form action={action} className="journey-finder-form">
            <label className="finder-field">
              <span>
                <MapPinIcon className="finder-field-icon" />
                {copy.destinationLabel}
              </span>
              <span className="finder-control">
                <input
                  name="q"
                  maxLength={100}
                  placeholder={copy.placeholder}
                />
              </span>
            </label>
            <label className="finder-field">
              <span>
                <ClockIcon className="finder-field-icon" />
                {copy.durationLabel}
              </span>
              <span className="finder-control finder-select">
                <select name="days" defaultValue="">
                  <option value="">{copy.flexibleLabel}</option>
                  {[1, 2, 3].map((day) => (
                    <option key={day} value={day}>
                      {en
                        ? `${day} ${day === 1 ? "day" : "days"}`
                        : `${day} ngày`}
                    </option>
                  ))}
                  <option value="4+">{copy.longDuration}</option>
                </select>
                <ChevronDownIcon className="finder-select-icon" />
              </span>
            </label>
            <button type="submit">
              {copy.cta}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </form>
        </Reveal>

        <div className="finder-panels">
          <Reveal className="finder-panel">
            <p className="finder-panel-title">
              <MapPinIcon className="finder-field-icon" />
              {copy.suggestionsTitle}
            </p>
            <ul>
              {suggestions.map(({ label, query }) => (
                <li key={query}>
                  <a href={`${action}?q=${encodeURIComponent(query)}`}>
                    {label}
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="finder-panel" delay={1}>
            <p className="finder-panel-title">
              <ClockIcon className="finder-field-icon" />
              {copy.durationsTitle}
            </p>
            <ul>
              {durations.map((item) => (
                <li key={item.days}>
                  <a href={`${action}?days=${encodeURIComponent(item.days)}`}>
                    <strong>{item.label}</strong>
                    <span>{item.body}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal className="finder-panel finder-panel-help" delay={2}>
            <p className="finder-panel-title">{copy.helpTitle}</p>
            <p>{copy.helpBody}</p>
            <div>
              <a href="#tu-van" className="finder-help-primary">
                {copy.helpCta}
                <ArrowRightIcon className="h-4 w-4" />
              </a>
              <a
                href={localizePath(locale, ROUTES.guides)}
                className="finder-help-secondary"
              >
                {copy.guidesCta}
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

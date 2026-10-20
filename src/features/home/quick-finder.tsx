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
  const action = localizePath(locale, "/tim-tour");
  return (
    <section
      id="tim-hanh-trinh"
      className="journey-finder"
      aria-labelledby="finder-title"
    >
      <Container>
        <Reveal className="journey-finder-bar" variant="zoom">
          <div className="journey-finder-intro">
            <span className="journal-eyebrow">
              {en ? "YOUR NEXT CHAPTER" : "CHUYẾN ĐI TIẾP THEO"}
            </span>
            <h2 id="finder-title">
              {en ? "Where shall we go?" : "Mình đi đâu nhé?"}
            </h2>
          </div>
          <form action={action} className="journey-finder-form">
            <label className="finder-field">
              <span>
                <MapPinIcon className="finder-field-icon" />
                {en ? "Destination" : "Điểm đến"}
              </span>
              <span className="finder-control">
                <input
                  name="q"
                  maxLength={100}
                  placeholder={
                    en ? "Where would you like to go?" : "Quy Nhơn, Phú Yên…"
                  }
                />
              </span>
            </label>
            <label className="finder-field">
              <span>
                <ClockIcon className="finder-field-icon" />
                {en ? "Duration" : "Thời gian"}
              </span>
              <span className="finder-control finder-select">
                <select name="days" defaultValue="">
                  <option value="">
                    {en ? "I am flexible" : "Mình linh hoạt"}
                  </option>
                  {[1, 2, 3].map((day) => (
                    <option key={day} value={day}>
                      {en
                        ? `${day} ${day === 1 ? "day" : "days"}`
                        : `${day} ngày`}
                    </option>
                  ))}
                  <option value="4+">
                    {en ? "4 days or more" : "Từ 4 ngày"}
                  </option>
                </select>
                <ChevronDownIcon className="finder-select-icon" />
              </span>
            </label>
            <button type="submit">
              {en ? "Find a trip" : "Tìm chuyến đi"}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </form>
        </Reveal>
        <div className="journey-finder-links">
          <span>{en ? "Start with an idea" : "Bắt đầu từ một gợi ý"}</span>
          {suggestions.map(({ label, query }) => (
            <a
              key={query}
              href={`${action}?q=${encodeURIComponent(query)}`}
            >
              {label}
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </Container>
    </section>
  );
}

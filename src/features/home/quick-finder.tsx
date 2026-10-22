import { ROUTES } from "@/config/navigation";
import { Container } from "@/components/ui/layout";
import { SectionEyebrow } from "@/components/ui/section-eyebrow";
import { Reveal, RevealGroup } from "@/components/ui/reveal";
import {
  ArrowRightIcon,
  ClockIcon,
  MapPinIcon,
} from "@/components/ui/icons";
import { TimeSelect, type TimeOption } from "./time-select";
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
  const action = localizePath(locale, "/tim-tour");
  const timeOptions: TimeOption[] = en
    ? [
        { value: "", label: "I am flexible", hint: "Show every duration" },
        { value: "1", label: "1 day", hint: "Out in the morning, back by evening" },
        { value: "2", label: "2 days", hint: "A weekend escape" },
        { value: "3", label: "3 days", hint: "Roomier, with an extra night" },
        { value: "4+", label: "4+ days", hint: "Link more stops, go deeper" },
      ]
    : [
        { value: "", label: "Mình linh hoạt", hint: "Hiện mọi thời lượng" },
        { value: "1", label: "1 ngày", hint: "Đi trong ngày, tối về lại phố" },
        { value: "2", label: "2 ngày", hint: "Cuối tuần đổi gió" },
        { value: "3", label: "3 ngày", hint: "Thong thả thêm một đêm" },
        { value: "4+", label: "Từ 4 ngày", hint: "Nối nhiều điểm, đi sâu hơn" },
      ];
  const durations = en
    ? [
        { days: "1", label: "1 day", body: "Out in the morning, back by evening." },
        { days: "2", label: "2 days", body: "A weekend escape." },
        { days: "3", label: "3 days", body: "Roomier, with an extra night." },
        { days: "4+", label: "4+ days", body: "Link more stops, go deeper." },
      ]
    : [
        { days: "1", label: "1 ngày", body: "Đi trong ngày, tối về lại phố." },
        { days: "2", label: "2 ngày", body: "Cuối tuần đổi gió." },
        { days: "3", label: "3 ngày", body: "Thong thả thêm một đêm." },
        { days: "4+", label: "Từ 4 ngày", body: "Nối nhiều điểm, đi sâu hơn." },
      ];

  return (
    <section
      id="tim-hanh-trinh"
      className="journey-finder"
      aria-labelledby="finder-title"
    >
      <Container>
        <RevealGroup className="intro-centered">
          <SectionEyebrow className="eyebrow-pill">
            {en ? "PLAN YOUR TRIP" : "LÊN KẾ HOẠCH"}
          </SectionEyebrow>
          <h2 id="finder-title">
            {en ? (
              <>
                Where shall we <em>go</em>?
              </>
            ) : (
              <>
                Một hành trình <em>dành cho bạn</em>
              </>
            )}
          </h2>
          <p>
            {en
              ? "Tell us where you want to go and how long you have. Or start from a suggestion — every path leads to a real itinerary."
              : "Cho SEA TRIP biết nơi bạn muốn đến và số ngày bạn có. Hoặc bắt đầu từ một gợi ý — đường nào cũng dẫn tới lịch trình cụ thể."}
          </p>
        </RevealGroup>

        <Reveal variant="zoom" className="finder-search-card">
          <form action={action} className="journey-finder-form">
            <label className="finder-field">
              <span>
                <MapPinIcon className="finder-field-icon" />
                {en ? "Destination" : "Điểm đến"}
              </span>
              <span className="finder-control">
                <input
                  name="q"
                  type="text"
                  maxLength={100}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  aria-label={en ? "Destination" : "Điểm đến"}
                  placeholder={
                    en ? "Where would you like to go?" : "Quy Nhơn, Phú Yên…"
                  }
                />
              </span>
            </label>
            <div className="finder-field">
              <span id="finder-duration-label">
                <ClockIcon className="finder-field-icon" />
                {en ? "Duration" : "Thời gian"}
              </span>
              <span className="finder-control">
                <TimeSelect
                  name="days"
                  label={en ? "Duration" : "Thời gian"}
                  options={timeOptions}
                />
              </span>
            </div>
            <button type="submit">
              {en ? "Find a trip" : "Tìm chuyến đi"}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </form>
        </Reveal>

        <div className="finder-panels">
          <Reveal className="finder-panel">
            <p className="finder-panel-title">
              <MapPinIcon className="finder-field-icon" />
              {en ? "Suggested destinations" : "Điểm đến gợi ý"}
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
              {en ? "Browse by duration" : "Chọn theo số ngày"}
            </p>
            <ul>
              {durations.map((item) => (
                <li key={item.days}>
                  <a
                    href={`${action}?days=${encodeURIComponent(item.days)}`}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.body}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal
            className="finder-panel finder-panel-help"
            delay={2}
          >
            <p className="finder-panel-title">
              {en ? "Not sure yet?" : "Chưa biết đi đâu?"}
            </p>
            <p>
              {en
                ? "Tell us your days and group size — advice is free, and there is no deposit online."
                : "Cho biết số ngày và số người — tư vấn miễn phí, không cần đặt cọc online."}
            </p>
            <div>
              <a href="#tu-van" className="finder-help-primary">
                {en ? "Chat for free advice" : "Nhắn tư vấn miễn phí"}
                <ArrowRightIcon className="h-4 w-4" />
              </a>
              <a
                href={localizePath(locale, ROUTES.guides)}
                className="finder-help-secondary"
              >
                {en ? "Read the travel guides" : "Đọc cẩm nang du lịch"}
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

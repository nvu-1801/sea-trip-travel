import { Container } from "@/components/ui/layout";
import { CompassIcon, ArrowRightIcon } from "@/components/ui/icons";
import { TimeSelect, type TimeOption } from "./time-select";
import type { Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
export function QuickFinder({ locale }: { locale: Locale }) {
  const en = locale === "en",
    action = localizePath(locale, "/tim-tour");
  const timeOptions: readonly TimeOption[] = en
    ? [
        { value: "", label: "I am flexible", hint: "Any duration" },
        { value: "1", label: "A day away", hint: "1 day" },
        { value: "2", label: "A weekend escape", hint: "2 days" },
        { value: "3", label: "Three days to explore", hint: "3 days" },
        { value: "4+", label: "A longer journey", hint: "4+ days" },
      ]
    : [
        { value: "", label: "Mình linh hoạt", hint: "Mọi thời lượng" },
        { value: "1", label: "Một ngày đổi gió", hint: "1 ngày" },
        { value: "2", label: "Hai ngày thư thả", hint: "2 ngày" },
        { value: "3", label: "Ba ngày khám phá", hint: "3 ngày" },
        { value: "4+", label: "Bốn ngày trở lên", hint: "Từ 4 ngày" },
      ];
  return (
    <section id="tim-hanh-trinh" className="stt-finder-section">
      <Container>
        <div className="stt-finder-island">
          <div className="stt-finder-intro">
            <span className="stt-finder-symbol" aria-hidden="true">
              <CompassIcon className="h-6 w-6" />
            </span>
            <div>
              <h2>
                {en
                  ? "Find your next journey"
                  : "Tìm hành trình phù hợp với bạn"}
              </h2>
            </div>
          </div>
          <form action={action} className="stt-finder-fields">
            <label>
              <span className="stt-finder-caption">
                {en ? "Your destination" : "Điểm đến của bạn"}
              </span>
              <input
                name="q"
                placeholder={
                  en
                    ? "Sea, mountains, or a city…"
                    : "Biển xanh, miền núi hay phố cổ…"
                }
                maxLength={100}
              />
            </label>
            <label>
              <span className="stt-finder-caption">
                {en ? "Your time" : "Thời gian của bạn"}
              </span>
              <TimeSelect
                name="days"
                label={en ? "Your time" : "Thời gian của bạn"}
                options={timeOptions}
              />
            </label>
            <button type="submit">
              {en ? "Explore" : "Khám phá"}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </form>
          <div className="stt-finder-suggestions">
            <span>{en ? "A few ideas:" : "Gợi ý cho bạn:"}</span>
            {[
              ["Quy Nhơn", "quy nhon"],
              ["Phú Yên", "phu yen"],
              ["Đà Nẵng", "da nang"],
            ].map(([label, q]) => (
              <a key={q} href={`${action}?q=${encodeURIComponent(q)}`}>
                {label}
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

import { Container } from "@/components/ui/layout";
import {
  CompassIcon,
  ArrowRightIcon,
  ChevronDownIcon,
} from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
export function QuickFinder({ locale }: { locale: Locale }) {
  const en = locale === "en",
    action = localizePath(locale, "/tim-tour");
  return (
    <section id="tim-hanh-trinh" className="stt-finder-section">
      <Container>
        <div className="stt-finder-island">
          <div className="stt-finder-intro">
            <span className="stt-finder-symbol" aria-hidden="true">
              <CompassIcon className="h-6 w-6" />
            </span>
            <div>
              <p>{en ? "A little inspiration" : "Một chút cảm hứng"}</p>
              <h2>{en ? "Where to next?" : "Bạn muốn đi đâu tiếp theo?"}</h2>
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
              <span className="stt-finder-select">
                <select
                  name="days"
                  aria-label={en ? "Your time" : "Thời gian của bạn"}
                >
                  <option value="">
                    {en ? "I am flexible" : "Mình linh hoạt"}
                  </option>
                  <option value="1">
                    {en ? "A day away" : "Một ngày đổi gió"}
                  </option>
                  <option value="2">
                    {en ? "A weekend escape" : "Hai ngày thư thả"}
                  </option>
                  <option value="3">
                    {en ? "Three days to explore" : "Ba ngày khám phá"}
                  </option>
                  <option value="4+">
                    {en ? "A longer journey" : "Bốn ngày trở lên"}
                  </option>
                </select>
                <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
              </span>
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

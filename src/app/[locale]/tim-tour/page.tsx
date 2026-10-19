import type { Metadata } from "next";
import { getTourSlugs, getTourBySlug } from "@/lib/data/tours";
import { toTourCard } from "@/features/tours/tour-card-model";
import { TourGrid } from "@/features/tours/tour-grid";
import { resolveLocaleFromParams } from "@/i18n/params";
import { Container } from "@/components/ui/layout";
import { searchKey as normalized } from "@/lib/search";
export const metadata: Metadata = {
  title: "Tìm hành trình phù hợp",
  robots: { index: false, follow: true },
};
export default async function SearchPage({
  params,
  searchParams,
}: PageProps<"/[locale]/tim-tour">) {
  const locale = await resolveLocaleFromParams(params),
    query = await searchParams;
  const q = String(query.q ?? "").slice(0, 100),
    days = String(query.days ?? ""),
    budget = String(query.budget ?? "");
  const found = getTourSlugs()
    .map((slug) => getTourBySlug(slug, locale)!)
    .filter(
      (tour) =>
        normalized(
          [
            tour.title,
            tour.summary,
            ...tour.tags,
            ...tour.departurePoints,
          ].join(" "),
        ).includes(normalized(q)) &&
        (!days ||
          (days === "4+"
            ? tour.duration.days >= 4
            : tour.duration.days === Number(days))) &&
        (!budget ||
          (budget === "contact"
            ? tour.priceFrom === null
            : tour.priceFrom !== null &&
              tour.priceFrom.amount > 0 &&
              tour.priceFrom.amount <= Number(budget))),
    );
  const en = locale === "en";
  return (
    <section className="py-12 sm:py-20">
      <Container>
        <p className="eyebrow">SEA TRIP · Explore your next chapter</p>
        <h1 className="text-display-lg font-display mt-3 mb-7">
          {en ? "Find your next journey" : "Một hành trình dành cho bạn"}
        </h1>
        <form className="stt-search-form" method="get">
          <label>
            {en ? "Destination or tour" : "Điểm đến hoặc tên tour"}
            <input
              name="q"
              defaultValue={q}
              placeholder={
                en ? "Where would you like to go?" : "Bạn muốn đi đâu?"
              }
            />
          </label>
          <label>
            {en ? "Duration" : "Thời gian"}
            <select name="days" defaultValue={days}>
              <option value="">
                {en ? "Any duration" : "Tất cả thời lượng"}
              </option>
              {[1, 2, 3, "4+"].map((day) => (
                <option value={day} key={day}>
                  {day} {en ? "days" : "ngày"}
                </option>
              ))}
            </select>
          </label>
          <label>
            {en ? "Budget" : "Ngân sách"}
            <select name="budget" defaultValue={budget}>
              <option value="">{en ? "Any budget" : "Tất cả mức giá"}</option>
              <option value="1000000">≤ 1.000.000 đ</option>
              <option value="3000000">≤ 3.000.000 đ</option>
              <option value="5000000">≤ 5.000.000 đ</option>
              <option value="contact">
                {en ? "Contact for price" : "Liên hệ báo giá"}
              </option>
            </select>
          </label>
          <button type="submit">
            {en ? "Find a journey →" : "Tìm hành trình →"}
          </button>
        </form>
        <div className="my-8 flex justify-between gap-4">
          <p role="status">
            {found.length} {en ? "journeys for you" : "hành trình phù hợp"}
          </p>
          <a
            href={locale === "en" ? "/en/tim-tour" : "/tim-tour"}
            className="text-primary-strong underline"
          >
            {en ? "Clear filters" : "Xóa bộ lọc"}
          </a>
        </div>
        {found.length ? (
          <TourGrid tours={found.map((tour) => toTourCard(tour, locale))} />
        ) : (
          <div className="rounded-3xl border border-border p-10 text-center">
            <h2 className="text-xl font-semibold">
              {en ? "Try another destination" : "Thử một điểm đến khác nhé"}
            </h2>
            <p className="mt-3">
              {en
                ? "Adjust your filters or ask us for a tailored itinerary."
                : "Điều chỉnh bộ lọc hoặc để SEA TRIP tư vấn hành trình riêng cho bạn."}
            </p>
            <a
              className="inline-flex mt-6 text-primary-strong"
              href={locale === "en" ? "/en/lien-he" : "/lien-he"}
            >
              {en ? "Talk to us →" : "Nhận tư vấn →"}
            </a>
          </div>
        )}
      </Container>
    </section>
  );
}

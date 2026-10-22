import type { Metadata } from "next";
import { getTourSlugs, getTourBySlug } from "@/lib/data/tours";
import { getDestinations } from "@/lib/data/destinations";
import { toTourCard } from "@/features/tours/tour-card-model";
import { TourGrid } from "@/features/tours/tour-grid";
import { resolveLocaleFromParams } from "@/i18n/params";
import { Container } from "@/components/ui/layout";
import { searchKey as normalized } from "@/lib/search";
import { TimeSelect, type TimeOption } from "@/features/home/time-select";
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/tim-tour">): Promise<Metadata> {
  const locale = await resolveLocaleFromParams(params);
  return {
    title:
      locale === "en" ? "Find a journey that fits" : "Tìm hành trình phù hợp",
    robots: { index: false, follow: true },
  };
}
export default async function SearchPage({
  params,
  searchParams,
}: PageProps<"/[locale]/tim-tour">) {
  const locale = await resolveLocaleFromParams(params),
    query = await searchParams;
  const q = String(query.q ?? "").slice(0, 100),
    days = String(query.days ?? ""),
    budget = String(query.budget ?? "");
  // Resolve once: destination names are part of the tour search haystack.
  const destinationNames = new Map(
    getDestinations(locale).map((destination) => [
      destination.id,
      destination.name,
    ]),
  );
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
            // A destination attached to the tour is part of what guests search
            // for ("Kỳ Co", "Cù Lao Xanh"), so include its resolved name.
            ...tour.destinationIds
              .map((id) => destinationNames.get(id))
              .filter((name): name is string => Boolean(name)),
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
  const dayOptions: TimeOption[] = en
    ? [
        { value: "", label: "Any duration", hint: "Show every tour" },
        { value: "1", label: "1 day", hint: "Out in the morning, back by evening" },
        { value: "2", label: "2 days", hint: "A weekend escape" },
        { value: "3", label: "3 days", hint: "Roomier, with an extra night" },
        { value: "4+", label: "4+ days", hint: "Link more stops, go deeper" },
      ]
    : [
        { value: "", label: "Tất cả thời lượng", hint: "Hiện mọi hành trình" },
        { value: "1", label: "1 ngày", hint: "Đi trong ngày, tối về lại phố" },
        { value: "2", label: "2 ngày", hint: "Cuối tuần đổi gió" },
        { value: "3", label: "3 ngày", hint: "Thong thả thêm một đêm" },
        { value: "4+", label: "Từ 4 ngày", hint: "Nối nhiều điểm, đi sâu hơn" },
      ];
  const budgetOptions: TimeOption[] = en
    ? [
        { value: "", label: "Any budget", hint: "Every price range" },
        { value: "1000000", label: "≤ 1,000,000 ₫", hint: "Budget-friendly trips" },
        { value: "3000000", label: "≤ 3,000,000 ₫", hint: "Mid-range comfort" },
        { value: "5000000", label: "≤ 5,000,000 ₫", hint: "Roomier journeys" },
        { value: "contact", label: "Contact for price", hint: "Confirmed when advising" },
      ]
    : [
        { value: "", label: "Tất cả mức giá", hint: "Mọi ngân sách" },
        { value: "1000000", label: "≤ 1.000.000 ₫", hint: "Tour tiết kiệm" },
        { value: "3000000", label: "≤ 3.000.000 ₫", hint: "Thoải mái tầm trung" },
        { value: "5000000", label: "≤ 5.000.000 ₫", hint: "Hành trình thong thả" },
        { value: "contact", label: "Liên hệ báo giá", hint: "Xác nhận khi tư vấn" },
      ];
  return (
    <section className="py-12 sm:py-20">
      <Container>
        <p className="eyebrow">
          {en
            ? "SEA TRIP · Explore your next chapter"
            : "SEA TRIP · Tìm chuyến đi tiếp theo"}
        </p>
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
            <TimeSelect
              name="days"
              label={en ? "Duration" : "Thời gian"}
              options={dayOptions}
              defaultValue={days}
            />
          </label>
          <label>
            {en ? "Budget" : "Ngân sách"}
            <TimeSelect
              name="budget"
              label={en ? "Budget" : "Ngân sách"}
              options={budgetOptions}
              defaultValue={budget}
            />
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

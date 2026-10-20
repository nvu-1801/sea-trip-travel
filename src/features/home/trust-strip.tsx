import { Container } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import {
  CalendarIcon,
  CompassIcon,
  ShieldIcon,
  UsersIcon,
} from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";

/**
 * Commitment strip.
 *
 * Sits where reference sites put a stats band — but every item here is a
 * checkable service promise, never an invented customer count, rating or
 * award (see the same rule in `ValuesSection`).
 */
export function TrustStrip({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const items = en
    ? [
        {
          icon: CalendarIcon,
          title: "Day-by-day itinerary",
          body: "Every tour page lists what happens each day.",
        },
        {
          icon: ShieldIcon,
          title: "Upfront pricing",
          body: "Published prices before you ask for advice.",
        },
        {
          icon: CompassIcon,
          title: "Free consultation",
          body: "Route and timing advice costs nothing.",
        },
        {
          icon: UsersIcon,
          title: "Support on the road",
          body: "A real team follows your trip with you.",
        },
      ]
    : [
        {
          icon: CalendarIcon,
          title: "Lịch trình rõ từng ngày",
          body: "Mỗi trang tour ghi rõ ngày nào đi đâu.",
        },
        {
          icon: ShieldIcon,
          title: "Giá công khai",
          body: "Niêm yết giá trước khi tư vấn.",
        },
        {
          icon: CompassIcon,
          title: "Tư vấn miễn phí",
          body: "Gợi ý tuyến và thời điểm, không mất phí.",
        },
        {
          icon: UsersIcon,
          title: "Đồng hành suốt chuyến",
          body: "Đội ngũ thật theo sát hành trình của bạn.",
        },
      ];
  return (
    <section
      aria-label={en ? "Our commitments" : "Cam kết của SEA TRIP"}
      className="border-y border-border bg-surface"
    >
      <Container>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-5 py-8 sm:grid-cols-2 sm:py-9 lg:grid-cols-4">
          {items.map((item, index) => (
            <Reveal
              as="li"
              key={item.title}
              delay={(index % 3) as 0 | 1 | 2}
              className="flex items-start gap-3.5"
            >
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft"
              >
                <item.icon className="h-5 w-5 text-primary-strong" />
              </span>
              <span>
                <span className="block font-bold text-foreground">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-sm leading-relaxed text-foreground-muted">
                  {item.body}
                </span>
              </span>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}

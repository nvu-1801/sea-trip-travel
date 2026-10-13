import { getCategories, getCategoryTourCount } from "@/lib/data/categories";
import { getDestinationsByRegion } from "@/lib/data/destinations";
import { REGION_LABELS } from "@/domain/common";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { CategoryCard } from "@/features/tours/category-card";
import { DestinationCard } from "@/features/destinations/destination-card";
import { ROUTES } from "@/config/navigation";

/**
 * "Khám phá nhanh" — the bridge between the brand promise and the catalogue.
 *
 * Every tile is real navigation: top-level categories first, then the
 * destinations inside the focus region. No decorative filters.
 */
export function ExploreSection() {
  const topLevel = getCategories().filter((category) => category.parentId === null);
  const focusDestinations = getDestinationsByRegion("quy-nhon-phu-yen").slice(0, 4);

  return (
    <Section tone="default" spacing="default">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Bắt đầu từ đâu"
            title="Khám phá theo tuyến bạn quan tâm"
            description="Hai tuyến chính của SEA TRIP: Quy Nhơn – Phú Yên và tour trong nước theo vùng miền."
            action={
              <ButtonLink href={ROUTES.domestic} variant="secondary">
                Xem tất cả tour trong nước
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
            }
          />
        </Reveal>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {topLevel.map((category) => (
            <Reveal as="li" key={category.id} className="flex">
              <CategoryCard
                category={category}
                tourCount={getCategoryTourCount(category.id)}
                className="w-full"
              />
            </Reveal>
          ))}
        </ul>

        <div className="mt-16 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <Reveal>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-strong">
                Điểm đến nổi bật
              </p>
              <h3 className="mt-3 text-display-sm font-extrabold text-foreground">
                {REGION_LABELS["quy-nhon-phu-yen"]}
              </h3>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-foreground-muted">
                Cụm điểm được nhiều khách chọn nhất trong tuyến trọng tâm. Mỗi điểm đều đã có tour
                tương ứng để bạn xem lịch trình ngay.
              </p>
              <ButtonLink
                href={ROUTES.quyNhonPhuYen}
                variant="secondary"
                className="mt-6"
              >
                Xem tuyến Quy Nhơn – Phú Yên
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
            </Reveal>
          </div>

          <ul className="grid gap-6 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-2">
            {focusDestinations.map((destination) => (
              <Reveal as="li" key={destination.id} className="flex">
                <DestinationCard
                  destination={destination}
                  href={ROUTES.quyNhonPhuYen}
                  className="w-full"
                />
              </Reveal>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}

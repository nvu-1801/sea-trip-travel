import { ROUTES } from "@/config/navigation";
import { getFeaturedTours } from "@/lib/data/tours";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { TourGrid } from "@/features/tours/tour-grid";
import { toTourCard } from "@/features/tours/tour-card";

/**
 * Featured tours. Prefers the Quy Nhơn – Phú Yên line-up (the site's focus) and
 * tops up from other regions so the section is never thin.
 */
export function FeaturedToursSection() {
  const tours = getFeaturedTours(6).map(toTourCard);

  return (
    <Section tone="muted" spacing="loose">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Tuyến trọng tâm"
            title="Tour Quy Nhơn – Phú Yên nổi bật"
            description="Từ tour trong ngày tới hành trình 5 ngày kết hợp hai tỉnh. Chọn theo thời gian bạn có."
            action={
              <ButtonLink href={ROUTES.quyNhonPhuYen} variant="secondary">
                Xem toàn bộ tuyến
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
            }
          />
        </Reveal>

        <div className="mt-10">
          <TourGrid tours={tours} priorityCount={3} />
        </div>
      </Container>
    </Section>
  );
}

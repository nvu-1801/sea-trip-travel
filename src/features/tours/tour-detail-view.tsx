import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ROUTES } from "@/config/navigation";
import { getTourBySlug, getRelatedTours } from "@/lib/data/tours";
import { getCategoryById, getCategoryTrail } from "@/lib/data/categories";
import { getDestinationsByIds } from "@/lib/data/destinations";
import { formatDuration, formatPriceFrom } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, touristTripJsonLd } from "@/lib/json-ld";
import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ClockIcon, MapPinIcon, UsersIcon } from "@/components/ui/icons";
import { ConsultSection } from "@/features/leads/consult-section";
import { ItineraryTimeline } from "./itinerary-timeline";
import { TourGallery } from "./tour-gallery";
import { TourGrid } from "./tour-grid";
import { toTourCard } from "./tour-card";
import {
  TourHighlights,
  TourKeyFacts,
  TourNotes,
  TourPolicies,
  TourPriceBlock,
  TourServices,
} from "./tour-facts";
import { MobileConsultBar } from "./mobile-consult-bar";

const SECTIONS = [
  { id: "tong-quan", label: "Tổng quan" },
  { id: "diem-noi-bat", label: "Điểm nổi bật" },
  { id: "lich-trinh", label: "Lịch trình" },
  { id: "dich-vu", label: "Dịch vụ" },
  { id: "luu-y", label: "Lưu ý" },
  { id: "tu-van", label: "Tư vấn" },
] as const;

function crumbsFor(slug: string, tourTitle: string): Crumb[] {
  const tour = getTourBySlug(slug);
  const crumbs: Crumb[] = [{ label: "Trang chủ", href: ROUTES.home }];

  if (tour) {
    const category = getCategoryById(tour.categoryIds[0]);
    if (category) {
      const trail = getCategoryTrail(category.id);
      trail.forEach((item) => crumbs.push({ label: item.name, href: item.path }));
    }
  }

  crumbs.push({ label: tourTitle });
  return crumbs;
}

export function buildTourMetadata(slug: string): Metadata {
  const tour = getTourBySlug(slug);
  if (!tour) {
    return buildMetadata({
      title: "Không tìm thấy tour",
      description: "Tour bạn tìm không tồn tại hoặc đã được thay đổi.",
      path: `/tour/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: tour.seo?.title ?? tour.title,
    description: tour.seo?.description ?? tour.summary,
    path: `/tour/${tour.slug}`,
    keywords: tour.tags,
  });
}

export function TourDetailView({ slug }: { slug: string }) {
  const tour = getTourBySlug(slug);
  if (!tour) notFound();

  const destinations = getDestinationsByIds(tour.destinationIds);
  const related = getRelatedTours(tour.slug, 3).map(toTourCard);
  const crumbs = crumbsFor(tour.slug, tour.title);
  const primaryCategory = getCategoryById(tour.categoryIds[0]);
  const cover = tour.images[0]?.src ?? "/opengraph-image.png";

  return (
    <>
      <JsonLd
        id="ld-trip"
        data={touristTripJsonLd({
          title: tour.title,
          summary: tour.summary,
          slug: tour.slug,
          destinations,
          itinerary: tour.itinerary.map((day) => ({ title: day.title, summary: day.summary })),
          price: tour.priceFrom,
          image: cover,
        })}
      />
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd(
          crumbs.map((crumb) => ({
            label: crumb.label,
            path: crumb.href ?? `/tour/${tour.slug}`,
          })),
        )}
      />

      <Breadcrumbs items={crumbs} />

      <div className="pb-24 lg:pb-0">
        <Container>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            {/* --- Main column ------------------------------------------------ */}
            <div className="lg:col-span-7">
              <div className="flex flex-col gap-6">
                {primaryCategory ? (
                  <Link
                    href={primaryCategory.path}
                    className="w-fit text-xs font-bold uppercase tracking-[0.18em] text-primary-strong transition-colors hover:text-primary-strong-hover"
                  >
                    {primaryCategory.name}
                  </Link>
                ) : null}

                <h1 className="text-display-sm font-extrabold text-foreground sm:text-display">
                  {tour.title}
                </h1>

                <p className="text-[1.0625rem] leading-relaxed text-foreground-muted">
                  {tour.summary}
                </p>

                {destinations.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {destinations.map((destination) => (
                      <li
                        key={destination.id}
                        className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-foreground-muted"
                      >
                        <MapPinIcon className="h-3.5 w-3.5 text-primary-strong" />
                        {destination.name}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-8">
                <TourGallery images={tour.images} title={tour.title} />
              </div>

              {/* Key facts for narrow screens — the sticky aside covers these
                  from `lg` up, where there is room for both. */}
              <div className="mt-6 lg:hidden">
                <TourKeyFacts tour={tour} />
              </div>
            </div>

            {/* --- Sticky panel ---------------------------------------------- */}
            <aside className="lg:col-span-5">
              <div className="lg:sticky lg:top-28 flex flex-col gap-5">
                <div className="hidden rounded-2xl border border-border bg-surface-muted p-5 lg:block">
                  <dl className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-sm text-foreground-muted">
                        <ClockIcon className="h-4 w-4 text-primary-strong" />
                        Thời lượng
                      </dt>
                      <dd className="text-sm font-bold text-foreground">
                        {formatDuration(tour.duration)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-sm text-foreground-muted">
                        <UsersIcon className="h-4 w-4 text-primary-strong" />
                        Khởi hành
                      </dt>
                      <dd className="text-sm font-bold text-foreground">
                        {tour.departurePoints.join(", ") || "Liên hệ"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="flex items-center gap-2 text-sm text-foreground-muted">
                        <MapPinIcon className="h-4 w-4 text-primary-strong" />
                        Số điểm đến
                      </dt>
                      <dd className="text-sm font-bold text-foreground">{destinations.length}</dd>
                    </div>
                  </dl>
                </div>

                <TourPriceBlock tour={tour} />

                <div className="hidden rounded-2xl border border-border bg-surface p-5 shadow-soft lg:block">
                  <p className="text-sm font-semibold text-foreground">
                    Bạn muốn nhận lịch trình chi tiết?
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground-muted">
                    Gửi yêu cầu để được tư vấn giá, thời điểm và phương án phù hợp.
                  </p>
                  <ButtonLink href="#tu-van" size="lg" className="mt-4 w-full">
                    Nhận tư vấn tour này
                  </ButtonLink>
                  <p className="mt-3 text-center text-xs text-foreground-subtle">
                    Chưa hỗ trợ đặt tour trực tuyến
                  </p>
                </div>
              </div>
            </aside>
          </div>

          {/* --- In-page anchors --------------------------------------------- */}
          <nav aria-label="Nội dung trang" className="mt-10 border-y border-border sm:mt-12">
            <ul className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-5 py-2 sm:-mx-7 sm:px-7 lg:mx-0 lg:px-0">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="inline-flex min-h-10 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-semibold text-foreground-muted transition-colors hover:bg-primary-soft hover:text-primary-strong"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Container>

        {/* --- Overview ---------------------------------------------------- */}
        <Section id="tong-quan" tone="default" spacing="default">
          <Container>
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <SectionHeading eyebrow="Giới thiệu" title="Tổng quan chương trình" as="h2" />
                <div className="mt-6 flex flex-col gap-4">
                  {tour.overview.length > 0 ? (
                    tour.overview.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-[1.0625rem] leading-relaxed text-foreground-muted"
                      >
                        {paragraph}
                      </p>
                    ))
                  ) : (
                    <p className="rounded-xl border border-dashed border-border-strong bg-surface px-5 py-6 text-sm text-foreground-muted">
                      Phần giới thiệu đang được cập nhật. SEA TRIP sẽ gửi mô tả chi tiết khi liên hệ
                      tư vấn.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Container>
        </Section>

        {/* --- Highlights -------------------------------------------------- */}
        <Section id="diem-noi-bat" tone="muted" spacing="default">
          <Container>
            <Reveal>
              <TourHighlights tour={tour} />
            </Reveal>
          </Container>
        </Section>

        {/* --- Itinerary --------------------------------------------------- */}
        <Section id="lich-trinh" tone="default" spacing="default">
          <Container>
            <div className="grid gap-10 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <SectionHeading eyebrow="Chi tiết" title="Lịch trình" as="h2" />
                <p className="mt-4 text-sm leading-relaxed text-foreground-muted">
                  Thứ tự và thời gian có thể điều chỉnh theo thời tiết và tình hình thực tế.
                </p>
              </div>
              <div className="lg:col-span-9">
                <ItineraryTimeline days={tour.itinerary} />
              </div>
            </div>
          </Container>
        </Section>

        {/* --- Services ---------------------------------------------------- */}
        <Section id="dich-vu" tone="muted" spacing="default">
          <Container>
            <SectionHeading
              eyebrow="Quyền lợi"
              title="Dịch vụ bao gồm và không bao gồm"
              as="h2"
            />
            <div className="mt-8">
              <TourServices tour={tour} />
            </div>
          </Container>
        </Section>

        {/* --- Notes + policies -------------------------------------------- */}
        {tour.notes.length > 0 || tour.policies.length > 0 ? (
          <Section id="luu-y" tone="default" spacing="default">
            <Container>
              {tour.policies.length > 0 ? (
                <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                  <TourNotes tour={tour} />
                  <TourPolicies tour={tour} />
                </div>
              ) : (
                // No published terms yet: a single readable column beats a
                // half-empty two-column grid.
                <div className="max-w-3xl">
                  <TourNotes tour={tour} />
                </div>
              )}
            </Container>
          </Section>
        ) : null}

        {/* --- Related ----------------------------------------------------- */}
        {related.length > 0 ? (
          <Section tone="muted" spacing="default">
            <Container>
              <SectionHeading
                eyebrow="Gợi ý thêm"
                title="Tour liên quan"
                description="Các chương trình cùng tuyến hoặc cùng nhóm thời lượng."
                as="h2"
              />
              <div className="mt-8">
                <TourGrid tours={related} />
              </div>
            </Container>
          </Section>
        ) : null}
      </div>

      <ConsultSection
        id="tu-van"
        tourSlug={tour.slug}
        defaultInterest={tour.title}
        tone="default"
        spacing="loose"
        title="Nhận tư vấn cho tour này"
        description={`Để lại thông tin, SEA TRIP sẽ liên hệ tư vấn chi tiết về "${tour.title}" — giá hiện tại: ${formatPriceFrom(
          tour.priceFrom,
        )}.`}
      />

      <MobileConsultBar
        tourTitle={tour.title}
        priceLabel={formatPriceFrom(tour.priceFrom)}
      />
    </>
  );
}

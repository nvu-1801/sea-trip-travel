import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCategories,
  getCategoryAndDescendantIds,
  getCategoryByPath,
  getCategoryById,
  getCategoryTourCount,
  getCategoryTrail,
  getChildCategories,
} from "@/lib/data/categories";
import { getTourTags, getToursByCategoryId } from "@/lib/data/tours";
import { REGION_LABELS } from "@/domain/common";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, collectionPageJsonLd } from "@/lib/json-ld";
import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import { CategoryCard } from "./category-card";
import { TourExplorer } from "./tour-explorer";
import { toTourCard } from "./tour-card";
import { ConsultSection } from "@/features/leads/consult-section";

/**
 * Shared view for all tour category pages (parent and child).
 *
 * `categoryPath` is passed explicitly by each route file rather than read from
 * params, which keeps every category page a fully static prerender.
 */

function crumbsFor(path: string): Crumb[] {
  const category = getCategoryByPath(path);
  if (!category) return [{ label: "Trang chủ", href: "/" }];

  const trail = getCategoryTrail(category.id);
  const crumbs: Crumb[] = [{ label: "Trang chủ", href: "/" }];
  trail.forEach((item, index) => {
    const isLast = index === trail.length - 1;
    crumbs.push(isLast ? { label: item.name } : { label: item.name, href: item.path });
  });
  return crumbs;
}

export function buildCategoryMetadata(categoryPath: string): Metadata {
  const category = getCategoryByPath(categoryPath);
  if (!category) {
    return buildMetadata({
      title: "Không tìm thấy danh mục",
      description: "Danh mục bạn tìm không tồn tại.",
      path: categoryPath,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: category.seo?.title ?? category.name,
    description: category.seo?.description ?? category.description,
    path: category.path,
  });
}

export function CategoryPageView({ categoryPath }: { categoryPath: string }) {
  const category = getCategoryByPath(categoryPath);
  if (!category) notFound();

  const children = getChildCategories(category.id);
  const parent = category.parentId ? getCategoryById(category.parentId) : undefined;

  const tours = getToursByCategoryId(category.id).map(toTourCard);
  const tags = getTourTags();
  const crumbs = crumbsFor(categoryPath);

  // Sibling categories (or the other top-level lines) for onward navigation.
  const siblings = parent
    ? getChildCategories(parent.id).filter((item) => item.id !== category.id)
    : getCategories().filter((item) => item.parentId === null && item.id !== category.id);

  const descendantCount = getCategoryAndDescendantIds(category.id).length;

  return (
    <>
      <JsonLd
        id="ld-collection"
        data={collectionPageJsonLd({
          name: category.name,
          description: category.description,
          path: category.path,
          tours: tours.map((tour) => ({ title: tour.title, slug: tour.slug })),
        })}
      />
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd(
          crumbs.map((crumb) => ({ label: crumb.label, path: crumb.href ?? categoryPath })),
        )}
      />

      <Breadcrumbs items={crumbs} />

      <section className="relative overflow-hidden border-b border-border bg-surface-muted">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-brand-100/60 blur-3xl"
        />
        <Container>
          <div className="relative flex flex-col gap-5 py-12 sm:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-strong">
              {parent ? parent.name : "Tour trong nước"} · {REGION_LABELS[category.region]}
            </p>

            <h1 className="max-w-3xl text-display-sm font-extrabold text-foreground sm:text-display">
              {category.name}
            </h1>

            <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-foreground-muted">
              {category.description}
            </p>

            {children.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-2">
                {children.map((child) => (
                  <li key={child.id}>
                    <a
                      href={`#${child.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-strong"
                    >
                      {child.name}
                      <span className="text-xs font-medium text-foreground-subtle">
                        {getCategoryTourCount(child.id)}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Container>
      </section>

      <Section tone="default" spacing="default">
        <Container>
          <Reveal>
            <TourExplorer tours={tours} tags={tags} />
          </Reveal>
        </Container>
      </Section>

      {children.length > 0 ? (
        <Section tone="muted" spacing="default">
          <Container>
            <SectionHeading
              eyebrow="Chọn theo thời lượng"
              title="Nhóm tour trong danh mục này"
              description="Mỗi nhóm phù hợp với một quỹ thời gian khác nhau. Chọn nhóm gần với kế hoạch của bạn nhất."
            />
            <ul className="mt-8 grid gap-6 sm:grid-cols-2">
              {children.map((child) => (
                <Reveal as="li" key={child.id} className="flex">
                  <CategoryCard
                    category={child}
                    tourCount={getCategoryTourCount(child.id)}
                    className="w-full"
                  />
                </Reveal>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      {siblings.length > 0 ? (
        <Section tone="default" spacing="tight">
          <Container>
            <SectionHeading
              eyebrow="Xem thêm"
              title={parent ? `Các nhóm khác trong ${parent.name}` : "Các tuyến tour khác"}
              as="h2"
            />
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {siblings.map((sibling) => (
                <Reveal as="li" key={sibling.id} className="flex">
                  <CategoryCard
                    category={sibling}
                    tourCount={getCategoryTourCount(sibling.id)}
                    className="w-full"
                  />
                </Reveal>
              ))}
            </ul>
            <p className="mt-6 text-xs text-foreground-subtle">
              Danh mục này gồm {descendantCount} nhóm tour.
            </p>
          </Container>
        </Section>
      ) : null}

      <ConsultSection
        defaultInterest={category.name}
        tone="muted"
        title="Cần lịch trình riêng cho nhóm của bạn?"
        description="Cho SEA TRIP biết thời gian và số người, chúng tôi sẽ gợi ý phương án phù hợp với tuyến bạn đang xem."
      />
    </>
  );
}

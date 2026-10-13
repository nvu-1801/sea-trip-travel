import type { Metadata } from "next";
import { ROUTES } from "@/config/navigation";
import { getFeaturedArticle, getNonFeaturedArticles } from "@/lib/data/articles";
import { getCategoryTourCount, getTopLevelCategories } from "@/lib/data/categories";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import { ArticleCard } from "@/features/guides/article-card";
import { CategoryCard } from "@/features/tours/category-card";
import { ConsultSection } from "@/features/leads/consult-section";

export const metadata: Metadata = buildMetadata({
  title: "Cẩm nang du lịch",
  description:
    "Kinh nghiệm du lịch Quy Nhơn – Phú Yên và các tuyến trong nước: thời điểm, di chuyển, ăn ở và lịch trình gợi ý.",
  path: ROUTES.guides,
});

export default function GuidesPage() {
  const featured = getFeaturedArticle();
  const rest = getNonFeaturedArticles();
  const categories = getTopLevelCategories();
  const crumbs = [{ label: "Trang chủ", href: "/" }, { label: "Cẩm nang du lịch" }];

  return (
    <>
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: "Trang chủ", path: "/" },
          { label: "Cẩm nang du lịch", path: ROUTES.guides },
        ])}
      />

      <Breadcrumbs items={crumbs} />

      <section className="relative overflow-hidden border-b border-border bg-surface-muted">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-100/70 blur-3xl"
        />
        <Container>
          <div className="relative flex flex-col gap-4 py-12 sm:py-16">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-strong">
              Cẩm nang du lịch
            </p>
            <h1 className="max-w-3xl text-display-sm font-extrabold text-foreground sm:text-display">
              Chuẩn bị tốt để chuyến đi nhẹ hơn
            </h1>
            <p className="max-w-2xl text-[1.0625rem] leading-relaxed text-foreground-muted">
              Những bài viết ngắn, tập trung vào việc cần quyết định: đi tháng nào, di chuyển ra sao,
              ăn gì và sắp lịch trình thế nào cho hợp lý.
            </p>
          </div>
        </Container>
      </section>

      {featured ? (
        <Section tone="default" spacing="default">
          <Container>
            <Reveal>
              <ArticleCard article={featured} variant="feature" />
            </Reveal>
          </Container>
        </Section>
      ) : null}

      {rest.length > 0 ? (
        <Section tone="muted" spacing="default">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="Bài viết khác"
                title="Đọc tiếp trước khi lên đường"
                as="h2"
              />
            </Reveal>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((article) => (
                <Reveal as="li" key={article.slug} className="flex">
                  <ArticleCard article={article} className="w-full" />
                </Reveal>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <Section tone="default" spacing="default">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="Từ cẩm nang tới tour"
              title="Xem tour tương ứng"
              description="Cẩm nang giúp bạn hình dung chuyến đi. Khi đã rõ hướng, xem lịch trình cụ thể."
              as="h2"
            />
          </Reveal>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2">
            {categories.map((category) => (
              <Reveal as="li" key={category.id} className="flex">
                <CategoryCard
                  category={category}
                  tourCount={getCategoryTourCount(category.id)}
                  className="w-full"
                />
              </Reveal>
            ))}
          </ul>
        </Container>
      </Section>

      <ConsultSection
        tone="muted"
        title="Vẫn còn câu hỏi về chuyến đi?"
        description="Đọc xong vẫn phân vân thời điểm hay lịch trình? Gửi câu hỏi, SEA TRIP trả lời cụ thể cho trường hợp của bạn."
      />
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ROUTES } from "@/config/navigation";
import { getArticleBySlug, getArticleSlugs, getRelatedArticles } from "@/lib/data/articles";
import { getTourBySlug } from "@/lib/data/tours";
import { formatDateLong } from "@/lib/format";
import { buildMetadata } from "@/lib/seo";
import { articleJsonLd, breadcrumbJsonLd } from "@/lib/json-ld";
import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { JsonLd } from "@/components/seo/json-ld";
import { Reveal } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { AssetImage } from "@/components/ui/asset-image";
import { ClockIcon } from "@/components/ui/icons";
import { ArticleBody } from "@/features/guides/article-body";
import { ArticleCard } from "@/features/guides/article-card";
import { TourCard, toTourCard } from "@/features/tours/tour-card";
import { ConsultSection } from "@/features/leads/consult-section";

export function generateStaticParams() {
  return getArticleSlugs().map((slug) => ({ slug }));
}

/**
 * See the note in `app/tour/[slug]/page.tsx`: every real article slug is
 * prerendered, and the page's content depends entirely on the slug, so blocking
 * is the intended behaviour rather than a Suspense skeleton.
 */
export const instant = false;

export async function generateMetadata({
  params,
}: PageProps<"/cam-nang-du-lich/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return buildMetadata({
      title: "Không tìm thấy bài viết",
      description: "Bài viết bạn tìm không tồn tại hoặc đã được thay đổi.",
      path: `/cam-nang-du-lich/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: article.seo?.title ?? article.title,
    description: article.seo?.description ?? article.excerpt,
    path: `/cam-nang-du-lich/${article.slug}`,
    type: "article",
    publishedTime: article.publishedAt,
    keywords: article.tags,
    image: article.seo?.ogImage ?? article.cover?.src,
  });
}

export default async function ArticlePage({
  params,
}: PageProps<"/cam-nang-du-lich/[slug]">) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const relatedTours = article.relatedTourSlugs
    .map((tourSlug) => getTourBySlug(tourSlug))
    .filter((tour): tour is NonNullable<typeof tour> => Boolean(tour))
    .map(toTourCard);

  const relatedArticles = getRelatedArticles(article.slug, 3);
  const crumbs: Crumb[] = [
    { label: "Trang chủ", href: ROUTES.home },
    { label: "Cẩm nang du lịch", href: ROUTES.guides },
    { label: article.title },
  ];

  return (
    <>
      <JsonLd
        id="ld-article"
        data={articleJsonLd({
          title: article.title,
          excerpt: article.excerpt,
          slug: article.slug,
          publishedAt: article.publishedAt,
          updatedAt: article.updatedAt,
          image: article.cover?.src ?? "/opengraph-image.png",
          author: article.author,
        })}
      />
      <JsonLd
        id="ld-breadcrumb"
        data={breadcrumbJsonLd([
          { label: "Trang chủ", path: "/" },
          { label: "Cẩm nang du lịch", path: ROUTES.guides },
          { label: article.title, path: `/cam-nang-du-lich/${article.slug}` },
        ])}
      />

      <Breadcrumbs items={crumbs} />

      <Container>
        <article className="mx-auto max-w-3xl pt-4">
          <header className="flex flex-col gap-4">
            <h1 className="text-display-sm font-extrabold text-foreground sm:text-display">
              {article.title}
            </h1>

            <p className="text-[1.0625rem] leading-relaxed text-foreground-muted">
              {article.excerpt}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground-subtle">
              <time dateTime={article.publishedAt}>{formatDateLong(article.publishedAt)}</time>
              {article.readingMinutes ? (
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="h-4 w-4" />
                  {article.readingMinutes} phút đọc
                </span>
              ) : null}
              <span>{article.author}</span>
            </div>

            {article.tags.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {article.tags.map((tag) => (
                  <li key={tag}>
                    <Badge tone="outline">{tag}</Badge>
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          <AssetImage
            image={article.cover}
            altFallback={article.title}
            priority
            sizes="(max-width: 768px) 100vw, 48rem"
            className="mt-8 aspect-[16/9] w-full rounded-2xl border border-border shadow-soft"
            markPlaceholder
          />

          <div className="mt-10">
            <ArticleBody blocks={article.body} />
          </div>
        </article>
      </Container>

      {relatedTours.length > 0 ? (
        <Section tone="muted" spacing="default">
          <Container>
            <SectionHeading
              eyebrow="Đi ngay"
              title="Tour liên quan tới bài viết"
              description="Lịch trình cụ thể cho những điểm vừa nhắc tới."
              as="h2"
            />
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedTours.map((tour) => (
                <li key={tour.slug} className="flex">
                  <TourCard tour={tour} />
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      {relatedArticles.length > 0 ? (
        <Section tone="default" spacing="default">
          <Container>
            <SectionHeading
              eyebrow="Đọc thêm"
              title="Bài viết liên quan"
              as="h2"
              action={
                <ButtonLink href={ROUTES.guides} variant="secondary">
                  Tất cả cẩm nang
                </ButtonLink>
              }
            />
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedArticles.map((related) => (
                <Reveal as="li" key={related.slug} className="flex">
                  <ArticleCard article={related} className="w-full" />
                </Reveal>
              ))}
            </ul>
            <p className="mt-6 text-sm text-foreground-muted">
              Hoặc{" "}
              <Link
                href={ROUTES.contact}
                className="font-semibold text-primary-strong underline underline-offset-2"
              >
                gửi câu hỏi cho SEA TRIP
              </Link>
              .
            </p>
          </Container>
        </Section>
      ) : null}

      <ConsultSection
        tone="muted"
        title="Cần tư vấn cho kế hoạch cụ thể?"
        description="Cho SEA TRIP biết thời gian và số người, chúng tôi gợi ý lịch trình dựa trên những gì bạn vừa đọc."
      />
    </>
  );
}

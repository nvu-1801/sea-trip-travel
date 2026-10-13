import { ROUTES } from "@/config/navigation";
import { getFeaturedArticle, getNonFeaturedArticles } from "@/lib/data/articles";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { ArticleCard } from "@/features/guides/article-card";

/** Travel guide teasers: one lead article plus the three most recent. */
export function GuidesSection() {
  const featured = getFeaturedArticle();
  const rest = getNonFeaturedArticles().slice(0, 3);

  if (!featured) return null;

  return (
    <Section tone="default" spacing="loose">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Cẩm nang du lịch"
            title="Chuẩn bị trước khi lên đường"
            description="Kinh nghiệm thực tế về thời điểm, di chuyển và những điểm đáng dành thời gian."
            action={
              <ButtonLink href={ROUTES.guides} variant="secondary">
                Xem tất cả cẩm nang
                <ArrowRightIcon className="h-4 w-4" />
              </ButtonLink>
            }
          />
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <ArticleCard article={featured} variant="feature" className="h-full" />
          </Reveal>

          <ul className="flex flex-col gap-6 lg:col-span-5">
            {rest.map((article) => (
              <Reveal as="li" key={article.slug} className="flex">
                <ArticleCard
                  article={article}
                  className="w-full sm:flex-row lg:flex-col"
                />
              </Reveal>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}

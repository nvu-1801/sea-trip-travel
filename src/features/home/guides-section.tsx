import { ROUTES } from "@/config/navigation";
import { getFeaturedArticle, getNonFeaturedArticles } from "@/lib/data/articles";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { ArticleCard, CompactArticleRow } from "@/features/guides/article-card";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { localizePath } from "@/i18n/routing";

/**
 * Travel guide teasers.
 *
 * Two deliberate columns of equal height: a large featured card on the left and
 * the other guides in a bordered panel on the right. The panel gives the denser
 * list the same visual weight as the featured card, and the featured image is
 * told to fill its column (`imageFill`) so neither column can stretch the other
 * into an empty strip.
 */
export function GuidesSection({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const featured = getFeaturedArticle(locale);
  const rest = getNonFeaturedArticles(locale).slice(0, 3);

  if (!featured) return null;

  return (
    <Section tone="default" spacing="loose">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={m.home.guides.eyebrow}
            title={m.home.guides.title}
            description={m.home.guides.description}
            action={
              <ButtonLink
                href={localizePath(locale, ROUTES.guides)}
                variant="secondary"
                className="group"
              >
                {m.home.guides.cta}
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </ButtonLink>
            }
          />
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-stretch lg:gap-8">
          <Reveal className="flex lg:col-span-7">
            <ArticleCard
              article={featured}
              locale={locale}
              variant="feature"
              imageFill
              className="w-full"
            />
          </Reveal>

          <Reveal className="lg:col-span-5">
            <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground-subtle">
                {m.home.guides.otherArticles}
              </p>
              <ul className="mt-2 flex flex-1 flex-col divide-y divide-border border-t border-border">
                {rest.map((article) => (
                  <Reveal as="li" key={article.slug} className="flex flex-1 items-center">
                    <CompactArticleRow
                      article={article}
                      locale={locale}
                      className="w-full items-center first:pt-4"
                    />
                  </Reveal>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}

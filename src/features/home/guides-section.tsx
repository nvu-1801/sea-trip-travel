import Link from "next/link";
import { HeadingAccent } from "@/components/ui/heading-accent";
import { ROUTES } from "@/config/navigation";
import {
  getFeaturedArticle,
  getNonFeaturedArticles,
} from "@/lib/data/articles";
import { Container, Section } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { ArrowRightIcon, ClockIcon } from "@/components/ui/icons";
import { AssetImage } from "@/components/ui/asset-image";
import { formatDateLong } from "@/lib/format";
import type { Locale } from "@/i18n/config";
import { getMessages, plural } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";

/**
 * Travel guide teasers — magazine layout.
 *
 * A full-width cinematic spotlight for the featured article (photo with a
 * readable scrim, text overlaid), followed by a three-column numbered index
 * for the rest. Deliberately different from the tour grid and the destination
 * editorial further up the page, so each home section has its own rhythm.
 */
export function GuidesSection({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const featured = getFeaturedArticle(locale);
  const rest = getNonFeaturedArticles(locale).slice(0, 3);

  if (!featured) return null;

  const featuredHref = localizePath(
    locale,
    `/cam-nang-du-lich/${featured.slug}`,
  );

  return (
    <Section tone="muted" spacing="loose">
      <Container>
        <Reveal className="intro-centered">
          <p className="eyebrow-pill">
            <span aria-hidden="true" />
            {m.home.guides.eyebrow}
          </p>
          <h2>
            <HeadingAccent
              text={m.home.guides.title}
              phrase={locale === "en" ? "you set off" : "khi lên đường"}
            />
          </h2>
          <p>{m.home.guides.description}</p>
          <div className="intro-cta">
            <ButtonLink
              href={localizePath(locale, ROUTES.guides)}
              variant="secondary"
              className="group"
            >
              {m.home.guides.cta}
              <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal className="mt-10" variant="zoom">
          <Link
            href={featuredHref}
            className="group relative block overflow-hidden rounded-3xl shadow-card transition-[box-shadow,transform] duration-300 ease-out hover:-translate-y-1 hover:shadow-lifted"
          >
            <AssetImage
              image={featured.cover}
              altFallback={featured.title}
              sizes="(max-width: 768px) 100vw, 80vw"
              className="guide-zoom aspect-[16/11] w-full sm:aspect-[21/9]"
              parallax
            />
            <span aria-hidden="true" className="guide-spotlight-scrim" />
            <div className="absolute inset-0 flex flex-col justify-end gap-3 p-6 sm:gap-4 sm:p-10">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.6875rem] font-bold uppercase tracking-[0.14em]">
                <span className="rounded-full bg-white/95 px-3 py-1.5 text-primary-strong">
                  {m.guides.featuredBadge}
                </span>
                <span className="inline-flex items-center gap-1.5 text-white/85">
                  <time dateTime={featured.publishedAt}>
                    {formatDateLong(featured.publishedAt, locale)}
                  </time>
                  {featured.readingMinutes ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {plural(m.common.readMinutes, featured.readingMinutes)}
                      </span>
                    </>
                  ) : null}
                </span>
              </div>
              <h3 className="max-w-3xl font-display text-2xl font-semibold leading-tight text-white sm:text-4xl">
                {featured.title}
              </h3>
              <p className="max-w-2xl text-sm leading-relaxed text-white/80 line-clamp-2 sm:text-base">
                {featured.excerpt}
              </p>
              <span className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-white">
                {locale === "en" ? "Read the article" : "Đọc bài viết"}
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        </Reveal>

        <div className="mt-10">
          <Reveal className="flex items-center gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-strong">
              {m.home.guides.otherArticles}
            </p>
            <span
              aria-hidden="true"
              className="brand-gradient h-0.5 flex-1 rounded-full opacity-60"
            />
          </Reveal>
          <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((article, index) => (
              <Reveal
                as="li"
                key={article.slug}
                delay={(index % 3) as 0 | 1 | 2}
                className="flex"
              >
                <Link
                  href={localizePath(
                    locale,
                    `/cam-nang-du-lich/${article.slug}`,
                  )}
                  className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition-[box-shadow,transform,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-brand-200 hover:shadow-card"
                >
                  <div className="relative">
                    <AssetImage
                      image={article.cover}
                      altFallback={article.title}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      variant="plain"
                      className="guide-zoom aspect-[16/9] w-full"
                    />
                    <span
                      aria-hidden="true"
                      className="guide-index-num absolute -bottom-5 left-4 select-none text-6xl font-semibold"
                    >
                      0{index + 1}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2.5 p-5 pt-8">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-foreground-subtle">
                      <time dateTime={article.publishedAt}>
                        {formatDateLong(article.publishedAt, locale)}
                      </time>
                      {article.readingMinutes ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {plural(
                              m.common.readMinutesShort,
                              article.readingMinutes,
                            )}
                          </span>
                        </>
                      ) : null}
                    </p>
                    <h3 className="font-display text-xl font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-primary-strong">
                      {article.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-foreground-muted line-clamp-2">
                      {article.excerpt}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-[0.8125rem] font-bold text-primary-strong">
                      {locale === "en" ? "Read more" : "Đọc tiếp"}
                      <span
                        aria-hidden="true"
                        className="transition-transform duration-200 group-hover:translate-x-1"
                      >
                        ↗
                      </span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}

import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/button";
import { HeadingAccent } from "@/components/ui/heading-accent";
import { Container, Section } from "@/components/ui/layout";
import { RevealGroup } from "@/components/ui/reveal";
import { SectionEyebrow } from "@/components/ui/section-eyebrow";
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";
import type { LandingSections } from "@/domain/landing";
import { landingSections } from "@/server/cms/store";
import { parseYouTubeUrl } from "@/lib/youtube";
import {
  CustomerVideoCarousel,
  type CustomerVideo,
} from "./customer-video-carousel";
import { CustomerSectionMotion } from "./customer-section-motion";

type CustomerSection = LandingSections["customers"];
type CustomerLogo = CustomerSection["logos"][number];

/**
 * One logo row. The first copy is the real, interactive list; every duplicate
 * is aria-hidden and contains no link, so keyboard users never tab through the
 * same logo several times. Two copies (or more for a short list) keep the -50%
 * loop seamless at every viewport width.
 */
function LogoMarqueeRow({
  logos,
  locale,
  label,
  direction,
}: {
  logos: readonly CustomerLogo[];
  locale: Locale;
  label: string;
  direction: "forward" | "reverse";
}) {
  const staticRail = logos.length < 2;
  const copies = staticRail
    ? 1
    : (() => {
        const needed = Math.max(2, Math.ceil(12 / logos.length));
        return needed % 2 === 0 ? needed : needed + 1;
      })();

  return (
    <div className="stt-customers-logo-row" data-direction={direction}>
      <div
        className="stt-customers-logo-track"
        data-static={staticRail ? "true" : undefined}
      >
        {Array.from({ length: copies }, (_, copy) => (
          <ul
            key={copy}
            className="stt-customers-logo-set"
            aria-hidden={copy > 0 ? "true" : undefined}
            aria-label={copy === 0 ? label : undefined}
          >
            {logos.map((logo, index) => {
              const duplicate = copy > 0;
              const href = logo.href?.trim();
              const image = (
                // Local logo files only: no third-party requests.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo.image.src}
                  alt={duplicate ? "" : logo.image.alt || logo.name}
                  loading="lazy"
                  decoding="async"
                />
              );
              return (
                <li
                  key={`${copy}-${logo.id}-${index}`}
                  className="stt-customers-logo"
                  aria-hidden={duplicate ? "true" : undefined}
                  data-duplicate={duplicate ? "true" : undefined}
                >
                  {!duplicate && href ? (
                    href.startsWith("/") ? (
                      <Link href={localizePath(locale, href)} title={logo.name}>
                        {image}
                      </Link>
                    ) : (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer noopener"
                        title={logo.name}
                      >
                        {image}
                      </a>
                    )
                  ) : (
                    <span title={duplicate ? undefined : logo.name}>{image}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    </div>
  );
}

/** Two counter-moving rows, alternating the CMS order between them. */
function LogoRail({
  logos,
  locale,
  label,
}: {
  logos: readonly CustomerLogo[];
  locale: Locale;
  label: string;
}) {
  const rows =
    logos.length < 2
      ? [logos]
      : [
          logos.filter((_, index) => index % 2 === 0),
          logos.filter((_, index) => index % 2 === 1),
        ];

  return (
    <div className="stt-customers-logo-rail" role="group" aria-label={label}>
      {rows.map((row, index) => (
        <LogoMarqueeRow
          key={index}
          logos={row}
          locale={locale}
          label={label}
          direction={index === 0 ? "forward" : "reverse"}
        />
      ))}
    </div>
  );
}

/**
 * Customer proof: one partner rail followed by a real-video coverflow.
 *
 * CMS order, visibility and VI/EN copy are preserved. The section only renders
 * when the owner enabled it and has at least one visible logo or playable
 * video; it never invents ratings, quotes or customer names.
 */
export function CustomerStoriesSection({
  section,
  locale,
}: {
  section: CustomerSection;
  locale: Locale;
}) {
  const m = getMessages(locale);
  const en = locale === "en";
  const text = (vi: string, english: string) => (en ? english || vi : vi);

  const logos = (section.logos ?? []).filter(
    (logo) => logo.visible && logo.image?.src,
  );
  const videos: CustomerVideo[] = (section.videos ?? [])
    .filter((video) => video.visible && parseYouTubeUrl(video.youtubeUrl))
    .map((video) => ({
      id: video.id,
      title: text(video.title, video.titleEn),
      customer: text(video.customer, video.customerEn),
      youtubeUrl: video.youtubeUrl,
      cover: video.cover,
    }));

  const showLogos = section.showLogos && logos.length > 0;
  const showVideos = section.showVideos && videos.length > 0;
  if (!showLogos && !showVideos) return null;

  const title = text(section.title, section.titleEn);
  const phrase = en
    ? ["stories", "journey", "customers"].find((value) => title.includes(value)) ?? ""
    : ["của chúng tôi", "hành trình", "khách hàng"].find((value) =>
        title.includes(value),
      ) ?? "";
  const ctaHref = section.ctaHref?.trim();
  const ctaLabel = text(section.ctaLabel, section.ctaLabelEn);
  const labels = {
    play: m.home.customers.play,
    close: m.home.customers.close,
    fallbackTitle: m.home.customers.fallbackTitle,
    previous: m.home.customers.previous,
    next: m.home.customers.next,
    center: m.home.customers.center,
    dialog: m.home.customers.dialog,
  };
  const logoLabel =
    text(section.logosTitle, section.logosTitleEn) ||
    (en ? "Customer logos" : "Logo khách hàng");
  const eyebrow =
    text(section.eyebrow, section.eyebrowEn) ||
    (en ? "Customer stories" : "Câu chuyện khách hàng");

  return (
    <Section
      id="khach-hang"
      tone="default"
      spacing="loose"
      className="stt-customers"
    >
      <CustomerSectionMotion />
      <Container>
        <RevealGroup className="intro-centered">
          <SectionEyebrow className="eyebrow-pill">
            {eyebrow}
          </SectionEyebrow>
          <h2 id="stt-customers-title">
            <HeadingAccent text={title} phrase={phrase} />
          </h2>
          {section.body ? (
            <p className="stt-customers-lead">
              {text(section.body, section.bodyEn)}
            </p>
          ) : null}
          {ctaHref && ctaLabel ? (
            <div className="intro-cta">
              <ButtonLink
                href={
                  ctaHref.startsWith("/")
                    ? localizePath(locale, ctaHref)
                    : ctaHref
                }
                external={!ctaHref.startsWith("/")}
                variant="secondary"
                className="group"
              >
                {ctaLabel}
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </ButtonLink>
            </div>
          ) : null}
        </RevealGroup>
      </Container>

      {showVideos ? (
        <div className="stt-customers-video-block">
          <Container className="stt-customers-carousel-wrap">
            <CustomerVideoCarousel
              key={videos.map((video) => video.id).join("|")}
              videos={videos}
              labels={labels}
            />
          </Container>
        </div>
      ) : null}

      {showLogos ? (
        <div className="stt-customers-logo-block">
          <LogoRail logos={logos} locale={locale} label={logoLabel} />
        </div>
      ) : null}
    </Section>
  );
}

/** Public entry point for the home page. */
export function CustomerStories({ locale }: { locale: Locale }) {
  let section: CustomerSection;
  try {
    section = landingSections().customers;
  } catch {
    return null;
  }
  if (!section?.enabled) return null;
  return <CustomerStoriesSection section={section} locale={locale} />;
}

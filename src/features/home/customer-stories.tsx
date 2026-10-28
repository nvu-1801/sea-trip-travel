import Link from "next/link";
import { Container } from "@/components/ui/layout";
import type { Locale } from "@/i18n/config";
import { plural } from "@/i18n/messages";
import { localizePath } from "@/i18n/routing";
import { getMessages } from "@/i18n/server";
import { landingSections } from "@/server/cms/store";
import { parseYouTubeUrl } from "@/lib/youtube";
import { CustomerVideoGrid } from "./customer-video-grid";

/**
 * Customer proof: partner logos + real traveller videos.
 *
 * The section is intentionally owner-driven. It renders nothing until the
 * admin enables it and adds at least one visible logo/video, so the site never
 * shows invented customer names, ratings or awards.
 */
export function CustomerStories({ locale }: { locale: Locale }) {
  let section: ReturnType<typeof landingSections>["customers"];
  try {
    section = landingSections().customers;
  } catch {
    return null;
  }
  if (!section?.enabled) return null;

  const m = getMessages(locale);
  const en = locale === "en";
  const text = (vi: string, english: string) => (en ? english || vi : vi);
  const logos = (section.logos ?? []).filter(
    (logo) => logo.visible && logo.image?.src,
  );
  const videos = (section.videos ?? [])
    .filter((video) => video.visible && parseYouTubeUrl(video.youtubeUrl))
    .map((video) => ({
      id: video.id,
      title: text(video.title, video.titleEn),
      body: text(video.body, video.bodyEn),
      customer: text(video.customer, video.customerEn),
      youtubeUrl: video.youtubeUrl,
      cover: video.cover,
    }));
  const showLogos = section.showLogos && logos.length > 0;
  const showVideos = section.showVideos && videos.length > 0;
  if (!showLogos && !showVideos) return null;

  const ctaHref = section.ctaHref?.trim();
  const internal = Boolean(ctaHref?.startsWith("/"));
  const ctaLabel = text(section.ctaLabel, section.ctaLabelEn);
  const labels = {
    play: m.home.customers.play,
    watch: m.home.customers.watch,
    story: m.home.customers.story,
    fallbackTitle: m.home.customers.fallbackTitle,
  };

  return (
    <section
      className="stt-customers"
      id="khach-hang"
      aria-labelledby="stt-customers-title"
    >
      <Container>
        <header className="stt-customers-head">
          <div className="stt-customers-heading">
            {section.eyebrow ? (
              <p className="stt-customers-eyebrow">
                {text(section.eyebrow, section.eyebrowEn)}
              </p>
            ) : null}
            <h2 id="stt-customers-title">
              {text(section.title, section.titleEn)}
            </h2>
          </div>
          <div className="stt-customers-intro">
            {section.body ? (
              <p>{text(section.body, section.bodyEn)}</p>
            ) : null}
            {ctaHref && ctaLabel ? (
              internal ? (
                <Link
                  href={localizePath(locale, ctaHref)}
                  className="stt-customers-cta"
                >
                  {ctaLabel} <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <a
                  href={ctaHref}
                  className="stt-customers-cta"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {ctaLabel} <span aria-hidden="true">↗</span>
                </a>
              )
            ) : null}
          </div>
        </header>

        {showLogos ? (
          <div className="stt-customers-block">
            <div className="stt-customers-block-head">
              <h3>{text(section.logosTitle, section.logosTitleEn)}</h3>
              <span>{plural(m.home.customers.partners, logos.length)}</span>
            </div>
            <ul className="stt-customers-logos">
              {logos.map((logo) => {
                const body = (
                  <>
                    {/* Local logo files only: no third-party requests. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logo.image.src}
                      alt={logo.image.alt || logo.name}
                      loading="lazy"
                      decoding="async"
                    />
                    <span>{logo.name}</span>
                  </>
                );
                const href = logo.href?.trim();
                return (
                  <li key={logo.id} data-customer-card>
                    {href ? (
                      href.startsWith("/") ? (
                        <Link href={localizePath(locale, href)}>{body}</Link>
                      ) : (
                        <a href={href} target="_blank" rel="noreferrer noopener">
                          {body}
                        </a>
                      )
                    ) : (
                      <span className="stt-customers-logo-static">{body}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {showVideos ? (
          <div className="stt-customers-block">
            <div className="stt-customers-block-head">
              <h3>{text(section.videosTitle, section.videosTitleEn)}</h3>
              <span>{plural(m.home.customers.stories, videos.length)}</span>
            </div>
            <CustomerVideoGrid videos={videos} labels={labels} />
          </div>
        ) : null}
      </Container>
    </section>
  );
}

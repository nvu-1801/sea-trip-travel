import { HeadingAccent } from "@/components/ui/heading-accent";
import { Container, Section } from "@/components/ui/layout";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { AssetImage } from "@/components/ui/asset-image";
import { ArrowRightIcon } from "@/components/ui/icons";
import type { Locale } from "@/i18n/config";
import { landingSections } from "@/server/cms/store";
import { getMessages } from "@/i18n/server";
import { localizePath } from "@/i18n/routing";

/**
 * Brand values.
 *
 * Every claim here is about *how we work* — something a traveller can verify by
 * talking to us. There are deliberately no invented customer counts, ratings,
 * awards or partner logos.
 */
export function ValuesSection({ locale }: { locale: Locale }) {
  const m = getMessages(locale);
  const en = locale === "en";
  let visual = {
    src: "/images/hero/island-panorama.webp" as string,
    alt:
      locale === "en"
        ? "Panoramic view of Quy Nhon bay islands"
        : "Toàn cảnh vịnh biển và đảo Quy Nhơn",
    badge:
      locale === "en"
        ? "Handpicked, unhurried journeys"
        : "Đi chậm, chọn kỹ, nhớ lâu",
  };
  try {
    const v = landingSections().values;
    visual = {
      src: v.photoSrc || visual.src,
      alt:
        (locale === "en" ? v.photoAltEn || v.photoAlt : v.photoAlt) ||
        visual.alt,
      badge: (locale === "en" ? v.badgeEn || v.badge : v.badge) || visual.badge,
    };
  } catch {
    // fallback seed
  }

  let principles = m.home.values.principles;
  try {
    const saved = landingSections().values.principles;
    if (saved.length > 0) {
      principles = saved.map((p) => ({
        title: en ? p.titleEn || p.title : p.title,
        body: en ? p.bodyEn || p.body : p.body,
      }));
    }
  } catch {
    // giữ nguyên nội dung messages khi CMS chưa có
  }

  return (
    <Section
      tone="sunken"
      spacing="loose"
      className="journal-values values-premium"
    >
      <Container>
        <Reveal className="intro-centered">
          <p className="eyebrow-pill">
            <span aria-hidden="true" />
            {m.home.values.eyebrow}
          </p>
          <h2>
            <HeadingAccent
              text={m.home.values.title}
              phrase={locale === "en" ? "an experience" : "trải nghiệm"}
            />
          </h2>
          <p>{m.home.values.description}</p>
        </Reveal>
        <div className="values-grid">
          <div className="values-visual">
            <Reveal>
              <div className="values-photo-wrap">
                <AssetImage
                  image={{ src: visual.src, alt: visual.alt }}
                  sizes="(max-width: 1024px) 90vw, 32vw"
                  className="values-photo"
                />
                <div className="values-photo-glow" aria-hidden="true" />
                <div className="values-float values-float-top">
                  <span className="values-float-badge">SEA TRIP</span>
                  <strong>{visual.badge}</strong>
                </div>
                <div className="values-float values-float-bottom">
                  <p className="values-float-label">
                    {m.home.values.cardLabel}
                  </p>
                  <p className="values-float-tagline">{m.site.tagline}</p>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="values-copy">
            <ol className="values-timeline">
              {principles.map((principle, index) => (
                <Reveal
                  as="li"
                  key={principle.title}
                  delay={index}
                  className="values-item"
                >
                  <span aria-hidden="true" className="values-num">
                    {index + 1}
                  </span>
                  <div className="values-item-card">
                    <h3>{principle.title}</h3>
                    <p>{principle.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>

            <Reveal>
              <ButtonLink
                href={localizePath(locale, landingSections().links.values.href)}
                className="values-cta group"
              >
                {m.home.values.cta}
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </ButtonLink>
            </Reveal>
          </div>
        </div>
      </Container>
    </Section>
  );
}

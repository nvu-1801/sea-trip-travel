import { ROUTES } from "@/config/navigation";
import { Container, Section, SectionHeading } from "@/components/ui/layout";
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
  let visual = {
    src: "/images/hero/sea-kayaking.webp" as string,
    alt: locale === "en" ? "Illustration of kayaking on the sea" : "Ảnh minh hoạ chèo thuyền trên biển",
    badge: locale === "en" ? "Handpicked, unhurried journeys" : "Đi chậm, chọn kỹ, nhớ lâu",
  };
  try {
    const v = landingSections().values;
    visual = {
      src: v.photoSrc || visual.src,
      alt: (locale === "en" ? v.photoAltEn || v.photoAlt : v.photoAlt) || visual.alt,
      badge: (locale === "en" ? v.badgeEn || v.badge : v.badge) || visual.badge,
    };
  } catch {
    // fallback seed
  }

  return (
    <Section tone="sunken" spacing="loose" className="journal-values values-premium">
      <Container>
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
                  <p className="values-float-label">{m.home.values.cardLabel}</p>
                  <p className="values-float-tagline">{m.site.tagline}</p>
                </div>
              </div>
            </Reveal>
          </div>

          <div className="values-copy">
            <Reveal>
              <SectionHeading
                eyebrow={m.home.values.eyebrow}
                title={m.home.values.title}
                description={m.home.values.description}
              />
            </Reveal>

            <ol className="values-timeline">
              {m.home.values.principles.map((principle, index) => (
                <Reveal as="li" key={principle.title} className="values-item">
                  <span
                    aria-hidden="true"
                    className="values-num"
                  >
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
                href={localizePath(locale, ROUTES.contact)}
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

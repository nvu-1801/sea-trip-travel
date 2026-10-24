import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/ui/layout";
import { Breadcrumbs, type Crumb } from "@/components/layout/breadcrumbs";
import { AssetImage } from "@/components/ui/asset-image";
import { MaskedHeading, type MaskedLine } from "@/components/motion/word-reveal";
import "./page-hero.css";
/**
 * Editorial page hero shared by the tour categories, the guides index and the
 * contact page.
 *
 * One component so the three pages keep the same rhythm: breadcrumb, pill
 * eyebrow, masked serif headline, lead, actions, a three-cell fact strip and a
 * framed photograph with a floating glass card. Everything below the fold keeps
 * using the existing `Reveal` primitives; the only motion owned here is the
 * one-shot entrance and the scroll-linked parallax/drift, both CSS-only and both
 * disabled for reduced motion and print.
 */

export type PageHeroMeta = {
  label: string;
  value: ReactNode;
};

export type PageHeroMedia = {
  src?: string;
  alt: string;
  /** Focal point override forwarded to `AssetImage`. */
  positionX?: number;
  positionY?: number;
  sizes?: string;
};

const ENTRANCE_DELAYS = [0, 70, 150, 220, 280, 330] as const;

function entrance(delay: number): CSSProperties {
  return { animationDelay: `${delay}ms` };
}

export function PageHero({
  crumbs,
  crumbsLabel,
  eyebrow,
  titleLines,
  description,
  actions,
  meta,
  badges,
  media,
  floating,
  scrollCue,
  notice,
  tone = "default",
  className,
}: {
  crumbs: readonly Crumb[];
  crumbsLabel: string;
  eyebrow: ReactNode;
  titleLines: MaskedLine[];
  description: ReactNode;
  actions?: ReactNode;
  meta?: readonly PageHeroMeta[];
  badges?: ReactNode;
  media: PageHeroMedia;
  floating?: ReactNode;
  scrollCue?: string;
  /** Optional banner (translation notice) pinned under the fixed header. */
  notice?: ReactNode;
  tone?: "default" | "warm";
  className?: string;
}) {
  return (
    <section className={cn("stt-page-hero", className)} data-tone={tone}>
      <div className="stt-page-hero-atmosphere" aria-hidden="true" />

      <div className="stt-page-hero-inner">
        {notice}

        <Breadcrumbs
          items={crumbs}
          ariaLabel={crumbsLabel}
          variant="hero"
        />

        <Container className="relative z-10">
          <div className="stt-page-hero-grid">
            <div className="stt-page-hero-copy">
              <p className="eyebrow-pill" data-entrance style={entrance(ENTRANCE_DELAYS[0])}>
                {eyebrow}
              </p>

              <div data-entrance style={entrance(ENTRANCE_DELAYS[1])}>
                <MaskedHeading
                  as="h1"
                  lines={titleLines}
                  className="stt-page-hero-title"
                />
              </div>

              <p
                className="stt-page-hero-lead"
                data-entrance
                style={entrance(ENTRANCE_DELAYS[2])}
              >
                {description}
              </p>

              {actions ? (
                <div
                  className="stt-page-hero-actions"
                  data-entrance
                  style={entrance(ENTRANCE_DELAYS[3])}
                >
                  {actions}
                </div>
              ) : null}

              {meta && meta.length > 0 ? (
                <dl
                  className="stt-page-hero-meta"
                  data-entrance
                  style={entrance(ENTRANCE_DELAYS[4])}
                >
                  {meta.map((item) => (
                    <div key={item.label} className="stt-page-hero-meta-item">
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {badges ? (
                <div
                  className="stt-page-hero-badges"
                  data-entrance
                  style={entrance(ENTRANCE_DELAYS[5])}
                >
                  {badges}
                </div>
              ) : null}

              {scrollCue ? (
                <p className="stt-page-hero-cue">
                  <span className="stt-page-hero-cue-line" aria-hidden="true" />
                  {scrollCue}
                </p>
              ) : null}
            </div>

            <div className="stt-page-hero-stage">
              <span className="stt-page-hero-halo" aria-hidden="true" />
              <svg
                className="stt-page-hero-arc"
                viewBox="0 0 520 520"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="260"
                  cy="260"
                  r="250"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeOpacity="0.7"
                  strokeDasharray="2 9"
                />
                <circle
                  cx="260"
                  cy="260"
                  r="196"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeOpacity="0.4"
                />
              </svg>

              <div className="stt-page-hero-frame">
                <span className="stt-page-hero-frame-line" aria-hidden="true" />
                <div className="stt-page-hero-media-clip">
                  <AssetImage
                    image={{
                      src: media.src,
                      alt: media.alt,
                      positionX: media.positionX,
                      positionY: media.positionY,
                    }}
                    altFallback={media.alt}
                    sizes={media.sizes ?? "(max-width: 1023px) 100vw, 46vw"}
                    priority
                    parallax
                    unveil
                    className="stt-page-hero-media"
                  />
                </div>

                {floating ? (
                  <div className="stt-page-hero-float" data-depth="1">
                    {floating}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Container>
      </div>

      <div className="stt-page-hero-fade" aria-hidden="true" />
    </section>
  );
}

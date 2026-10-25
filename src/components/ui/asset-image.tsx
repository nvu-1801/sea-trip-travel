import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The single image component used site-wide.
 *
 * When a record has no `src` yet, this renders a deterministic brand-gradient
 * placeholder instead of a stock photo we do not have the rights to. The
 * placeholder is a stylised landscape — layered gradient, sun, horizon and two
 * wave silhouettes — so a page built entirely from placeholders still reads as
 * a designed travel site rather than a grid of grey boxes.
 *
 * Colours and composition are derived from the image's alt text, so a grid is
 * visually varied but stable across renders and between server and client.
 * Supplying a real photo later is a one-line data change (`image.src`), with no
 * component changes.
 */

type Palette = readonly [string, string, string];

const PALETTES: readonly Palette[] = [
  ["#ff0366", "#ff5c99", "#ffbc0e"],
  ["#e0005a", "#ff7c2c", "#ffd166"],
  ["#ff0366", "#ff7c2c", "#ffbc0e"],
  ["#c4004e", "#ff0366", "#ff9f1c"],
  ["#9c003f", "#ff5c99", "#ffd166"],
  ["#ff2d7a", "#ff9f1c", "#ffe0b0"],
];

function hashOf(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export type AssetImageInput = {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  positionX?: number;
  positionY?: number;
};

type AssetImageProps = {
  image?: AssetImageInput;
  /** Fallback alt when no image object is supplied at all. */
  altFallback?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  /** Show the small "Ảnh minh hoạ" marker. Off inside dense grids. */
  markPlaceholder?: boolean;
  /**
   * `scene` — full stylised landscape (hero, cards, article covers).
   * `plain` — flat brand gradient only, for thumbnails and small tiles.
   */
  variant?: "scene" | "plain";
  /**
   * Drift the image slightly as it crosses the viewport (CSS scroll-driven
   * animation, no JS). Only for images inside an `overflow-hidden` container
   * that has its own border radius — the image scales up, so the PARENT must
   * clip it.
   */
  parallax?: boolean;
  /**
   * Curtain reveal on scroll (CSS scroll-driven, transform only). The wrapper
   * must clip, which `AssetImage` already does; set `--unveil-color` through
   * `className` when the surrounding section is not the default surface.
   */
  unveil?: boolean;
};

export function AssetImage({
  image,
  altFallback = "",
  className,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
  fit = "cover",
  markPlaceholder = false,
  variant = "scene",
  parallax = false,
  unveil = false,
}: AssetImageProps) {
  const alt = image?.alt ?? altFallback;
  const src = image?.src;

  if (src) {
    return (
      <div
        data-parallax={parallax ? "" : undefined}
        data-unveil={unveil ? "" : undefined}
        className={cn(
          "relative isolate overflow-hidden bg-surface-sunken",
          className,
        )}
      >
        <Image
          src={src}
          alt={alt}
          fill
          quality={90}
          sizes={sizes}
          priority={priority}
          style={
            image?.positionX !== undefined || image?.positionY !== undefined
              ? {
                  objectPosition: `${image?.positionX ?? 50}% ${image?.positionY ?? 50}%`,
                }
              : undefined
          }
          className={fit === "contain" ? "object-contain" : "object-cover"}
        />
      </div>
    );
  }

  const seed = hashOf(alt);
  const [from, mid, to] = PALETTES[seed % PALETTES.length];
  const angle = 150 + (seed % 50);
  const sunX = 28 + (seed % 45);
  const horizon = 54 + (seed % 14);

  return (
    <div
      data-parallax={parallax ? "" : undefined}
      data-unveil={unveil ? "" : undefined}
      className={cn("relative isolate overflow-hidden", className)}
      role="img"
      aria-label={alt}
    >
      {/* Base sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${angle}deg, ${from} 0%, ${mid} 58%, ${to} 100%)`,
        }}
      />

      {variant === "scene" ? (
        <>
          {/* Sun glow */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(38% 30% at ${sunX}% ${
                horizon - 22
              }%, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.16) 45%, rgba(255,255,255,0) 72%)`,
            }}
          />

          {/* Horizon haze */}
          <div
            className="absolute inset-x-0"
            style={{
              top: `${horizon - 8}%`,
              height: "18%",
              backgroundImage:
                "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.28) 55%, rgba(255,255,255,0.05) 100%)",
            }}
          />

          {/* Layered wave silhouettes — reads as sea/hills without claiming to
              depict the actual destination. */}
          <svg
            className="absolute inset-x-0 bottom-0 h-[46%] w-full"
            viewBox="0 0 400 120"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 62 C 58 34 104 82 168 60 C 232 38 268 78 400 46 L400 120 L0 120 Z"
              fill="rgba(255,255,255,0.20)"
            />
            <path
              d="M0 84 C 70 62 118 100 186 82 C 250 65 300 96 400 72 L400 120 L0 120 Z"
              fill="rgba(255,255,255,0.30)"
            />
            <path
              d="M0 102 C 80 88 140 112 214 100 C 288 88 330 110 400 98 L400 120 L0 120 Z"
              fill="rgba(255,255,255,0.42)"
            />
          </svg>

          {/* Light streaks — a soft "lens" feel, very low contrast. */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(115deg, rgba(255,255,255,0.28) 0px, rgba(255,255,255,0.28) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 44px)",
            }}
          />
        </>
      ) : (
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(120% 90% at 20% 10%, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 60%)",
          }}
        />
      )}

      {/* Outer vignette keeps overlaid text readable. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(122,0,49,0.10) 0%, rgba(122,0,49,0) 45%, rgba(122,0,49,0.14) 100%)",
        }}
      />

      {markPlaceholder ? (
        <span className="absolute bottom-2 left-2 rounded-full bg-brand-900/35 px-2 py-0.5 text-[0.6875rem] font-medium text-white/95 backdrop-blur-sm">
          Ảnh minh hoạ
        </span>
      ) : null}
    </div>
  );
}

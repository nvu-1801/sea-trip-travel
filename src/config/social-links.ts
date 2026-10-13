import { siteConfig } from "./site";

/**
 * Resolved social / messaging links.
 *
 * `social.*` values are owner-supplied and currently empty placeholders. Rather
 * than hiding the button, we fall back to the platform entry point and expose
 * `isPlaceholder` so the UI can be honest about what still needs configuring —
 * see docs/CONTENT-TODO.md nhóm 🟠.
 *
 * Facebook and Zalo are the two channels Vietnamese travel customers actually
 * use, so they are always present (with a fallback). The rest only appear once
 * a real URL is configured.
 */

const digits = (value: string) => value.replace(/\D/g, "");

export type SocialLink = {
  key: "facebook" | "zalo" | "instagram" | "tiktok" | "youtube";
  label: string;
  url: string;
  /** True when the owner has not supplied a URL yet. */
  isPlaceholder: boolean;
};

function resolve(
  key: SocialLink["key"],
  label: string,
  value: string,
  fallback: string,
): SocialLink {
  const trimmed = value.trim();
  return {
    key,
    label,
    url: trimmed.length > 0 ? trimmed : fallback,
    isPlaceholder: trimmed.length === 0,
  };
}

export const facebookLink = resolve(
  "facebook",
  "Facebook",
  siteConfig.social.facebook,
  "https://www.facebook.com/",
);

export const zaloLink = resolve(
  "zalo",
  "Zalo",
  siteConfig.social.zalo,
  `https://zalo.me/${digits(siteConfig.contact.hotline)}`,
);

const instagramLink = resolve(
  "instagram",
  "Instagram",
  siteConfig.social.instagram,
  "https://www.instagram.com/",
);
const tiktokLink = resolve("tiktok", "TikTok", siteConfig.social.tiktok, "https://www.tiktok.com/");
const youtubeLink = resolve(
  "youtube",
  "YouTube",
  siteConfig.social.youtube,
  "https://www.youtube.com/",
);

/** Always rendered: these two have a meaningful fallback URL. */
export const primarySocialLinks: readonly SocialLink[] = [facebookLink, zaloLink];

/** Rendered only once the owner supplies a real URL. */
export const secondarySocialLinks: readonly SocialLink[] = [
  instagramLink,
  tiktokLink,
  youtubeLink,
].filter((link) => !link.isPlaceholder);

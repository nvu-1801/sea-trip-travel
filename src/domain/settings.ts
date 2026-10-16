import { z } from "zod";

/**
 * Admin-editable site settings (home hero, contact block, social links and the
 * home-page feature selection).
 *
 * Everything is optional: the value stored here *overrides* the built-in
 * defaults from `config/site.ts` and `messages/*.json`. An empty object means
 * "use the shipped defaults", which keeps the landing page correct before the
 * owner ever opens the admin.
 */

export const heroSettingsSchema = z.object({
  badge: z.string().min(1).optional(),
  titleLine1: z.string().min(1).optional(),
  titleLine2: z.string().min(1).optional(),
  lead: z.string().min(1).optional(),
  bodyA: z.string().min(1).optional(),
  bodyB: z.string().min(1).optional(),
  ctaTours: z.string().min(1).optional(),
  ctaConsult: z.string().min(1).optional(),
  collageAltMain: z.string().min(1).optional(),
  collageAltSecondary: z.string().min(1).optional(),
  focusBadge: z.string().min(1).optional(),
  focusName: z.string().min(1).optional(),
  /** Optional real photography for the main collage tile. */
  imageSrc: z.string().startsWith("/").optional(),
  secondaryImageSrc: z.string().startsWith("/").optional(),
});
export type HeroSettings = z.infer<typeof heroSettingsSchema>;

export const contactSettingsSchema = z.object({
  hotline: z.string().min(1).optional(),
  hotlineHref: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  workingHours: z.string().min(1).optional(),
});
export type ContactSettings = z.infer<typeof contactSettingsSchema>;

export const socialSettingsSchema = z.object({
  facebook: z.string().min(1).optional(),
  zalo: z.string().min(1).optional(),
  instagram: z.string().min(1).optional(),
  tiktok: z.string().min(1).optional(),
  youtube: z.string().min(1).optional(),
});
export type SocialSettings = z.infer<typeof socialSettingsSchema>;

export const homeSettingsSchema = z.object({
  /** Pinned tours, in display order. Empty ⇒ fall back to the featured query. */
  featuredTourSlugs: z.array(z.string().min(1)).max(12).optional(),
  featuredArticleSlug: z.string().min(1).optional(),
});
export type HomeSettings = z.infer<typeof homeSettingsSchema>;

export const siteSettingsSchema = z.object({
  hero: heroSettingsSchema.optional(),
  contact: contactSettingsSchema.optional(),
  social: socialSettingsSchema.optional(),
  home: homeSettingsSchema.optional(),
});
export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const SITE_SETTING_KEYS = ["hero", "contact", "social", "home"] as const;
export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number];

export const siteSettingKeySchema = z.enum(SITE_SETTING_KEYS);

/** Validate one section's payload before it is written to the database. */
export function parseSettingSection(key: SiteSettingKey, value: unknown): unknown {
  switch (key) {
    case "hero":
      return heroSettingsSchema.parse(value);
    case "contact":
      return contactSettingsSchema.parse(value);
    case "social":
      return socialSettingsSchema.parse(value);
    case "home":
      return homeSettingsSchema.parse(value);
  }
}

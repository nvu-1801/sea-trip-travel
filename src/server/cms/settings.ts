import { z } from "zod";
import vi from "@/messages/vi.json";
import en from "@/messages/en.json";
import { siteConfig } from "@/config/site";
import { HOME_SEO } from "@/content/seo";
import {
  primarySocialLinks,
  secondarySocialLinks,
} from "@/config/social-links";

const link = z
  .string()
  .refine(
    (value) =>
      !/[\\\x00-\x20]/.test(value) &&
      (/^\/(?!\/)/.test(value) ||
        z.url().startsWith("https://").safeParse(value).success),
    "Dùng đường dẫn nội bộ hoặc HTTPS",
  );
export const settingsSchema = z.object({
  id: z.literal("site"),
  name: z.string().min(1).max(100),
  contact: z.object({
    hotline: z.string().min(6),
    hotlineHref: z.string().regex(/^tel:\+?[\d]+$/),
    email: z.email(),
    address: z.string().min(1),
    workingHours: z.string().min(1),
    workingHoursEn: z.string().optional(),
  }),
  footerLinks: z
    .array(
      z.object({
        label: z.string().min(1),
        labelEn: z.string().optional(),
        href: link,
      }),
    )
    .max(20),
  socialLinks: z
    .array(
      z.object({
        label: z.string().min(1),
        href: z.url().startsWith("https://"),
      }),
    )
    .max(10),
  motion: z.boolean(),
  /**
   * Home-page metadata. Defaults live in `content/seo.ts`; the owner can edit
   * them in Website & footer → SEO and publish without a rebuild.
   */
  seo: z
    .object({
      homeTitle: z.string().min(1).max(90),
      homeDescription: z.string().min(1).max(220),
      homeTitleEn: z.string().min(1).max(90),
      homeDescriptionEn: z.string().min(1).max(220),
    })
    .default({
      homeTitle: HOME_SEO.vi.title,
      homeDescription: HOME_SEO.vi.description,
      homeTitleEn: HOME_SEO.en.title,
      homeDescriptionEn: HOME_SEO.en.description,
    }),
});
export const defaultSettings = settingsSchema.parse({
  id: "site",
  name: siteConfig.name,
  contact: { ...siteConfig.contact, workingHoursEn: en.site.workingHours },
  footerLinks: [
    {
      label: "Cẩm nang du lịch",
      labelEn: en.nav.guides,
      href: "/cam-nang-du-lich",
    },
    { label: "Liên hệ", labelEn: en.nav.contact, href: "/lien-he" },
    {
      label: "Chính sách bảo mật",
      labelEn: en.nav.privacy,
      href: "/chinh-sach-bao-mat",
    },
  ],
  socialLinks: [...primarySocialLinks, ...secondarySocialLinks].map((item) => ({
    label: item.label,
    href: item.url,
  })),
  motion: true,
  seo: {
    homeTitle: HOME_SEO.vi.title,
    homeDescription: HOME_SEO.vi.description,
    homeTitleEn: HOME_SEO.en.title,
    homeDescriptionEn: HOME_SEO.en.description,
  },
});

// Derive a strict catalog schema from the supplied copy: every text is editable,
// while the object shape and translation keys remain stable.
export function textSchema(value: unknown): z.ZodType {
  if (typeof value === "string") return z.string().max(12000);
  if (Array.isArray(value)) return z.array(textSchema(value[0] ?? "")).max(100);
  if (value && typeof value === "object")
    return z
      .object(
        Object.fromEntries(
          Object.entries(value).map(([key, child]) => [key, textSchema(child)]),
        ),
      )
      .strict();
  throw new Error("Unsupported catalog value");
}
export const messageSeeds = [
  { id: "vi", ...vi },
  { id: "en", ...en },
];
export const messagesSchema = z
  .object({ id: z.enum(["vi", "en"]) })
  .and(textSchema({ id: "vi", ...vi }));

import { z } from "zod";
import vi from "@/messages/vi.json";
import en from "@/messages/en.json";
import { siteConfig } from "@/config/site";
import { primaryNav } from "@/config/navigation";
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
const navLink = z.object({
  labelKey: z
    .enum([
      "home",
      "quyNhonPhuYen",
      "quyNhonOneDay",
      "quyNhonMultiDay",
      "domestic",
      "north",
      "central",
      "south",
      "highlands",
      "guides",
      "contact",
      "privacy",
    ])
    .default("home"),
  label: z.string().trim().min(1).max(80),
  labelEn: z.string().max(80).default(""),
  href: link.refine(
    (value) => value.startsWith("/") && !value.includes(".."),
    "Menu dùng đường dẫn trong website",
  ),
});
const navigationDefaults = primaryNav.map((item) => ({
  ...item,
  label: vi.nav[item.labelKey],
  labelEn: en.nav[item.labelKey],
  children: item.children?.map((child) => ({
    ...child,
    label: vi.nav[child.labelKey],
    labelEn: en.nav[child.labelKey],
  })),
}));
export const settingsSchema = z.object({
  navigation: z
    .array(
      navLink.extend({
        children: z.array(navLink).max(12).optional(),
        descriptionKey: z.enum(["quyNhonPhuYen", "domestic"]).optional(),
      }),
    )
    .max(12)
    .default(navigationDefaults),
  id: z.literal("site"),
  name: z.string().min(1).max(100),
  logoSrc: z.string().startsWith("/").max(300).default("/brand/logo-mark.png"),
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

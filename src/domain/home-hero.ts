import { z } from "zod";

const localLink = z
  .string()
  .max(300)
  .refine(
    (value) =>
      /^\/(?!\/)/.test(value) &&
      !/[\\\x00-\x20]/.test(value) &&
      !value.includes(".."),
    "Dùng đường dẫn trong website, bắt đầu bằng /",
  );
const image = z.object({
  src: z
    .string()
    .min(1)
    .max(300)
    .refine(
      (value) =>
        /^\/(?!\/)/.test(value) &&
        !/[\\\x00-\x20]/.test(value) &&
        !value.includes(".."),
      "Chọn ảnh trong thư viện",
    ),
  alt: z.string().trim().min(1).max(300),
  positionX: z.number().min(0).max(100).default(50),
  positionY: z.number().min(0).max(100).default(50),
});
const copy = z.object({
  badge: z.string().max(100).default(""),
  titleLine1: z.string().max(100).default(""),
  titleLine2: z.string().max(100).default(""),
  description: z.string().max(500).default(""),
  primaryLabel: z.string().max(80).default(""),
  secondaryLabel: z.string().max(80).default(""),
});
const slide = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  image,
  caption: z.string().trim().min(1).max(100),
  captionEn: z.string().trim().min(1).max(100),
  title: z.string().max(100).default(""),
  titleEn: z.string().max(100).default(""),
  description: z.string().max(500).default(""),
  descriptionEn: z.string().max(500).default(""),
});
export const heroSchema = z.object({
  id: z.literal("home"),
  mode: z.enum(["carousel", "collage"]),
  autoplay: z.boolean(),
  intervalSeconds: z.number().int().min(5).max(20),
  primaryHref: localLink,
  secondaryHref: localLink,
  vi: copy,
  en: copy,
  collageMain: image,
  collageSecondary: image,
  slides: z
    .array(slide)
    .min(1)
    .max(8)
    .refine(
      (items) => new Set(items.map((item) => item.id)).size === items.length,
      "Mã slide không được trùng",
    ),
});
export type HeroConfig = z.infer<typeof heroSchema>;
export type HeroSlide = HeroConfig["slides"][number];

export const heroPhotos = [
  {
    src: "/images/hero/sea-kayaking.webp",
    alt: "Chèo SUP trên mặt biển xanh trong, phía dưới là các rạn đá",
    caption: "Chạm vào mùa xanh",
    captionEn: "Into the blue",
  },
  {
    src: "/images/hero/ky-co-user.png",
    alt: "Bãi biển Kỳ Co với nước xanh trong, cầu gỗ và dãy núi ven biển",
    caption: "Hẹn nhau ở Kỳ Co",
    captionEn: "Meet me at Ky Co",
  },
  {
    src: "/images/hero/blue-bay.webp",
    alt: "Vịnh biển xanh với cầu cảng, bờ cát và những hàng cây",
    caption: "Một khoảng trời riêng",
    captionEn: "A little room to breathe",
  },
  {
    src: "/images/hero/island-panorama.webp",
    alt: "Toàn cảnh bán đảo xanh, làng ven biển và thuyền trên vịnh",
    caption: "Theo những cung đường biển",
    captionEn: "Along the coastal roads",
  },
  {
    src: "/images/hero/ghenh-da-dia-user.png",
    alt: "Du khách bên ghềnh đá bazan và làn nước xanh tại Ghềnh Đá Đĩa",
    caption: "Nơi sóng chạm ghềnh đá",
    captionEn: "Where waves meet basalt",
  },
];
export const defaultHero: HeroConfig = heroSchema.parse({
  id: "home",
  mode: "carousel",
  autoplay: true,
  intervalSeconds: 5,
  primaryHref: "/tour-quy-nhon-phu-yen",
  secondaryHref: "/lien-he",
  vi: {},
  en: {},
  collageMain: { ...heroPhotos[3], positionX: 55, positionY: 48 },
  collageSecondary: { ...heroPhotos[0], positionX: 60, positionY: 45 },
  slides: heroPhotos.map((photo, index) => ({
    id: `coast_${index + 1}`,
    image: {
      src: photo.src,
      alt: photo.alt,
      positionX: 50,
      positionY: index === 0 ? 45 : 50,
    },
    caption: photo.caption,
    captionEn: photo.captionEn,
  })),
});

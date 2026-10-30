import type { LandingSections } from "@/domain/landing";

/**
 * Verified demo preset for "Khách hàng & dấu ấn hành trình".
 *
 * The heading, logos and videos below were read from the public section
 * "KHÁCH HÀNG CỦA CHÚNG TÔI" on https://seatriptravel.com/ (captured
 * 2026-10-29). The intro paragraph is an editorial lead for the Studio preview,
 * not a copied customer quote:
 *
 * - 10 partner logos in the gallery. The source renders them as images with an
 *   empty alt and no caption or link, so `name` was read from the logo artwork
 *   itself and `href` stays empty. Nothing about a relationship, quote, rating
 *   or destination was added.
 * - 6 YouTube embeds. Titles come from the player's `title` attribute and were
 *   confirmed through YouTube's public oEmbed endpoint. Covers are the public
 *   YouTube thumbnails for those exact videos.
 * - The source has no per-video description, so `body`/`bodyEn` stay empty and
 *   the card only shows the real title and the partner named in that title.
 *
 * The preset is normally applied only to the Studio form (a draft). A one-time
 * migration may seed it into an empty CMS record when the owner explicitly asks;
 * it never overwrites logos, videos or copy the owner already entered.
 */

export type CustomerStoriesDemoLogo = LandingSections["customers"]["logos"][number];
export type CustomerStoriesDemoVideo = LandingSections["customers"]["videos"][number];

export const CUSTOMER_STORIES_SOURCE = {
  page: "https://seatriptravel.com/",
  heading: "Khách hàng của chúng tôi",
  subheading:
    "Những đơn vị, doanh nghiệp và đoàn khách đã tin chọn SEA TRIP cho hành trình của mình. Mỗi chuyến đi là một câu chuyện được kể lại bằng hình ảnh, video và những chia sẻ chân thành.",
  capturedAt: "2026-10-29",
  logoCount: 10,
  videoCount: 6,
  /** The source gallery has no per-logo text, link, caption or alt. */
  logoNotes:
    "Tên đơn vị đọc từ chính artwork của logo; nguồn không có link, chú thích hay alt.",
  videoNotes:
    "Tiêu đề lấy từ thuộc tính title của iframe và đối chiếu qua YouTube oEmbed; nguồn không có mô tả riêng.",
} as const;

/** Original public URL of every copied logo, keyed by the local file name. */
export const CUSTOMER_STORIES_LOGO_SOURCES: Record<string, string> = {
  "smile-go-travel":
    "https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T081012.752.jpg",
  "fpt-telecom":
    "https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T081005.402.jpg",
  hay: "https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T080947.456.jpg",
  "bi-pecom":
    "https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T080918.888.jpg",
  "vien-phuong":
    "https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T080900.492.jpg",
  vlife:
    "https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T081339.825.jpg",
  "line-technology-vietnam":
    "https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T085317.230.jpg",
  "an-thinh-pharma":
    "https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T085128.652.jpg",
  "duoc-pham-xanh":
    "https://seatriptravel.com/wp-content/uploads/2026/01/Thiet-ke-chua-co-ten-2026-01-09T085104.528.jpg",
  "rise-realty":
    "https://seatriptravel.com/wp-content/uploads/2026/01/rise-realty-header-logo-1536x346-1.webp",
};

const LOGOS: CustomerStoriesDemoLogo[] = [
  {
    id: "demo-logo-smile-go-travel",
    name: "Smile Go Travel",
    image: {
      src: "/images/customers/logos/smile-go-travel.webp",
      alt: "Logo Smile Go Travel",
    },
    href: "",
    visible: true,
  },
  {
    id: "demo-logo-fpt-telecom",
    name: "FPT Telecom",
    image: {
      src: "/images/customers/logos/fpt-telecom.webp",
      alt: "Logo FPT Telecom",
    },
    href: "",
    visible: true,
  },
  {
    id: "demo-logo-hay",
    name: "hay",
    image: {
      src: "/images/customers/logos/hay.webp",
      alt: "Logo hay",
    },
    href: "",
    visible: true,
  },
  {
    id: "demo-logo-bi-pecom",
    name: "BI - PECOM",
    image: {
      src: "/images/customers/logos/bi-pecom.webp",
      alt: "Logo BI - PECOM",
    },
    href: "",
    visible: true,
  },
  {
    id: "demo-logo-vien-phuong",
    name: "Viên Phướng",
    image: {
      src: "/images/customers/logos/vien-phuong.webp",
      alt: "Logo Viên Phướng",
    },
    href: "",
    visible: true,
  },
  {
    id: "demo-logo-vlife",
    name: "VLIFE",
    image: {
      src: "/images/customers/logos/vlife.webp",
      alt: "Logo VLIFE",
    },
    href: "",
    visible: true,
  },
  {
    id: "demo-logo-line-technology-vietnam",
    name: "LINE Technology Vietnam",
    image: {
      src: "/images/customers/logos/line-technology-vietnam.webp",
      alt: "Logo LINE Technology Vietnam",
    },
    href: "",
    visible: true,
  },
  {
    id: "demo-logo-an-thinh-pharma",
    name: "An Thịnh Pharma",
    image: {
      src: "/images/customers/logos/an-thinh-pharma.webp",
      alt: "Logo Dược phẩm An Thịnh Pharma",
    },
    href: "",
    visible: true,
  },
  {
    id: "demo-logo-duoc-pham-xanh",
    name: "Dược Phẩm Xanh",
    image: {
      src: "/images/customers/logos/duoc-pham-xanh.webp",
      alt: "Logo Dược Phẩm Xanh",
    },
    href: "",
    visible: true,
  },
  {
    id: "demo-logo-rise-realty",
    name: "Rise Realty",
    image: {
      src: "/images/customers/logos/rise-realty.webp",
      alt: "Logo Rise Realty",
    },
    href: "",
    visible: true,
  },
];

const VIDEOS: CustomerStoriesDemoVideo[] = [
  {
    id: "demo-video-vlife-teambuilding-2025",
    title:
      "Sea Trip Travel đồng hành cùng VLIFE I Teambuilding - Gala Dinner 2025",
    titleEn: "",
    body: "",
    bodyEn: "",
    customer: "VLIFE",
    customerEn: "",
    youtubeUrl: "https://www.youtube.com/watch?v=cKpNJv2x-3I",
    cover: {
      src: "/images/customers/videos/cKpNJv2x-3I.jpg",
      alt: "Ảnh bìa video Sea Trip Travel đồng hành cùng VLIFE - Teambuilding và Gala Dinner 2025",
    },
    visible: true,
  },
  {
    id: "demo-video-ky-co-le-loi",
    title:
      "Du lịch Kỳ Co - Kết hợp Team Building - Trường Tiểu Học Lê Lợi - Đơn vị tổ chức: Sea Trip Travel.",
    titleEn: "",
    body: "",
    bodyEn: "",
    customer: "Trường Tiểu Học Lê Lợi",
    customerEn: "",
    youtubeUrl: "https://www.youtube.com/watch?v=8ybMTyzbfxo",
    cover: {
      src: "/images/customers/videos/8ybMTyzbfxo.jpg",
      alt: "Ảnh bìa video du lịch Kỳ Co kết hợp team building của Trường Tiểu Học Lê Lợi",
    },
    visible: true,
  },
  {
    id: "demo-video-nha-trang-fpt-telecom",
    title:
      "HÀNH TRÌNH KHÁM PHÁ NHA TRANG 3 NGÀY 2 ĐÊM - CÙNG FPT TELECOM GIA LAI & KONTUM",
    titleEn: "",
    body: "",
    bodyEn: "",
    customer: "FPT Telecom Gia Lai & Kontum",
    customerEn: "",
    youtubeUrl: "https://www.youtube.com/watch?v=uRNs9VkZSx4",
    cover: {
      src: "/images/customers/videos/uRNs9VkZSx4.jpg",
      alt: "Ảnh bìa video hành trình Nha Trang 3 ngày 2 đêm cùng FPT Telecom Gia Lai và Kontum",
    },
    visible: true,
  },
  {
    id: "demo-video-phu-yen-ngo-le-tan",
    title:
      "Du lịch Phú Yên - Trường THPT Ngô Lê Tân - Đơn vị tổ chức: Sea Trip Travel.",
    titleEn: "",
    body: "",
    bodyEn: "",
    customer: "Trường THPT Ngô Lê Tân",
    customerEn: "",
    youtubeUrl: "https://www.youtube.com/watch?v=PebkD6IFJD8",
    cover: {
      src: "/images/customers/videos/PebkD6IFJD8.jpg",
      alt: "Ảnh bìa video du lịch Phú Yên của Trường THPT Ngô Lê Tân",
    },
    visible: true,
  },
  {
    id: "demo-video-fpt-binh-dinh-2025",
    title: "Team Building FPT Bình Định 2025 - Đơn vị tổ chức Sea Trip Travel",
    titleEn: "",
    body: "",
    bodyEn: "",
    customer: "FPT Bình Định",
    customerEn: "",
    youtubeUrl: "https://www.youtube.com/watch?v=tFTWDt5K8pY",
    cover: {
      src: "/images/customers/videos/tFTWDt5K8pY.jpg",
      alt: "Ảnh bìa video team building FPT Bình Định 2025 do Sea Trip Travel tổ chức",
    },
    visible: true,
  },
  {
    id: "demo-video-fpt-telecom-teambuilding-2025",
    title:
      "FPT Telecom Gia Lai - Kon Tum - Team Building 2025 - Đơn vị tổ chức: Sea Trip Travel",
    titleEn: "",
    body: "",
    bodyEn: "",
    customer: "FPT Telecom Gia Lai – Kon Tum",
    customerEn: "",
    youtubeUrl: "https://www.youtube.com/watch?v=CcO59qGJLGk",
    cover: {
      src: "/images/customers/videos/CcO59qGJLGk.jpg",
      alt: "Ảnh bìa video team building 2025 của FPT Telecom Gia Lai và Kon Tum",
    },
    visible: true,
  },
];

export const CUSTOMER_STORIES_DEMO: LandingSections["customers"] = {
  enabled: true,
  eyebrow: "",
  eyebrowEn: "",
  title: "Khách hàng của chúng tôi",
  titleEn: "Our customers",
  body: "Những đơn vị, doanh nghiệp và đoàn khách đã tin chọn SEA TRIP cho hành trình của mình. Mỗi chuyến đi là một câu chuyện được kể lại bằng hình ảnh, video và những chia sẻ chân thành.",
  bodyEn:
    "The companies, organisations and travel groups who chose SEA TRIP for their journey. Every trip is a story told through real photos, films and honest words from the people who travelled.",
  ctaLabel: "",
  ctaLabelEn: "",
  ctaHref: "",
  showLogos: true,
  logosTitle: "Khách hàng & đối tác",
  logosTitleEn: "Customers & partners",
  logos: LOGOS,
  showVideos: true,
  videosTitle: "Video hành trình",
  videosTitleEn: "Journey films",
  videos: VIDEOS,
};

/**
 * Read-only entries for the Studio media picker. The demo assets live in
 * `public/images/customers` (not in the upload folder), so the admin media API
 * lists them as originals: the owner can pick them again but cannot delete them
 * through the upload library.
 */
export const CUSTOMER_STORIES_MEDIA = [
  ...LOGOS.map((logo) => ({
    id: `customer-logo:${logo.id}`,
    name: String(logo.image.src ?? "").split("/").pop() ?? logo.id,
    src: String(logo.image.src ?? ""),
    alt: logo.image.alt,
  })),
  ...VIDEOS.filter((video) => Boolean(video.cover?.src)).map((video) => ({
    id: `customer-video:${video.id}`,
    name: String(video.cover?.src ?? "").split("/").pop() ?? video.id,
    src: String(video.cover?.src ?? ""),
    alt: video.cover?.alt ?? video.title,
  })),
];

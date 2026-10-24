/**
 * Site-wide configuration and business identity.
 *
 * Values marked `TODO(owner)` are still placeholders and must be supplied before
 * launch. See docs/CONTENT-TODO.md — it tracks what is done and what is not.
 */

/** Structured address, so JSON-LD can emit proper PostalAddress parts. */
const addressParts = {
  street: "42-44 Chế Lan Viên",
  locality: "Phường Quy Nhơn Nam",
  region: "Tỉnh Gia Lai",
  country: "Việt Nam",
} as const;

/** One source of truth: the display string is derived from the parts. */
const address = [addressParts.street, addressParts.locality, addressParts.region, addressParts.country].join(
  ", ",
);

export const siteConfig = {
  name: "SEA TRIP TRAVEL",
  shortName: "SEA TRIP",
  /** Brand message, taken verbatim from the logo lockup. */
  message: "Chọn lọc điểm đến – Nâng tầm trải nghiệm",
  description:
    "SEA TRIP TRAVEL chọn lọc điểm đến và thiết kế trải nghiệm du lịch trong nước, tập trung vào Quy Nhơn – Phú Yên và các tuyến Miền Bắc, Miền Trung, Miền Nam, Tây Nguyên.",
  /** TODO(owner): domain thật, khi đã trỏ DNS. Dùng cho canonical, OG và link trong email. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3050",
  locale: "vi_VN",
  lang: "vi",
  contact: {
    /** Display form. Vietnamese convention groups the last 3 digits. */
    hotline: "0969 297 064",
    /** Dialable form — must be the same number, digits only. */
    hotlineHref: "tel:+84969297064",
    email: "seatriptravel@gmail.com",
    address,
    addressParts,
    /** TODO(owner): xác nhận giờ làm việc thực tế. */
    workingHours: "Thứ 2 – Thứ 7, 08:00 – 18:00",
  },
  social: {
    facebook: "https://www.facebook.com/share/1C64q28Cz5/?mibextid=wwXIfr",
    /**
     * Zalo OA hoặc `https://zalo.me/<số điện thoại>`. Bỏ trống thì nút Zalo tự
     * dùng `https://zalo.me/` + số hotline ở trên — với hotline thật thì link đó
     * đã dùng được. Điền link OA riêng nếu có.
     */
    zalo: "",
    /** TODO(owner): điền nếu có kênh chính thức; để trống thì nút sẽ bị ẩn. */
    instagram: "",
    tiktok: "",
    youtube: "",
  },
} as const;

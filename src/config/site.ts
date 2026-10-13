/**
 * Site-wide configuration and business identity.
 *
 * NOTE: Every value marked `TODO(owner)` is a placeholder that the site owner
 * must supply before launch. They are intentionally obvious so nothing invented
 * is published by accident. See docs/CONTENT-TODO.md.
 */

export const siteConfig = {
  name: "SEA TRIP TRAVEL",
  shortName: "SEA TRIP",
  /** Brand message, taken verbatim from the logo lockup. */
  message: "Chọn lọc điểm đến – Nâng tầm trải nghiệm",
  description:
    "SEA TRIP TRAVEL chọn lọc điểm đến và thiết kế trải nghiệm du lịch trong nước, tập trung vào Quy Nhơn – Phú Yên và các tuyến tour Miền Bắc, Miền Trung, Miền Nam, Tây Nguyên.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "vi_VN",
  lang: "vi",
  contact: {
    /** TODO(owner): hotline chính thức. Placeholder bên dưới. */
    hotline: "0000 000 000",
    hotlineHref: "tel:+84000000000",
    /** TODO(owner): email nhận tư vấn (sales inbox on the verified mail domain). */
    email: "hello@example.com",
    /** TODO(owner): địa chỉ văn phòng. */
    address: "Địa chỉ văn phòng sẽ được cập nhật",
    /** TODO(owner): giờ làm việc. */
    workingHours: "Thứ 2 – Thứ 7, 08:00 – 18:00",
  },
  social: {
    /**
     * TODO(owner): điền kênh chính thức. Để trống thì nút tương ứng sẽ dùng
     * đường dẫn dự phòng và cần được cập nhật trước khi chạy quảng cáo
     * (xem docs/CONTENT-TODO.md nhóm 🟠).
     */
    facebook: "",
    /** Zalo OA hoặc link `https://zalo.me/<số điện thoại>`. */
    zalo: "",
    instagram: "",
    tiktok: "",
    youtube: "",
  },
} as const;

export const isPlaceholderContact = {
  hotline: siteConfig.contact.hotline.includes("0000"),
  email: siteConfig.contact.email.includes("example.com"),
} as const;

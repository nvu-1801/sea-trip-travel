import type { Metadata } from "next";
import { connection } from "next/server";
import { getCurrentAdmin } from "@/server/auth/session";
import { siteConfig } from "@/config/site";
import { getMessages } from "@/i18n/messages";
import { listMedia } from "@/server/repo/media";
import { listPublishedTours } from "@/server/repo/tours";
import { getSettingSection } from "@/server/repo/settings";
import { PageHeader } from "@/components/admin/ui";
import { AdminLoginCard } from "@/components/admin/login-card";
import { SettingsForm, type SettingsField } from "./settings-form";

/**
 * Admin screens read live database state and the session cookie, so they render
 * at request time. No static shell is produced for them (and none would be
 * correct), which is also what keeps `new Date()` out of a prerender.
 */
export const instant = false;

export const metadata: Metadata = { title: "Trang chủ & liên hệ" };

const HERO_FIELDS: SettingsField[] = [
  { key: "badge", label: "Nhãn nhỏ trên tiêu đề" },
  { key: "titleLine1", label: "Tiêu đề dòng 1" },
  { key: "titleLine2", label: "Tiêu đề dòng 2 (màu thương hiệu)" },
  { key: "lead", label: "Câu dẫn chính", type: "textarea" },
  { key: "bodyA", label: "Đoạn mô tả — phần đầu", type: "textarea" },
  { key: "bodyB", label: "Đoạn mô tả — phần sau", type: "textarea" },
  { key: "ctaTours", label: "Nút “Xem tour”" },
  { key: "ctaConsult", label: "Nút “Tư vấn”" },
  { key: "focusBadge", label: "Nhãn khối nổi bật" },
  { key: "focusName", label: "Tên tuyến trọng tâm" },
  { key: "collageAltMain", label: "Mô tả ảnh chính (alt)" },
  { key: "collageAltSecondary", label: "Mô tả ảnh phụ (alt)" },
  { key: "imageSrc", label: "Ảnh chính (trang chủ)", type: "media", hint: "Để trống sẽ dùng ảnh điểm đến hoặc ảnh minh hoạ thương hiệu." },
  { key: "secondaryImageSrc", label: "Ảnh phụ (trang chủ)", type: "media" },
];

const CONTACT_FIELDS: SettingsField[] = [
  { key: "hotline", label: "Hotline (hiển thị)" },
  { key: "hotlineHref", label: "Hotline (liên kết tel:)", hint: "Ví dụ tel:+84969297064" },
  { key: "email", label: "Email liên hệ" },
  { key: "address", label: "Địa chỉ", type: "textarea" },
  { key: "workingHours", label: "Giờ làm việc" },
];

const SOCIAL_FIELDS: SettingsField[] = [
  { key: "facebook", label: "Facebook" },
  { key: "zalo", label: "Zalo" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
];

const HOME_FIELDS: SettingsField[] = [
  {
    key: "featuredTourSlugs",
    label: "Tour nổi bật trên trang chủ",
    type: "tours",
    hint: "Chọn theo thứ tự mong muốn. Để trống sẽ dùng tuyến Quy Nhơn – Phú Yên.",
  },
  {
    key: "featuredArticleSlug",
    label: "Bài viết nổi bật",
    hint: "Slug bài viết, ví dụ kinh-nghiem-du-lich-quy-nhon-phu-yen. Để trống sẽ dùng bài được ghim.",
  },
];

function pick(stored: Record<string, unknown>, key: string, fallback: string): string {
  const value = stored[key];
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

export default async function SettingsPage() {
  await connection();
  const admin = await getCurrentAdmin();
  if (!admin) return <AdminLoginCard notice="Vui lòng đăng nhập để tiếp tục." />;
  const viHero = getMessages("vi").home.hero;
  const enHero = getMessages("en").home.hero;
  const storedViHero = getSettingSection("vi", "hero");
  const storedEnHero = getSettingSection("en", "hero");
  const storedContact = getSettingSection("vi", "contact");
  const storedSocial = getSettingSection("vi", "social");
  const storedHome = getSettingSection("vi", "home");

  const media = listMedia({ limit: 300 }).map((item) => ({ id: item.id, url: item.url, alt: item.altDefault }));
  const tourOptions = listPublishedTours().map((tour) => ({ slug: tour.slug, title: tour.title }));

  const heroInitial = (stored: Record<string, unknown>, defaults: typeof viHero) =>
    Object.fromEntries(HERO_FIELDS.map((field) => [field.key, pick(stored, field.key, String(defaults[field.key as keyof typeof defaults] ?? ""))]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trang chủ & liên hệ"
        description="Chỉ những trường đang hiển thị trên website mới có thể sửa. Để trống một trường nghĩa là giữ giá trị mặc định."
      />

      <SettingsForm
        section="hero"
        locale="vi"
        title="Tiêu đề trang chủ — Tiếng Việt"
        description="Nội dung hero hiển thị ở đầu trang chủ."
        fields={HERO_FIELDS}
        initial={heroInitial(storedViHero, viHero)}
        media={media}
      />

      <SettingsForm
        section="hero"
        locale="en"
        title="Tiêu đề trang chủ — English"
        description="English hero. Nếu để trống, bản dịch mặc định trong hệ thống được dùng."
        fields={HERO_FIELDS}
        initial={heroInitial(storedEnHero, enHero)}
        media={media}
      />

      <SettingsForm
        section="contact"
        locale="vi"
        title="Thông tin liên hệ"
        description="Hotline, email, địa chỉ hiển thị ở header, footer, trang liên hệ và email nội bộ."
        fields={CONTACT_FIELDS}
        initial={{
          hotline: pick(storedContact, "hotline", siteConfig.contact.hotline),
          hotlineHref: pick(storedContact, "hotlineHref", siteConfig.contact.hotlineHref),
          email: pick(storedContact, "email", siteConfig.contact.email),
          address: pick(storedContact, "address", siteConfig.contact.address),
          workingHours: pick(storedContact, "workingHours", siteConfig.contact.workingHours),
        }}
      />

      <SettingsForm
        section="social"
        locale="vi"
        title="Liên kết mạng xã hội"
        description="Để trống sẽ dùng liên kết mặc định hoặc ẩn nút nếu chưa có."
        fields={SOCIAL_FIELDS}
        initial={{
          facebook: pick(storedSocial, "facebook", siteConfig.social.facebook),
          zalo: pick(storedSocial, "zalo", siteConfig.social.zalo),
          instagram: pick(storedSocial, "instagram", siteConfig.social.instagram),
          tiktok: pick(storedSocial, "tiktok", siteConfig.social.tiktok),
          youtube: pick(storedSocial, "youtube", siteConfig.social.youtube),
        }}
      />

      <SettingsForm
        section="home"
        locale="vi"
        title="Nội dung nổi bật trên trang chủ"
        description="Chọn tour và bài viết nổi bật."
        fields={HOME_FIELDS}
        initial={{
          featuredTourSlugs: Array.isArray(storedHome.featuredTourSlugs)
            ? (storedHome.featuredTourSlugs as string[])
            : [],
          featuredArticleSlug:
            typeof storedHome.featuredArticleSlug === "string" ? (storedHome.featuredArticleSlug as string) : "",
        }}
        tourOptions={tourOptions}
      />
    </div>
  );
}

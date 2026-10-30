/**
 * Metadata for the admin "Trang chủ" tab: one card per landing-page section,
 * in the exact order the sections render on the website. Pure data + pure
 * summary helpers — no DOM, fully unit-testable.
 */

export type HomeSectionCollection = "hero" | "landing";

/** Nhóm hiển thị trên tab quản trị: đầu / giữa / cuối trang. */
export type HomeSectionGroup = "top" | "main" | "bottom";

export type HomeSectionMeta = {
  /** Key inside the record data ("hero" uses the whole hero record). */
  key: string;
  collection: HomeSectionCollection | null;
  title: string;
  /** Where this appears on the landing page, in plain words. */
  where: string;
  illustration: string;
  /** Biểu tượng minh họa trên thẻ quản trị. */
  icon: string;
  /** Nhóm phân chia trên tab quản trị. */
  group: HomeSectionGroup;
  /** Gợi ý ngắn: sửa gì trong phần này. */
  tip: string;
  /** Opens the Website & footer tab instead of an editor modal. */
  linkTab?: string;
};

export const HOME_GROUPS: readonly {
  key: HomeSectionGroup;
  title: string;
  hint: string;
}[] = [
  {
    key: "top",
    title: "A · Đầu trang",
    hint: "Khách thấy đầu tiên — banner và tìm kiếm",
  },
  {
    key: "main",
    title: "B · Giữa trang",
    hint: "Nội dung chính — tour, điểm đến, giá trị",
  },
  {
    key: "bottom",
    title: "C · Cuối trang",
    hint: "Chốt đơn — cẩm nang, hỏi đáp, chân trang",
  },
];

export const HOME_SECTIONS: readonly HomeSectionMeta[] = [
  {
    key: "hero",
    collection: "hero",
    title: "Ảnh đầu trang",
    where: "Đầu trang chủ — banner ảnh lớn",
    illustration: "/images/hero/ky-co-user.png",
    icon: "image",
    group: "top",
    tip: "Đổi ảnh, tiêu đề, nút bấm và bật/tắt tự chạy slide.",
  },
  {
    key: "finder",
    collection: "landing",
    title: "Thanh tìm kiếm tour",
    where: "Ngay dưới banner — gợi ý Quy Nhơn / Phú Yên / Kỳ Co",
    illustration: "/images/hero/blue-bay.webp",
    icon: "search",
    group: "top",
    tip: "Sửa các gợi ý tìm kiếm nhanh dưới banner.",
  },
  {
    key: "explore",
    collection: "landing",
    title: "Khám phá điểm đến",
    where: "Cụm tối đa 3 thẻ điểm đến dưới thanh tìm kiếm",
    illustration: "/images/destinations/hon-kho.jpg",
    icon: "map",
    group: "main",
    tip: "Chỗ này chỉ sửa tiêu đề/mô tả. Chọn thẻ nào và thứ tự ra sao ở tab Điểm đến.",
  },
  {
    key: "featured",
    collection: "landing",
    title: "Tour nổi bật",
    where: "Lưới tour chính giữa trang chủ",
    illustration: "/images/tours/d7233006cc4fd0f9.jpeg",
    icon: "star",
    group: "main",
    tip: "Chọn tuyến/vùng, ghim danh sách theo thứ tự hoặc để hệ thống tự chọn.",
  },
  {
    key: "trust",
    collection: "landing",
    title: "Cam kết dịch vụ",
    where: "Dải 4 cam kết dưới tour nổi bật",
    illustration: "/images/hero/emerald-bay.webp",
    icon: "shield",
    group: "main",
    tip: "Sửa 4 cam kết dịch vụ hiển thị dạng dải.",
  },
  {
    key: "story",
    collection: "landing",
    title: "Lịch trình gợi ý",
    where: "Khối nền tối: 1 ngày / 2 ngày / 4+ ngày",
    illustration: "/images/hero/coastal-sunset.webp",
    icon: "clock",
    group: "main",
    tip: "Sửa các mốc lịch trình gợi ý theo số ngày.",
  },
  {
    key: "regions",
    collection: "landing",
    title: "Tour theo vùng miền",
    where: "4 thẻ vùng miền",
    illustration: "/images/destinations/hoi-an.jpg",
    icon: "compass",
    group: "main",
    tip: "Sửa tiêu đề, mô tả, ảnh và nội dung các thẻ vùng miền trong cùng một form.",
  },
  {
    key: "values",
    collection: "landing",
    title: "Giá trị SEA TRIP",
    where: "Khối ảnh + 4 nguyên tắc làm việc",
    illustration: "/images/hero/island-panorama.webp",
    icon: "gem",
    group: "main",
    tip: "Đổi ảnh, huy hiệu và 4 nguyên tắc làm việc.",
  },
  {
    key: "customers",
    collection: "landing",
    title: "Khách hàng & dấu ấn hành trình",
    where: "Ngay dưới Vì sao chọn SEA TRIP",
    illustration: "/images/hero/coastal-sunset.webp",
    icon: "users",
    group: "main",
    tip: "Dải logo 2 hàng full width chạy ngược chiều + video khách hàng. Bật/tắt section, thêm logo/video và sắp thứ tự tại đây.",
  },
  {
    key: "guides",
    collection: "landing",
    title: "Cẩm nang nổi bật",
    where: "Bài viết lớn + 3 bài phụ",
    illustration: "/images/destinations/bai-xep.jpg",
    icon: "news",
    group: "bottom",
    tip: "Chọn bài tiêu điểm hoặc để tự động bài mới nhất.",
  },
  {
    key: "planning",
    collection: "landing",
    title: "Hỏi đáp & tư vấn",
    where: "FAQ + form nhận tư vấn cuối trang",
    illustration: "/images/destinations/mui-dien.jpg",
    icon: "help",
    group: "bottom",
    tip: "Sửa câu hỏi thường gặp và form nhận tư vấn.",
  },
  {
    key: "footer",
    collection: null,
    title: "Chân trang",
    where: "Logo, địa chỉ, mạng xã hội — sửa ở Website & footer",
    illustration: "/images/hero/lighthouse-coast.webp",
    icon: "compass",
    group: "bottom",
    tip: "Phần này sửa ở tab Website & footer.",
    linkTab: "settings",
  },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** One representative line of the copy currently published on the section. */
export type HomeSectionPreview = {
  text: string;
  meta: string;
};

/**
 * Card-sized preview of the real editorial copy behind a section. The summary
 * below it stays a compact count/status; this is the human-readable line the
 * owner recognises from the website.
 */
export function sectionPreview(
  meta: HomeSectionMeta,
  data: unknown,
): HomeSectionPreview {
  const root = asRecord(data);
  try {
    switch (meta.key) {
      case "hero": {
        const vi = asRecord(root.vi);
        const firstSlide = asRecord(asArray(root.slides)[0]);
        const headline =
          [asString(vi.titleLine1), asString(vi.titleLine2)]
            .filter(Boolean)
            .join(" ") ||
          asString(vi.badge) ||
          asString(firstSlide.caption) ||
          "Banner ảnh đầu trang";
        const description =
          asString(vi.description);
        return { text: headline, meta: description };
      }
      case "finder": {
        const labels = asArray(asRecord(root.finder).suggestions)
          .map((item) => asString(asRecord(item).label))
          .filter(Boolean);
        return {
          text: labels.join(" · ") || "Quy Nhơn · Phú Yên · Kỳ Co",
          meta: labels.length ? `${labels.length} gợi ý tìm nhanh` : "",
        };
      }
      case "explore": {
        const explore = asRecord(root.explore);
        const title = [asString(explore.titleA), asString(explore.titleB)]
          .filter(Boolean)
          .join(" ");
        return {
          text: title || "Chạm vào một miền bình yên",
          meta: asString(explore.body),
        };
      }
      case "featured": {
        const featured = asRecord(root.featured);
        const scope = asRecord(
          asRecord(featured.scopes)[asString(featured.categoryId)],
        );
        const tourIds = asArray(featured.tourIds);
        const title =
          asString(scope.title) ||
          [asString(scope.eyebrow), "Tour nổi bật"].filter(Boolean).join(" · ");
        return {
          text: title,
          meta: tourIds.length
            ? `${tourIds.length} tour đang ghim trên trang chủ`
            : "Tự động chọn tour theo tuyến đang xem",
        };
      }
      case "customers": {
        const customers = asRecord(root.customers);
        return {
          text: asString(customers.title) || "Dấu ấn sau mỗi hành trình",
          meta: asString(customers.body),
        };
      }
      case "trust": {
        const items = asArray(asRecord(root.trust).items);
        const first = asRecord(items[0]);
        return {
          text: asString(first.title) || "Cam kết dịch vụ",
          meta: items.length ? `${items.length} cam kết đang hiển thị` : "",
        };
      }
      case "story": {
        const trips = asArray(asRecord(root.story).trips);
        const first = asRecord(trips[0]);
        return {
          text: asString(first.title) || "Một ngày đổi gió",
          meta: asString(first.body),
        };
      }
      case "regions": {
        const regions = asRecord(root.regions);
        const title = [asString(regions.titleA), asString(regions.titleB)]
          .filter(Boolean)
          .join(" ");
        return {
          text: title || "Một Việt Nam, muôn điều để nhớ",
          meta: asString(regions.intro),
        };
      }
      case "values": {
        const values = asRecord(root.values);
        const principle = asRecord(asArray(values.principles)[0]);
        return {
          text: asString(values.badge) || "Đi chậm, chọn kỹ, nhớ lâu",
          meta: asString(principle.title),
        };
      }
      case "guides": {
        const guides = asRecord(root.guides);
        const featuredSlug = asString(guides.featuredSlug);
        const picks = asArray(guides.picks);
        return {
          text: featuredSlug
            ? `Bài tiêu điểm: ${featuredSlug}`
            : "Tự động chọn bài mới nhất",
          meta: picks.length ? `${picks.length} bài viết phụ đang ghim` : "",
        };
      }
      case "planning": {
        const questions = asArray(asRecord(root.planning).questions);
        const first = asRecord(questions[0]);
        return {
          text: asString(first.q) || "Chọn chuyến đi thế nào cho phù hợp?",
          meta: asString(first.a),
        };
      }
      case "footer":
        return {
          text: "Logo, hotline, địa chỉ và mạng xã hội",
          meta: "Sửa trong tab Website & footer",
        };
      default:
        return { text: meta.title, meta: meta.where };
    }
  } catch {
    return { text: meta.title, meta: meta.where };
  }
}

/**
 * One-line live summary of what a section currently shows on the website.
 * Never throws and never returns empty — falls back to a neutral hint.
 */
export function sectionSummary(meta: HomeSectionMeta, data: unknown): string {
  const root = asRecord(data);
  try {
    switch (meta.key) {
      case "hero": {
        const slides = asArray(root.slides).length;
        const autoplay = root.autoplay === true;
        const interval = typeof root.intervalSeconds === "number" ? root.intervalSeconds : 0;
        return `${slides} ảnh · ${autoplay && interval > 0 ? `tự chạy ${interval}s` : "đứng yên"}`;
      }
      case "finder": {
        const labels = asArray(asRecord(root.finder).suggestions)
          .map((s) => asString(asRecord(s).label))
          .filter(Boolean)
          .slice(0, 3);
        return labels.length > 0 ? labels.join(" · ") : "Chưa có gợi ý";
      }
      case "explore":
        return asString(asRecord(root.explore).titleA) || "Tiêu đề đang để trống";
      case "featured": {
        const featured = asRecord(root.featured);
        const ids = asArray(featured.tourIds);
        const mode =
          asString(featured.mode) || (ids.length > 0 ? "manual" : "auto");
        return mode === "manual" && ids.length > 0
          ? `Đang ghim ${ids.length} tour`
          : "Tự động theo tuyến";
      }
      case "trust": {
        const n = asArray(asRecord(root.trust).items).length;
        return n > 0 ? `${n} cam kết` : "Chưa có cam kết";
      }
      case "customers": {
        const section = asRecord(root.customers);
        if (section.enabled !== true) return "Đang tắt";
        const logos = asArray(section.logos).filter(
          (item) => asRecord(item).visible !== false,
        ).length;
        const videos = asArray(section.videos).filter(
          (item) => asRecord(item).visible !== false,
        ).length;
        return `${logos} logo · ${videos} video`;
      }
      case "story": {
        const n = asArray(asRecord(root.story).trips).length;
        return n > 0 ? `${n} mốc thời gian` : "Chưa có mốc nào";
      }
      case "regions":
        return asString(asRecord(root.regions).titleA) || "Tiêu đề đang để trống";
      case "values":
        return asString(asRecord(root.values).badge) || "Chưa có huy hiệu";
      case "guides": {
        const slug = asString(asRecord(root.guides).featuredSlug);
        return slug ? `Tiêu điểm: ${slug}` : "Tự động bài mới nhất";
      }
      case "planning": {
        const n = asArray(asRecord(root.planning).questions).length;
        return n > 0 ? `${n} câu hỏi thường gặp` : "Chưa có câu hỏi";
      }
      case "footer":
        return "Sửa ở tab Website & footer";
      default:
        return "—";
    }
  } catch {
    return "—";
  }
}

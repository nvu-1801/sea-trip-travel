import { tourRecordSchema, type TourRecord } from "./tour-cms";

/**
 * Pure tour validation shared by the Studio form and the CMS API.
 *
 * The form needs to point at the exact field that is wrong, so every rule
 * returns a `path` (the same shape Zod uses) plus a Vietnamese message and the
 * page section it belongs to. The API reuses the same rules so client and server
 * can never disagree about what a valid tour looks like.
 */

export type TourSectionKey =
  | "general"
  | "media"
  | "overview"
  | "highlights"
  | "itinerary"
  | "pricing"
  | "services"
  | "notes"
  | "logistics"
  | "seo"
  | "translations"
  | "consult"
  | "advanced";

export type TourIssue = {
  path: (string | number)[];
  message: string;
  section: TourSectionKey;
};

/** Upper bound for a published VND price; catches accidental pasted IDs. */
export const MAX_TOUR_PRICE = 1_000_000_000;

export type TourReferenceContext = {
  categories: ReadonlySet<string>;
  destinations: ReadonlySet<string>;
};

export const TOUR_SECTION_LABELS: Record<TourSectionKey, string> = {
  general: "Thông tin chung",
  media: "Ảnh & thư viện",
  overview: "Giới thiệu",
  highlights: "Điểm nổi bật",
  itinerary: "Lịch trình",
  pricing: "Giá & các gói",
  services: "Dịch vụ",
  notes: "Lưu ý & chính sách",
  logistics: "Di chuyển & khởi hành",
  seo: "SEO",
  translations: "Bản dịch tiếng Anh",
  consult: "Tư vấn",
  advanced: "Nâng cao",
};

const FIELDS_BY_SECTION: Record<TourSectionKey, readonly string[]> = {
  general: [
    "title",
    "summary",
    "tourCode",
    "badge",
    "tags",
    "categoryIds",
    "destinationIds",
    "contentStatus",
    "priceFrom",
    "priceNote",
  ],
  media: ["images"],
  overview: ["overview"],
  highlights: ["highlights"],
  itinerary: ["duration", "itinerary"],
  pricing: ["pricingOptions", "gifts"],
  services: ["included", "excluded"],
  notes: ["notes", "policies"],
  logistics: ["departurePoints", "returnPoints", "transport"],
  seo: ["seo"],
  translations: ["_en", "_enReviewed"],
  consult: [],
  advanced: ["id", "slug", "updatedAt", "sourceDocuments"],
};

export function sectionOfTourPath(
  path: readonly (string | number)[],
): TourSectionKey {
  const first = String(path[0] ?? "");
  for (const [section, fields] of Object.entries(FIELDS_BY_SECTION) as [
    TourSectionKey,
    readonly string[],
  ][]) {
    if (fields.includes(first)) return section;
  }
  return "general";
}

const FIELD_LABELS: Record<string, string> = {
  id: "Mã nội dung",
  slug: "Slug",
  title: "Tiêu đề",
  summary: "Tóm tắt",
  tourCode: "Mã tour",
  badge: "Nhãn nổi bật",
  tags: "Nhãn lọc",
  categoryIds: "Danh mục",
  destinationIds: "Điểm đến",
  contentStatus: "Tình trạng xác minh",
  duration: "Thời lượng",
  days: "Số ngày",
  nights: "Số đêm",
  images: "Ảnh",
  src: "Đường dẫn ảnh",
  alt: "Mô tả ảnh",
  caption: "Chú thích ảnh",
  overview: "Đoạn giới thiệu",
  highlights: "Điểm nổi bật",
  itinerary: "Lịch trình",
  index: "Ngày thứ",
  activities: "Hoạt động",
  meals: "Bữa ăn",
  places: "Điểm tham quan",
  accommodation: "Lưu trú",
  priceFrom: "Giá từ",
  amount: "Số tiền",
  currency: "Tiền tệ",
  pricingOptions: "Gói giá",
  label: "Nhãn hiển thị",
  adultPrice: "Giá người lớn",
  childPrice: "Giá trẻ em",
  priceNote: "Ghi chú giá",
  gifts: "Quà tặng",
  included: "Đã bao gồm",
  excluded: "Không bao gồm",
  notes: "Lưu ý",
  policies: "Chính sách",
  departurePoints: "Điểm khởi hành",
  returnPoints: "Điểm kết thúc",
  transport: "Phương tiện",
  seo: "SEO",
  description: "Mô tả",
  ogImage: "Ảnh chia sẻ",
  _en: "Bản dịch tiếng Anh",
  _enReviewed: "Đã duyệt bản dịch",
  updatedAt: "Cập nhật lúc",
  sourceDocuments: "Nguồn tư liệu",
};

/** Human label for an issue, used by the error summary and the jump links. */
export function describeTourIssue(issue: TourIssue): string {
  const parts: string[] = [TOUR_SECTION_LABELS[issue.section]];
  for (let i = 0; i < issue.path.length; i += 1) {
    const part = issue.path[i];
    if (typeof part === "number") {
      const parent = String(issue.path[i - 1] ?? "");
      if (parent === "itinerary") parts.push(`Ngày ${part + 1}`);
      else if (parent === "pricingOptions") parts.push(`Gói ${part + 1}`);
      else if (parent === "images") parts.push(`Ảnh ${part + 1}`);
      else if (parent === "imageAlts") parts.push(`Mô tả ảnh ${part + 1}`);
      else parts.push(`Mục ${part + 1}`);
      continue;
    }
    const key = String(part);
    if (i === 0 && key === issue.section) continue;
    if (i === 0 && typeof issue.path[1] === "number") continue;
    if (key === "_en" && issue.section === "translations") continue;
    if (key === "seo" && issue.section === "seo") continue;
    parts.push(FIELD_LABELS[key] ?? key);
  }
  return parts.join(" · ");
}

/** Turn a Zod issue into a short Vietnamese message the owner can act on. */
export function humanizeZodIssue(issue: {
  code: string;
  origin?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  inclusive?: boolean;
  format?: string;
  message: string;
}): string {
  const min = issue.minimum;
  const max = issue.maximum;
  switch (issue.code) {
    case "too_small":
      if (issue.origin === "string") {
        return Number(min) === 1
          ? "Không được để trống"
          : `Cần ít nhất ${String(min)} ký tự`;
      }
      if (issue.origin === "array") return `Cần ít nhất ${String(min)} mục`;
      return `Giá trị phải ${issue.inclusive ? "≥" : ">"} ${String(min)}`;
    case "too_big":
      if (issue.origin === "string")
        return `Tối đa ${String(max)} ký tự`;
      if (issue.origin === "array") return `Tối đa ${String(max)} mục`;
      return `Giá trị phải ${issue.inclusive ? "≤" : "<"} ${String(max)}`;
    case "invalid_format":
      if (issue.format === "datetime") return "Thời gian không hợp lệ";
      return "Định dạng không hợp lệ";
    case "invalid_value":
    case "invalid_type":
      return "Giá trị không hợp lệ";
    case "unrecognized_keys":
      return "Có trường không được hỗ trợ";
    default:
      return issue.message;
  }
}

function pathOf(issue: { path: readonly PropertyKey[] }): (string | number)[] {
  return issue.path.filter(
    (part): part is string | number =>
      typeof part === "string" || typeof part === "number",
  );
}

export function collectTourTypeIssues(input: unknown): TourIssue[] {
  const result = tourRecordSchema.safeParse(input);
  if (result.success) return [];
  return result.error.issues.map((issue) => {
    const path = pathOf(issue);
    return {
      path,
      message: humanizeZodIssue(issue),
      section: sectionOfTourPath(path),
    };
  });
}

export function collectTourBusinessIssues(
  tour: TourRecord,
  context?: TourReferenceContext,
): TourIssue[] {
  const issues: TourIssue[] = [];
  const add = (path: (string | number)[], message: string) =>
    issues.push({ path, message, section: sectionOfTourPath(path) });

  if (tour.priceFrom && tour.priceFrom.amount <= 0) {
    add(
      ["priceFrom", "amount"],
      "Giá từ phải lớn hơn 0; dùng giá liên hệ nếu chưa có giá",
    );
  }
  if (tour.priceFrom && tour.priceFrom.amount > MAX_TOUR_PRICE) {
    add(["priceFrom", "amount"], "Giá từ vượt quá giới hạn hợp lệ");
  }
  tour.pricingOptions.forEach((option, index) => {
    if (option.adultPrice > MAX_TOUR_PRICE) {
      add(
        ["pricingOptions", index, "adultPrice"],
        "Giá người lớn vượt quá giới hạn hợp lệ",
      );
    }
    if (option.childPrice > MAX_TOUR_PRICE) {
      add(
        ["pricingOptions", index, "childPrice"],
        "Giá trẻ em vượt quá giới hạn hợp lệ",
      );
    }
    if (option.childPrice > option.adultPrice) {
      add(
        ["pricingOptions", index, "childPrice"],
        "Giá trẻ em không nên cao hơn giá người lớn",
      );
    }
  });

  if (tour.duration.days > 90 || tour.duration.nights > tour.duration.days) {
    add(["duration", "nights"], "Thời lượng tour không hợp lệ");
  }

  const dayIds = tour.itinerary.map((day) => day.id);
  const optionIds = tour.pricingOptions.map((option) => option.id);
  if (new Set(dayIds).size !== dayIds.length) {
    add(["itinerary"], "Mã ngày lịch trình bị trùng");
  }
  if (new Set(optionIds).size !== optionIds.length) {
    add(["pricingOptions"], "Mã gói giá bị trùng");
  }

  if (
    tour.itinerary.length !== tour.duration.days ||
    tour.itinerary.some((day, index) => day.index !== index + 1)
  ) {
    add(
      ["itinerary"],
      "Số ngày lịch trình phải khớp thời lượng và đúng thứ tự",
    );
  }

  if (context) {
    if (tour.categoryIds.some((id) => !context.categories.has(id))) {
      add(["categoryIds"], "Danh mục không tồn tại");
    }
    if (tour.destinationIds.some((id) => !context.destinations.has(id))) {
      add(["destinationIds"], "Điểm đến không tồn tại");
    }
  }

  if (tour.pricingOptions.length > 0) {
    const lowest = Math.min(
      ...tour.pricingOptions.map((option) => option.adultPrice),
    );
    if (tour.priceFrom?.amount !== lowest) {
      add(
        ["priceFrom", "amount"],
        "Giá từ phải khớp giá thấp nhất trong bảng giá",
      );
    }
  }

  const translated = tour._en;
  if (translated?.itinerary) {
    if (
      translated.itinerary.length !== tour.duration.days ||
      translated.itinerary.some((day, index) => day.index !== index + 1)
    ) {
      add(
        ["_en", "itinerary"],
        "Lịch trình tiếng Anh phải khớp số ngày và đúng thứ tự",
      );
    }
  }
  if (
    translated?.imageAlts &&
    translated.imageAlts.length !== tour.images.length
  ) {
    add(
      ["_en", "imageAlts"],
      "Số mô tả ảnh tiếng Anh phải bằng số ảnh của tour",
    );
  }

  return issues;
}

/** Full validation used by the Studio form before it calls the API. */
export function collectTourIssues(
  input: unknown,
  context?: TourReferenceContext,
): TourIssue[] {
  const result = tourRecordSchema.safeParse(input);
  if (!result.success) {
    return result.error.issues.map((issue) => {
      const path = pathOf(issue);
      return {
        path,
        message: humanizeZodIssue(issue),
        section: sectionOfTourPath(path),
      };
    });
  }
  return collectTourBusinessIssues(result.data, context);
}

/** True when the value can be shown as a tour without another API round-trip. */
export function isValidTour(
  input: unknown,
  context?: TourReferenceContext,
): input is TourRecord {
  return collectTourIssues(input, context).length === 0;
}

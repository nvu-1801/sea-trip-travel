"use client";
import { useId } from "react";
import { AdmMultiSelect, AdmSelect } from "./ui-select";
import { ImageField, type UploadedImage } from "./image-picker";
type Value =
  string | number | boolean | null | Value[] | { [key: string]: Value };
export type EditorValue = Value;
export type ReferenceOptions = Partial<
  Record<
    "categories" | "destinations" | "tours" | "articles" | "media",
    { value: string; label: string }[]
  >
>;
/** Small closed vocabularies rendered as a select instead of free text. */
const enumOptions: Record<string, { value: string; label: string }[]> = {
  icon: [
    { value: "calendar", label: "Lịch trình" },
    { value: "shield", label: "Bảo vệ / an tâm" },
    { value: "compass", label: "Khám phá / chỉ đường" },
    { value: "users", label: "Nhóm / gia đình" },
  ],
};
const blocks: Record<string, Value> = {
  paragraph: { type: "paragraph", text: "" },
  heading: { type: "heading", level: 2, text: "" },
  list: { type: "list", ordered: false, items: [""] },
  quote: { type: "quote", text: "" },
  callout: { type: "callout", tone: "tip", text: "" },
  image: { type: "image", alt: "", src: "" },
};
const blockLabels: Record<string, string> = {
  paragraph: "Đoạn văn",
  heading: "Tiêu đề",
  list: "Danh sách",
  quote: "Trích dẫn",
  callout: "Ghi chú nổi bật",
  image: "Hình ảnh",
};
const labels: Record<string, string> = {
  _en: "Bản dịch tiếng Anh",
  _enReviewed: "Đã duyệt bản dịch tiếng Anh",
  labelEn: "Nhãn tiếng Anh",
  workingHoursEn: "Giờ làm việc tiếng Anh",
  home: "Trang chủ",
  hero: "Khối mở đầu",
  badge: "Dòng nhãn mở đầu",
  titleLine1: "Tiêu đề dòng đầu",
  titleLine2: "Tiêu đề nhấn mạnh",
  primaryLabel: "Nhãn nút chính",
  secondaryLabel: "Nhãn nút phụ",
  primaryHref: "Đường dẫn nút chính",
  secondaryHref: "Đường dẫn nút phụ",
  caption: "Chú thích slide",
  captionEn: "Chú thích slide tiếng Anh",
  titleEn: "Tiêu đề slide tiếng Anh",
  descriptionEn: "Mô tả slide tiếng Anh",
  site: "Thông tin website",
  footer: "Chân trang",
  nav: "Điều hướng",
  common: "Nhãn dùng chung",
  explore: "Khám phá",
  regions: "Vùng miền",
  values: "Giá trị",
  consult: "Tư vấn",
  floating: "Liên hệ nhanh",
  privacy: "Chính sách bảo mật",
  id: "Mã nội dung",
  slug: "Slug (đường dẫn)",
  title: "Tiêu đề",
  name: "Tên",
  summary: "Tóm tắt",
  description: "Mô tả",
  excerpt: "Giới thiệu",
  duration: "Thời lượng",
  days: "Số ngày",
  nights: "Số đêm",
  images: "Thư viện ảnh",
  image: "Ảnh",
  src: "Đường dẫn ảnh",
  alt: "Mô tả ảnh",
  width: "Chiều rộng",
  height: "Chiều cao",
  itinerary: "Lịch trình",
  index: "Ngày thứ",
  activities: "Hoạt động",
  meals: "Bữa ăn",
  accommodation: "Lưu trú",
  places: "Điểm tham quan",
  priceFrom: "Giá từ",
  amount: "Số tiền",
  currency: "Tiền tệ",
  pricingOptions: "Bảng giá",
  adultPrice: "Giá người lớn",
  childPrice: "Giá trẻ em",
  label: "Nhãn hiển thị",
  href: "Liên kết",
  categoryIds: "Danh mục của tour",
  destinationIds: "Điểm đến",
  tourIds: "Tour ghim trên trang chủ",
  featuredSlug: "Bài viết tiêu điểm",
  picks: "Bài viết phụ",
  icon: "Biểu tượng",
  departurePoints: "Điểm khởi hành",
  returnPoints: "Điểm kết thúc",
  transport: "Phương tiện",
  tourCode: "Mã tour",
  overview: "Tổng quan",
  included: "Bao gồm",
  excluded: "Không bao gồm",
  policies: "Chính sách",
  notes: "Lưu ý",
  highlights: "Điểm nổi bật",
  tags: "Nhãn",
  seo: "SEO",
  ogImage: "Ảnh chia sẻ",
  contentStatus: "Tình trạng xác minh",
  updatedAt: "Cập nhật",
  body: "Nội dung",
  type: "Kiểu khối",
  text: "Nội dung chữ",
  items: "Danh sách",
  level: "Cấp tiêu đề",
  ordered: "Danh sách có số",
  author: "Tác giả",
  publishedAt: "Ngày đăng",
  featured: "Nổi bật",
  readingMinutes: "Phút đọc",
  cover: "Ảnh bìa",
  parentId: "Danh mục cha",
  path: "Đường dẫn",
  region: "Vùng miền",
  order: "Thứ tự",
  contact: "Thông tin liên hệ",
  hotline: "Hotline (SĐT hiển thị + nút gọi)",
  hotlineHref: "Liên kết gọi điện (tự động từ SĐT)",
  email: "Email",
  address: "Địa chỉ",
  workingHours: "Giờ làm việc",
  footerLinks: "Liên kết footer",
  socialLinks: "Mạng xã hội",
  motion: "Cho phép chuyển động nền",
  homeTitle: "Tiêu đề trang chủ (SEO)",
  homeDescription: "Mô tả trang chủ (SEO)",
  homeTitleEn: "Tiêu đề trang chủ tiếng Anh (SEO)",
  homeDescriptionEn: "Mô tả trang chủ tiếng Anh (SEO)",
  gifts: "Quà tặng",
  sourceDocuments: "Nguồn tư liệu",
  priceNote: "Ghi chú giá",
  relatedTourSlugs: "Tour liên quan",
  province: "Tỉnh / thành",
  tagline: "Thông điệp",
  landing: "Trang chủ sections",
  finder: "Bộ tìm nhanh",
  suggestions: "Gợi ý tìm kiếm",
  query: "Từ khoá tìm",
  story: "Câu chuyện hành trình",
  trips: "Các mốc thời gian",
  planning: "Trước khi lên đường (FAQ)",
  questions: "Câu hỏi thường gặp",
  q: "Câu hỏi",
  qEn: "Câu hỏi tiếng Anh",
  a: "Trả lời",
  aEn: "Trả lời tiếng Anh",
  tag: "Nhãn nhóm",
  tagEn: "Nhãn nhóm tiếng Anh",
  eyebrow: "Dòng mở đầu",
  eyebrowEn: "Dòng mở đầu tiếng Anh",
  titleA: "Tiêu đề phần 1",
  titleAEn: "Tiêu đề phần 1 tiếng Anh",
  titleB: "Tiêu đề phần 2",
  titleBEn: "Tiêu đề phần 2 tiếng Anh",
  bodyEn: "Nội dung tiếng Anh",
  footnote: "Dòng kết",
  footnoteEn: "Dòng kết tiếng Anh",
  intro: "Giới thiệu",
  introEn: "Giới thiệu tiếng Anh",
  moods: "Tâm trạng vùng miền",
  moodsEn: "Tâm trạng vùng miền tiếng Anh",
  photoSrc: "Ảnh giá trị",
  photoAlt: "Mô tả ảnh giá trị",
  photoAltEn: "Mô tả ảnh giá trị tiếng Anh",
  badgeEn: "Huy hiệu tiếng Anh",
};
const arrayDefaults: Record<string, Value> = {
  images: { src: "", alt: "Ảnh tour" },
  itinerary: {
    id: "day_new",
    index: 1,
    title: "Ngày mới",
    activities: [],
    meals: [],
    places: [],
  },
  pricingOptions: {
    id: "option_new",
    label: "Gói mới",
    adultPrice: 0,
    childPrice: 0,
  },
  footerLinks: { label: "Liên kết mới", labelEn: "", href: "/" },
  socialLinks: { label: "Mạng xã hội", href: "https://" },
  body: { type: "paragraph", text: "" },
};
export function Editor({
  value,
  onChange,
  name = "",
  locked = false,
  references = {},
  onUploadImage,
}: {
  value: Value;
  onChange: (value: Value) => void;
  name?: string;
  locked?: boolean;
  references?: ReferenceOptions;
  onUploadImage?: (file: File) => Promise<UploadedImage>;
}) {
  const id = useId();
  const title = labels[name] ?? name;
  if (enumOptions[name] && typeof value === "string")
    return (
      <div className="adm-field">
        <AdmSelect
          label={title}
          value={value}
          options={enumOptions[name]}
          onChange={(next) => onChange(next)}
        />
      </div>
    );
  const singleKind: keyof ReferenceOptions | undefined = ["parentId"].includes(name)
    ? "categories"
    : name === "featuredSlug"
      ? "articles"
      : ["src", "ogImage", "photoSrc"].includes(name)
        ? "media"
        : undefined;
  const multiKind: keyof ReferenceOptions | undefined =
    name === "categoryIds"
      ? "categories"
      : name === "destinationIds"
        ? "destinations"
        : name === "relatedTourSlugs" || name === "tourIds"
          ? "tours"
          : name === "picks"
            ? "articles"
            : undefined;
  if (multiKind && Array.isArray(value) && references[multiKind]) {
    const strings = value.filter((v): v is string => typeof v === "string");
    // Multi-select đẹp dạng chip cho các liên kết nhiều-một.
    return (
      <AdmMultiSelect
        label={title}
        values={strings}
        options={references[multiKind]!}
        placeholder={`Tìm để thêm vào ${title.toLowerCase()}…`}
        onChange={(next) => onChange(next)}
      />
    );
  }
  if (
    (typeof value === "string" || value === null) &&
    singleKind &&
    references[singleKind]
  ) {
    const opts = references[singleKind]!;
    if (singleKind === "media" && onUploadImage) {
      return (
        <div className="adm-field">
          <ImageField
            sizeGuide={
              name === "ogImage"
                ? "Ảnh chia sẻ: 1200 × 630 px, tỷ lệ khoảng 1.91:1."
                : name === "photoSrc"
                  ? "Ảnh section: từ 1600 × 1200 px. Giữ chủ thể ở giữa để cắt đẹp trên điện thoại."
                  : "Ảnh nội dung, bài viết hoặc danh mục: từ 1600 × 1200 px; thẻ dọc nên dùng 1200 × 1600 px. Giữ chủ thể ở giữa."
            }
            label={title}
            value={typeof value === "string" ? value : ""}
            media={opts}
            onUpload={onUploadImage}
            onChange={(next) => onChange(next)}
          />
        </div>
      );
    }
    return (
      <div className="adm-field">
        <AdmSelect
          label={title}
          value={typeof value === "string" ? value : ""}
          options={
            typeof value === "string" && value && !opts.some((o) => o.value === value)
              ? [...opts, { value, label: `${value} (đang dùng)` }]
              : opts
          }
          placeholder={name === "parentId" ? "Danh mục gốc" : "Chọn một mục…"}
          preview={singleKind === "media" ? (v) => (v.startsWith("/") ? v : null) : undefined}
          onChange={(next) => onChange(next || (name === "parentId" ? null : ""))}
        />
        {name === "hotlineHref" && (
          <small>Tự động chuẩn hoá từ SĐT — bạn chỉ cần sửa mục Hotline.</small>
        )}
      </div>
    );
  }
  const reindex = (items: Value[]) =>
    name === "itinerary"
      ? items.map((item, i) =>
          item && typeof item === "object" && !Array.isArray(item)
            ? { ...item, index: i + 1 }
            : item,
        )
      : items;
  if (value === null || value === undefined)
    return (
      <div className="adm-field">
        <label>
          {title} <small>Chưa có thông tin</small>
        </label>
        <button
          type="button"
          onClick={() =>
            onChange(
              name === "priceFrom"
                ? { amount: 0, currency: "VND" }
                : [
                      "duration",
                      "seo",
                      "image",
                      "contact",
                      "socialLinks",
                    ].includes(name)
                  ? {}
                  : "",
            )
          }
        >
          Bổ sung
        </button>
      </div>
    );
  if (Array.isArray(value))
    return (
      <fieldset className="adm-group">
        <legend>
          {title} <span>{value.length}</span>
        </legend>
        {value.map((item, index) => (
          <div className="adm-array" key={index}>
            <div className="adm-array-toolbar">
              <span>{index + 1}</span>
              <button
                type="button"
                aria-label={`Đưa ${title} ${index + 1} lên`}
                disabled={index === 0}
                onClick={() => {
                  const next = [...value];
                  [next[index - 1], next[index]] = [
                    next[index],
                    next[index - 1],
                  ];
                  onChange(reindex(next));
                }}
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={`Xóa ${title} ${index + 1}`}
                onClick={() =>
                  onChange(reindex(value.filter((_, i) => i !== index)))
                }
              >
                Bỏ
              </button>
            </div>
            <Editor
              value={item}
              name={typeof item === "object" ? "" : name}
              references={references}
              onUploadImage={onUploadImage}
              onChange={(next) =>
                onChange(value.map((old, i) => (i === index ? next : old)))
              }
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const next = structuredClone(arrayDefaults[name] ?? value[0] ?? "");
            if (next && typeof next === "object" && !Array.isArray(next)) {
              if ("id" in next)
                next.id = `item_${crypto.randomUUID().slice(0, 8)}`;
              if ("index" in next) next.index = value.length + 1;
            }
            onChange([...value, next]);
          }}
        >
          + Thêm {title.toLowerCase()}
        </button>
      </fieldset>
    );
  if (typeof value === "object")
    return (
      <div className="adm-object">
        {typeof value.alt === "string" && (
          <button
            type="button"
            onClick={() => {
              if ("src" in value) {
                const next = { ...value };
                delete next.src;
                onChange(next);
              } else onChange({ ...value, src: "" });
            }}
          >
            {"src" in value ? "Không dùng ảnh này" : "Chọn ảnh từ thư viện"}
          </button>
        )}
        {typeof value.type === "string" && blocks[value.type] && (
          <label className="adm-field">
            Loại khối nội dung
            <select
              value={value.type}
              onChange={(e) => {
                const next = structuredClone(blocks[e.target.value]);
                if (
                  next &&
                  typeof next === "object" &&
                  !Array.isArray(next) &&
                  "text" in next &&
                  typeof value.text === "string"
                )
                  next.text = value.text;
                onChange(next);
              }}
            >
              {Object.keys(blocks).map((kind) => (
                <option key={kind} value={kind}>
                  {blockLabels[kind]}
                </option>
              ))}
            </select>
          </label>
        )}
        {Object.entries(value)
          .filter(
            ([key]) =>
              !(
                key === "type" &&
                typeof value.type === "string" &&
                blocks[value.type]
              ),
          )
          .map(([key, child]) =>
            typeof child === "object" && child !== null ? (
              <details
                key={key}
                open={
                  name === "" &&
                  ["contact", "duration", "priceFrom"].includes(key)
                }
              >
                <summary>{labels[key] ?? key}</summary>
                <Editor
                  value={child}
                  name={key}
                  references={references}
                  onUploadImage={onUploadImage}
                  onChange={(next) => onChange({ ...value, [key]: next })}
                />
              </details>
            ) : (
              <Editor
                key={key}
                value={child}
                name={key}
                references={references}
                onUploadImage={onUploadImage}
                locked={
                  key === "id" ||
                  key === "updatedAt" ||
                  key === "slug" ||
                  key === "path"
                    ? locked
                    : false
                }
                onChange={(next) => onChange({ ...value, [key]: next })}
              />
            ),
          )}
      </div>
    );
  if (typeof value === "boolean")
    return (
      <label className="adm-toggle">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {title}
      </label>
    );
  return (
    <div className="adm-field">
      <label htmlFor={id}>{title}</label>
      {typeof value === "number" ? (
        <input
          id={id}
          type="number"
          value={value}
          disabled={locked}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      ) : (typeof value === "string" ? value.length > 90 : false) ||
        [
          "summary",
          "description",
          "excerpt",
          "text",
          "message",
          "disclaimer",
        ].includes(name) ? (
        <textarea
          id={id}
          value={value}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          value={value}
          disabled={locked}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

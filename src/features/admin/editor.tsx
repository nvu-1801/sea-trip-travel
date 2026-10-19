"use client";
import { useId } from "react";
type Value =
  string | number | boolean | null | Value[] | { [key: string]: Value };
export type EditorValue = Value;
export type ReferenceOptions = Partial<
  Record<
    "categories" | "destinations" | "tours" | "media",
    { value: string; label: string }[]
  >
>;
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
  hotline: "Hotline",
  hotlineHref: "Liên kết gọi điện",
  email: "Email",
  address: "Địa chỉ",
  workingHours: "Giờ làm việc",
  footerLinks: "Liên kết footer",
  socialLinks: "Mạng xã hội",
  motion: "Cho phép chuyển động nền",
  gifts: "Quà tặng",
  sourceDocuments: "Nguồn tư liệu",
  priceNote: "Ghi chú giá",
  relatedTourSlugs: "Tour liên quan",
  province: "Tỉnh / thành",
  tagline: "Thông điệp",
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
}: {
  value: Value;
  onChange: (value: Value) => void;
  name?: string;
  locked?: boolean;
  references?: ReferenceOptions;
}) {
  const id = useId();
  const title = labels[name] ?? name;
  const referenceKind: keyof ReferenceOptions | undefined = [
    "categoryIds",
    "parentId",
  ].includes(name)
    ? "categories"
    : name === "destinationIds"
      ? "destinations"
      : name === "relatedTourSlugs"
        ? "tours"
        : ["src", "ogImage"].includes(name)
          ? "media"
          : undefined;
  if (
    (typeof value === "string" || value === null) &&
    referenceKind &&
    references[referenceKind]
  )
    return (
      <label className="adm-field" htmlFor={id}>
        {title}
        <select
          id={id}
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value || (name === "parentId" ? null : ""))
          }
        >
          <option value="">
            {name === "parentId" ? "Danh mục gốc" : "Chọn một mục…"}
          </option>
          {typeof value === "string" &&
            value &&
            !references[referenceKind]!.some(
              (option) => option.value === value,
            ) && <option value={value}>{value}</option>}
          {references[referenceKind]!.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  const reindex = (items: Value[]) =>
    name === "itinerary"
      ? items.map((item, i) =>
          item && typeof item === "object" && !Array.isArray(item)
            ? { ...item, index: i + 1 }
            : item,
        )
      : items;
  if (value === null)
    return (
      <div className="adm-field">
        <label>
          {title} <small>Chưa có thông tin</small>
        </label>
        <button
          type="button"
          onClick={() =>
            onChange(name === "priceFrom" ? { amount: 0, currency: "VND" } : "")
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
          ＋ Thêm {title.toLowerCase()}
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
                  onChange={(next) => onChange({ ...value, [key]: next })}
                />
              </details>
            ) : (
              <Editor
                key={key}
                value={child}
                name={key}
                references={references}
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
      ) : value.length > 90 ||
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

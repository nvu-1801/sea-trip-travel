"use client";
import { useId } from "react";
import { MediaField } from "./media-field";
import { AdmMultiSelect, AdmSelect } from "./ui-select";
type Value =
  string | number | boolean | null | Value[] | { [key: string]: Value };
export type EditorValue = Value;
export type ReferenceOptions = Partial<
  Record<
    "categories" | "destinations" | "tours" | "media" | "tourIds" | "articles",
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
export const editorLabels: Record<string, string> = {
  heroEyebrow: "Dòng mở đầu trang",
  heroTitle: "Tiêu đề đầu trang",
  heroDescription: "Mô tả đầu trang",
  channelHotline: "Tên kênh gọi điện",
  channelEmail: "Tên kênh email",
  channelAddress: "Tên kênh địa chỉ",
  emailNote: "Ghi chú email",
  addressNote: "Ghi chú địa chỉ",
  afterTitle: "Tiêu đề sau khi gửi yêu cầu",
  outOfHours: "Thông báo ngoài giờ làm việc",
  formEyebrow: "Dòng mở đầu biểu mẫu",
  formTitle: "Tiêu đề biểu mẫu",
  formDescription: "Giới thiệu biểu mẫu",
  fields: "Tên các ô nhập",
  hints: "Hướng dẫn nhập",
  placeholders: "Ví dụ trong ô nhập",
  consent: "Nội dung đồng ý liên hệ",
  fullName: "Họ tên",
  phone: "Số điện thoại",
  interest: "Tour / điểm đến quan tâm",
  travelDate: "Ngày dự kiến",
  partySize: "Số người",
  message: "Nội dung yêu cầu",
  optional: "Nhãn không bắt buộc",
  company: "Tên công ty",
  pre: "Nội dung trước liên kết",
  post: "Nội dung sau liên kết",
  link: "Chữ trên liên kết",
  hint: "Hướng dẫn bổ sung",
  submit: "Nút gửi yêu cầu",
  submitting: "Thông báo đang gửi",
  submittingSr: "Thông báo đang gửi cho trình đọc màn hình",
  errorSr: "Thông báo lỗi cho trình đọc màn hình",
  leaveWarning: "Cảnh báo khi rời biểu mẫu",
  genericError: "Thông báo gửi thất bại",
  networkError: "Thông báo mất kết nối",
  success: "Thông báo gửi thành công",
  nextStep: "Hướng dẫn bước tiếp theo",
  referenceHint: "Hướng dẫn lưu mã yêu cầu",
  requestId: "Tên mã yêu cầu",
  errors: "Thông báo lỗi nhập liệu",
  indexTitle: "Tiêu đề trang danh sách",
  indexDescription: "Mô tả trang danh sách",
  featuredSr: "Nhãn bài nổi bật cho trình đọc màn hình",
  otherEyebrow: "Dòng mở đầu bài viết khác",
  otherTitle: "Tiêu đề bài viết khác",
  toToursEyebrow: "Dòng mở đầu gợi ý tour",
  toToursTitle: "Tiêu đề gợi ý tour",
  toToursDescription: "Giới thiệu gợi ý tour",
  consultTitle: "Tiêu đề mời tư vấn",
  consultDescription: "Giới thiệu mời tư vấn",
  featuredBadge: "Nhãn nổi bật",
  articleNotFoundTitle: "Tiêu đề khi không tìm thấy bài",
  articleNotFoundDescription: "Mô tả khi không tìm thấy bài",
  relatedToursEyebrow: "Dòng mở đầu tour liên quan",
  relatedToursTitle: "Tiêu đề tour liên quan",
  relatedToursDescription: "Giới thiệu tour liên quan",
  relatedArticlesEyebrow: "Dòng mở đầu bài liên quan",
  relatedArticlesTitle: "Tiêu đề bài liên quan",
  allGuides: "Liên kết tất cả cẩm nang",
  askQuestionPre: "Nội dung trước liên kết hỏi đáp",
  askQuestionLink: "Liên kết gửi câu hỏi",
  askQuestionPost: "Nội dung sau liên kết hỏi đáp",
  articleConsultTitle: "Tiêu đề tư vấn cuối bài",
  articleConsultDescription: "Lời mời tư vấn cuối bài",
  categoriesTitle: "Tiêu đề cột danh mục",
  categoriesAria: "Tên danh mục cho trình đọc màn hình",
  infoTitle: "Tiêu đề cột thông tin",
  infoAria: "Tên liên kết cho trình đọc màn hình",
  contactTitle: "Tiêu đề cột liên hệ",
  copyright: "Dòng bản quyền (giữ {year}, {name})",
  disclaimer: "Ghi chú cuối trang",
  primaryNavAria: "Tên menu cho trình đọc màn hình",
  primaryNavMobileAria: "Tên menu trên điện thoại",
  menuLabel: "Tên menu",
  openMenu: "Nút mở menu",
  closeMenu: "Nút đóng menu",

  enabled: "Hiển thị trên website",
  navigation: "Các mục menu đầu trang",
  children: "Menu con",
  logoSrc: "Logo thương hiệu",
  labelKey: "Mục gốc (dùng cho giao diện)",
  metaTitle: "Tiêu đề kết quả tìm kiếm",
  metaDescription: "Mô tả kết quả tìm kiếm",
  subtitle: "Tiêu đề phụ",
  ctaLabel: "Chữ trên nút",
  ctaHref: "Trang đích",
  placeholder: "Gợi ý trong ô nhập",
  destinationLabel: "Nhãn điểm đến",
  durationLabel: "Nhãn thời lượng",
  flexibleLabel: "Nhãn chưa chọn ngày",
  longDuration: "Nhãn từ 4 ngày",
  suggestionsTitle: "Tiêu đề điểm đến gợi ý",
  durationsTitle: "Tiêu đề chọn số ngày",
  helpTitle: "Tiêu đề hỗ trợ",
  helpBody: "Lời giới thiệu hỗ trợ",
  helpCta: "Nút hỗ trợ",
  guidesCta: "Nút xem cẩm nang",
  durations: "Các lựa chọn thời lượng",
  tourIds: "Tour được chọn (theo thứ tự)",
  featuredSlug: "Bài viết chính",
  picks: "Các bài viết được chọn",
  principles: "Các giá trị cam kết",
  icon: "Biểu tượng",
  cta: "Chữ trên nút",
  ctaEn: "Chữ trên nút tiếng Anh",
  ctaDescription: "Mô tả lời mời",
  ctaDescriptionEn: "Mô tả lời mời tiếng Anh",
  steps: "Các bước hướng dẫn",
  stepsEn: "Các bước hướng dẫn tiếng Anh",
  titleEn: "Tiêu đề tiếng Anh",
  summaryEn: "Tóm tắt tiếng Anh",
  bodyEn: "Nội dung tiếng Anh",
  translationReviewed: "Đã duyệt bản dịch tiếng Anh",

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
  gifts: "Quà tặng",
  sourceDocuments: "Nguồn tư liệu",
  tone: "Kiểu ghi chú",
  cite: "Nguồn trích dẫn",
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
  navigation: {
    labelKey: "home",
    label: "Mục menu mới",
    labelEn: "",
    href: "/lien-he",
    children: [],
  },
  children: {
    labelKey: "home",
    label: "Menu con mới",
    labelEn: "",
    href: "/lien-he",
  },
  questions: {
    q: "Câu hỏi mới",
    qEn: "",
    a: "Câu trả lời",
    aEn: "",
    tag: "",
    tagEn: "",
  },
  suggestions: { label: "Điểm đến", query: "diem den" },
  trips: {
    days: "1",
    title: "Hành trình mới",
    titleEn: "",
    body: "Mô tả hành trình",
    bodyEn: "",
  },
  principles: {
    title: "Cam kết mới",
    titleEn: "",
    body: "Nội dung cam kết",
    bodyEn: "",
  },
  bodyEn: { type: "paragraph", text: "" },

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
  const title = editorLabels[name] ?? name;
  const singleKind: keyof ReferenceOptions | undefined = ["parentId"].includes(
    name,
  )
    ? "categories"
    : name === "featuredSlug"
      ? "articles"
      : ["src", "ogImage", "photoSrc", "logoSrc"].includes(name)
        ? "media"
        : undefined;
  const multiKind: keyof ReferenceOptions | undefined =
    name === "tourIds"
      ? "tourIds"
      : name === "picks"
        ? "articles"
        : name === "categoryIds"
          ? "categories"
          : name === "destinationIds"
            ? "destinations"
            : name === "relatedTourSlugs"
              ? "tours"
              : undefined;
  const choices: Record<string, { value: string; label: string }[]> = {
    region: [
      { value: "quy-nhon-phu-yen", label: "Quy Nhơn – Phú Yên" },
      { value: "mien-bac", label: "Miền Bắc" },
      { value: "mien-trung", label: "Miền Trung" },
      { value: "mien-nam", label: "Miền Nam" },
      { value: "tay-nguyen", label: "Tây Nguyên" },
    ],
    icon: [
      { value: "calendar", label: "Lịch trình" },
      { value: "shield", label: "Bảo đảm" },
      { value: "compass", label: "Khám phá" },
      { value: "users", label: "Đội ngũ" },
    ],
    contentStatus: [
      { value: "demo", label: "Chưa xác minh" },
      { value: "verified", label: "Đã xác minh" },
    ],
    currency: [{ value: "VND", label: "Việt Nam đồng (VND)" }],
    tone: [
      { value: "info", label: "Thông tin" },
      { value: "tip", label: "Gợi ý" },
      { value: "warning", label: "Lưu ý" },
    ],
  };
  if (choices[name] && typeof value === "string")
    return (
      <div className="adm-field">
        <label htmlFor={id}>{title}</label>
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {choices[name].map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    );
  if (singleKind === "media" && (typeof value === "string" || value === null)) {
    return (
      <MediaField
        label={title}
        value={value ?? ""}
        options={references.media ?? []}
        onChange={onChange}
      />
    );
  }
  if (multiKind && Array.isArray(value) && references[multiKind]) {
    const strings = value.filter((v): v is string => typeof v === "string");
    // Multi-select đẹp dạng chip cho các liên kết nhiều-một.
    return (
      <div>
        <AdmMultiSelect
          label={title}
          values={strings}
          options={references[multiKind]!}
          placeholder={`Tìm để thêm vào ${title.toLowerCase()}…`}
          onChange={(next) => onChange(next)}
        />
        {["tourIds", "picks"].includes(name) &&
          strings.map((item, index) => (
            <div className="adm-array-toolbar" key={item}>
              <span>
                {index + 1}.{" "}
                {references[multiKind]!.find((option) => option.value === item)
                  ?.label ?? "Nội dung không còn tồn tại"}
              </span>
              <button
                type="button"
                disabled={index === 0}
                aria-label={`Đưa mục ${index + 1} lên`}
                onClick={() => {
                  const next = [...strings];
                  [next[index - 1], next[index]] = [
                    next[index],
                    next[index - 1],
                  ];
                  onChange(next);
                }}
              >
                ↑
              </button>
            </div>
          ))}
      </div>
    );
  }
  if (
    (typeof value === "string" || value === null) &&
    singleKind &&
    references[singleKind]
  ) {
    const opts = references[singleKind]!;
    return (
      <div className="adm-field">
        <AdmSelect
          label={title}
          value={typeof value === "string" ? value : ""}
          options={
            typeof value === "string" &&
            value &&
            !opts.some((o) => o.value === value)
              ? [...opts, { value, label: `${value} (đang dùng)` }]
              : opts
          }
          placeholder={name === "parentId" ? "Danh mục gốc" : "Chọn một mục…"}
          preview={
            singleKind === "media"
              ? (v) => (v.startsWith("/") ? v : null)
              : undefined
          }
          onChange={(next) =>
            onChange(next || (name === "parentId" ? null : ""))
          }
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
                aria-label={`Đưa ${title} ${index + 1} xuống`}
                disabled={index === value.length - 1}
                onClick={() => {
                  const next = [...value];
                  [next[index + 1], next[index]] = [
                    next[index],
                    next[index + 1],
                  ];
                  onChange(reindex(next));
                }}
              >
                ↓
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
              !["labelKey", "id", "updatedAt", "hotlineHref"].includes(key) &&
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
                <summary>{editorLabels[key] ?? key}</summary>
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

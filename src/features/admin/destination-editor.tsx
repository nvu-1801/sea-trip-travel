"use client";

import {
  forwardRef,
  useImperativeHandle,
  useState,
  type ReactNode,
} from "react";
import { AssetImage } from "@/components/ui/asset-image";
import { REGION_LABELS, type Region } from "@/domain/common";
import { ImageField, type UploadedImage } from "./image-picker";
import { AdmSelect } from "./ui-select";
import { slugify } from "@/lib/slugify";
import { isPlaceholderSlug } from "@/lib/public-slug";
import {
  Field,
  NumberField,
  TextField,
  Toggle,
  fieldId,
  numberOf,
  rec,
  textOf,
  type AdminRecord,
} from "./tour-editor-fields";

/** Mirrors MAX_HOME_DESTINATIONS without pulling zod into the client bundle. */
const HOME_DESTINATION_LIMIT = 3;

type Option = { value: string; label: string };
type DestinationSection =
  "general" | "region" | "media" | "home" | "translations" | "advanced";

type DestinationIssue = {
  path: string;
  message: string;
  section: DestinationSection;
};

type Sibling = {
  id: string;
  data: AdminRecord;
  state?: string;
};

const SECTION_TITLES: Record<DestinationSection, string> = {
  general: "Thông tin địa danh",
  region: "Vùng miền & thứ tự",
  media: "Ảnh & nội dung hiển thị",
  home: "Khối Khám phá trang chủ",
  translations: "Bản dịch tiếng Anh",
  advanced: "Nâng cao",
};

export type DestinationEditorHandle = {
  /** Returns false (and jumps to the first issue) when the draft is invalid. */
  validate: () => boolean;
};

const REGIONS = (Object.keys(REGION_LABELS) as Region[]).map((value) => ({
  value,
  label: REGION_LABELS[value],
}));

const CONTENT_STATUS_OPTIONS = [
  { value: "demo", label: "Bản nháp nội dung (demo) — chưa xác minh" },
  { value: "verified", label: "Đã xác minh (verified)" },
];

function imageOf(data: AdminRecord): AdminRecord {
  return rec(data.image);
}

function homeOrderOf(data: AdminRecord): number {
  const order = numberOf(data.homeOrder);
  return order > 0 ? order : Number.MAX_SAFE_INTEGER;
}

function regionOrderOf(data: AdminRecord): number {
  return numberOf(data.order);
}

/** Destinations enabled for the home block, in the exact public order. */
function homeOrdered(
  current: { id: string; data: AdminRecord },
  siblings: readonly Sibling[],
): { id: string; data: AdminRecord }[] {
  return [
    ...siblings
      .filter(
        (row) =>
          row.id !== current.id &&
          row.state !== "deleted" &&
          row.data.showOnHome === true,
      )
      .map((row) => ({ id: row.id, data: row.data })),
    ...(current.data.showOnHome === true ? [current] : []),
  ].sort(
    (a, b) =>
      homeOrderOf(a.data) - homeOrderOf(b.data) ||
      regionOrderOf(a.data) - regionOrderOf(b.data) ||
      String(a.data.name ?? a.id).localeCompare(
        String(b.data.name ?? b.id),
        "vi",
      ),
  );
}

function homeExploreHref(name: string): string {
  const query = name.split(" – ")[0].split(" - ")[0];
  return `/vi/tim-tour?q=${encodeURIComponent(query)}`;
}

function collectIssues(
  data: AdminRecord,
  context: { slotsFull: boolean; enabled: boolean },
): DestinationIssue[] {
  const issues: DestinationIssue[] = [];
  const add = (path: string, message: string) => {
    const first = path.split(".")[0];
    const section: DestinationSection =
      first === "image"
        ? "media"
        : first === "showOnHome" || first === "homeOrder"
          ? "home"
          : first === "region" || first === "order"
            ? "region"
            : first === "slug" || first === "id" || first === "contentStatus"
              ? "advanced"
              : "general";
    issues.push({ path, message, section });
  };

  if (!textOf(data.name).trim()) add("name", "Tên địa danh không được để trống.");
  if (!textOf(data.summary).trim())
    add("summary", "Tóm tắt không được để trống.");
  else if (textOf(data.summary).length > 180)
    add("summary", "Tóm tắt tối đa 180 ký tự.");
  if (!(Object.keys(REGION_LABELS) as string[]).includes(textOf(data.region)))
    add("region", "Chọn vùng miền cho điểm đến.");
  if (!Number.isFinite(numberOf(data.order)) || numberOf(data.order) < 0)
    add("order", "Thứ tự trong vùng phải là số từ 0 trở lên.");

  const slug = textOf(data.slug);
  if (!slug || !/^[a-z0-9-]+$/.test(slug))
    add("slug", "Slug chỉ dùng chữ thường, số và dấu gạch ngang.");

  const image = imageOf(data);
  const src = textOf(image.src);
  if (src) {
    if (!src.startsWith("/") || src.startsWith("//") || src.includes(".."))
      add("image.src", "Đường dẫn ảnh phải bắt đầu bằng / và không chứa ..");
    if (!textOf(image.alt).trim())
      add("image.alt", "Ảnh đã chọn cần mô tả (alt).");
  }

  if (data.showOnHome === true && !context.enabled && context.slotsFull)
    add(
      "showOnHome",
      `Đã đủ ${HOME_DESTINATION_LIMIT}/${HOME_DESTINATION_LIMIT} điểm cho khối Khám phá. Tắt một điểm khác trước.`,
    );

  return issues;
}

export const DestinationEditor = forwardRef<
  DestinationEditorHandle,
  {
    value: AdminRecord;
    onChange: (value: AdminRecord) => void;
    media: Option[];
    onUploadImage?: (file: File) => Promise<UploadedImage>;
    /** Every destination row, used to preview the home block order. */
    siblings?: readonly Sibling[];
    /** The record's lifecycle state, for "draft will not show yet" copy. */
    recordState?: string;
    /** Slug/id are locked once the record has a saved revision. */
    locked?: boolean;
  }
>(function DestinationEditor(
  {
    value,
    onChange,
    media,
    onUploadImage,
    siblings = [],
    recordState,
    locked = false,
  },
  ref,
) {
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [previewLocale, setPreviewLocale] = useState<"vi" | "en">("vi");

  const data = rec(value);
  const name = textOf(data.name);
  const summary = textOf(data.summary);
  const province = textOf(data.province);
  const region = textOf(data.region);
  const image = imageOf(data);
  const imageSrc = textOf(image.src);
  const imageAlt = textOf(image.alt);
  const showOnHome = data.showOnHome === true;
  const homeOrder = numberOf(data.homeOrder);
  const en = rec(data._en);
  const hasEnglish = Boolean(data._en && typeof data._en === "object");
  const reviewed = data._enReviewed === true;
  const previewName = previewLocale === "en" ? textOf(en.name) || name : name;
  const previewSummary =
    previewLocale === "en" ? textOf(en.summary) || summary : summary;
  const previewProvince =
    previewLocale === "en" ? textOf(en.province) || province : province;

  const otherEnabled = siblings.filter(
    (row) =>
      row.id !== textOf(data.id) &&
      row.state !== "deleted" &&
      row.data.showOnHome === true,
  );
  const slotsFull = otherEnabled.length >= HOME_DESTINATION_LIMIT;
  const enabledCount = otherEnabled.length + (showOnHome ? 1 : 0);
  const ordered = homeOrdered(
    { id: textOf(data.id) || "draft", data },
    siblings,
  );
  const slot =
    showOnHome && ordered.length
      ? ordered.findIndex(
          (row) => row.id === (textOf(data.id) || "draft"),
        ) + 1
      : 0;
  const nextHomeOrder =
    Math.max(0, ...otherEnabled.map((row) => numberOf(row.data.homeOrder))) + 1;

  const issues = collectIssues(data, {
    slotsFull,
    enabled: showOnHome,
  });
  const issueByPath = new Map<string, string>();
  for (const issue of issues)
    if (!issueByPath.has(issue.path)) issueByPath.set(issue.path, issue.message);
  const showError = (path: string) =>
    attempted || touched.has(path) ? issueByPath.get(path) : undefined;
  const booked = (section: DestinationSection) =>
    issues.filter((issue) => issue.section === section).length;

  const update = (patch: AdminRecord) =>
    onChange({ ...data, ...patch });
  const setEnglish = (patch: AdminRecord) => {
    const next: AdminRecord = { ...en, ...patch };
    for (const key of Object.keys(next))
      if (next[key] === undefined) delete next[key];
    update({ _en: next });
  };
  const markTouched = (path: string) =>
    setTouched((current) => new Set(current).add(path));

  function jumpTo(issue: DestinationIssue) {
    const element = document.getElementById(
      `destination-section-${issue.section}`,
    );
    if (element instanceof HTMLDetailsElement) element.open = true;
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
    const field = document.getElementById(fieldId(issue.path));
    window.setTimeout(() => field?.focus({ preventScroll: true }), 260);
  }

  useImperativeHandle(ref, () => ({
    validate() {
      setAttempted(true);
      if (issues.length > 0) {
        jumpTo(issues[0]);
        return false;
      }
      return true;
    },
  }));

  function setImage(nextSrc: string, uploadedAlt?: string) {
    const current = imageOf(data);
    const next = { ...current };
    if (nextSrc) next.src = nextSrc;
    else delete next.src;
    const alt = textOf(next.alt);
    if (uploadedAlt && !alt) next.alt = uploadedAlt;
    if (!next.src && !next.alt && !next.caption && !next.width && !next.height) {
      const copy = { ...data };
      delete copy.image;
      onChange(copy);
      return;
    }
    update({ image: next });
  }

  function setAlt(nextAlt: string) {
    const next: AdminRecord = { ...imageOf(data), alt: nextAlt };
    if (!next.src && !nextAlt) {
      const copy = { ...data };
      delete copy.image;
      onChange(copy);
      return;
    }
    update({ image: next });
  }

  const nav: { key: DestinationSection; label: string; count?: number }[] = [
    { key: "general", label: "Thông tin", count: 3 },
    { key: "region", label: "Vùng miền", count: 2 },
    { key: "media", label: "Ảnh & hiển thị", count: imageSrc ? 1 : 0 },
    {
      key: "home",
      label: "Khám phá",
      count: showOnHome ? slot || 1 : 0,
    },
    { key: "translations", label: "Bản dịch", count: hasEnglish ? 1 : 0 },
    { key: "advanced", label: "Nâng cao" },
  ];

  const previewImage = imageSrc
    ? {
        src: imageSrc,
        alt: imageAlt || name || "Điểm đến",
        width: numberOf(image.width) || undefined,
        height: numberOf(image.height) || undefined,
      }
    : undefined;
  const previewHref = homeExploreHref(name);
  const previewHrefLabel = decodeURIComponent(previewHref);

  return (
    <div className="adm-tour-editor">
      <nav className="adm-tour-nav" aria-label="Các phần nội dung điểm đến">
        <p className="adm-eyebrow">Nội dung điểm đến</p>
        {nav.map((item) => (
          <a
            key={item.key}
            href={`#destination-section-${item.key}`}
            onClick={(event) => {
              event.preventDefault();
              const section = document.getElementById(
                `destination-section-${item.key}`,
              );
              if (section instanceof HTMLDetailsElement) section.open = true;
              section?.scrollIntoView({ behavior: "smooth", block: "start" });
              history.replaceState(
                null,
                "",
                `#destination-section-${item.key}`,
              );
            }}
          >
            <span className="adm-tour-nav-label">{item.label}</span>
            {booked(item.key) > 0 ? (
              <span className="adm-error-pill">{booked(item.key)}</span>
            ) : item.count ? (
              <span className="adm-tour-nav-count">{item.count}</span>
            ) : null}
          </a>
        ))}
        <div className="adm-tour-nav-actions">
          <button
            type="button"
            className="adm-ghost-link"
            onClick={() => {
              setAttempted(true);
              if (issues[0]) jumpTo(issues[0]);
            }}
          >
            Kiểm tra nội dung
          </button>
        </div>
      </nav>

      <div className="adm-tour-form">
        {attempted && issues.length > 0 ? (
          <div className="adm-error-summary" role="alert">
            <strong>{issues.length} mục cần sửa trước khi lưu</strong>
            <ul>
              {issues.slice(0, 8).map((issue) => (
                <li key={`${issue.path}-${issue.message}`}>
                  <button type="button" onClick={() => jumpTo(issue)}>
                    {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Section
          id="general"
          number={1}
          title={SECTION_TITLES.general}
          where="tên, tỉnh/thành và tóm tắt trên thẻ Khám phá, thẻ tour"
          errors={booked("general")}
        >
          <div className="adm-tour-grid-2">
            <TextField
              path="name"
              label="Tên địa danh"
              value={name}
              required
              error={showError("name")}
              hint="Ví dụ: Quy Nhơn, Kỳ Co – Eo Gió. Tên này cũng hiện trên thẻ tour."
              onBlur={() => markTouched("name")}
              onChange={(next) => update({ name: next })}
            />
            <TextField
              path="province"
              label="Tỉnh / thành (tuỳ chọn)"
              value={province}
              hint="Hiện ngay dưới tên trên thẻ Khám phá."
              onBlur={() => markTouched("province")}
              onChange={(next) => {
                const nextValue = { ...data };
                if (next.trim()) nextValue.province = next;
                else delete nextValue.province;
                onChange(nextValue);
              }}
            />
          </div>
          <TextField
            path="summary"
            label="Tóm tắt hiển thị"
            value={summary}
            required
            multiline
            rows={3}
            maxLength={180}
            error={showError("summary")}
            hint="Một câu giới thiệu ngắn. Dùng trên thẻ Khám phá và thẻ tour."
            onBlur={() => markTouched("summary")}
            onChange={(next) => update({ summary: next })}
          />
        </Section>

        <Section
          id="region"
          number={2}
          title={SECTION_TITLES.region}
          where="nhóm điểm đến ở trang tour và bộ tìm kiếm"
          errors={booked("region")}
        >
          <div className="adm-tour-grid-2">
            <div className={`adm-field${showError("region") ? " adm-field--invalid" : ""}`}>
              <AdmSelect
                label="Vùng miền"
                value={region}
                options={REGIONS}
                placeholder="Chọn vùng miền…"
                showValues={false}
                onChange={(next) => {
                  update({ region: next });
                  markTouched("region");
                }}
              />
              <small className="adm-hint">
                Chỉ dùng để nhóm điểm và sắp xếp trong vùng — không quyết định
                điểm có lên khối Khám phá hay không.
              </small>
              {showError("region") ? (
                <p className="adm-field-error" role="alert">
                  {showError("region")}
                </p>
              ) : null}
            </div>
            <NumberField
              path="order"
              label="Thứ tự trong vùng"
              value={numberOf(data.order)}
              min={0}
              hint="Số nhỏ hơn hiện trước trong vùng. Không ảnh hưởng thứ tự Khám phá."
              error={showError("order")}
              onBlur={() => markTouched("order")}
              onChange={(next) => update({ order: next })}
            />
          </div>
        </Section>

        <Section
          id="media"
          number={3}
          title={SECTION_TITLES.media}
          where="ảnh và mô tả dùng trên thẻ Khám phá + thẻ tour"
          errors={booked("media")}
        >
          <div className="adm-preview-lang" role="group" aria-label="Ngôn ngữ thẻ xem trước">
            <button
              type="button"
              aria-pressed={previewLocale === "vi"}
              onClick={() => setPreviewLocale("vi")}
            >
              Tiếng Việt
            </button>
            <button
              type="button"
              aria-pressed={previewLocale === "en"}
              onClick={() => setPreviewLocale("en")}
            >
              English
            </button>
          </div>
          <div className="adm-destination-media">
            <ImageField
              sizeGuide="Ảnh điểm đến: nên từ 1600 × 1200 px (4:3). Giữ cảnh chính ở giữa để phù hợp nhiều khung cắt."
              label="Ảnh đại diện"
              value={imageSrc}
              previewAlt={imageAlt}
              media={media}
              onUpload={onUploadImage}
              whereUsed="Ảnh hiện trên thẻ Khám phá trang chủ, thẻ tour và kết quả tìm kiếm."
              alt={imageAlt}
              onAltChange={setAlt}
              altRequired
              altHint="Mô tả cảnh trong ảnh. Bắt buộc khi đã chọn ảnh; dùng cho trình đọc màn hình và khi ảnh lỗi."
              onChange={(src, uploadedAlt) => setImage(src, uploadedAlt)}
              onRemove={() => setImage("")}
            />
            {showError("image.src") || showError("image.alt") ? (
              <p className="adm-field-error" role="alert">
                {showError("image.src") || showError("image.alt")}
              </p>
            ) : null}
            <div className="adm-destination-preview">
              <p className="adm-eyebrow">Xem trước thẻ</p>
              <article className="adm-card-preview">
                <div className="adm-card-preview-photo">
                  <AssetImage
                    image={previewImage}
                    altFallback={name || "Điểm đến"}
                    sizes="(max-width: 700px) 100vw, 320px"
                  />
                </div>
                <div className="adm-card-preview-copy">
                  <strong>{previewName || "Chưa có tên"}</strong>
                  <span>{previewProvince || "Chưa có tỉnh/thành"}</span>
                  <p>
                    {previewSummary ||
                      "Chưa có tóm tắt — thẻ sẽ không có dòng mô tả."}
                  </p>
                </div>
              </article>
              <p className="adm-hint">
                Đây là nội dung khách thấy trên thẻ. Ảnh thiếu sẽ dùng nền
                thương hiệu, thẻ không bị ẩn.
              </p>
            </div>
          </div>
        </Section>

        <Section
          id="home"
          number={4}
          title={SECTION_TITLES.home}
          where="cụm tối đa 3 thẻ điểm đến trên landing page"
          errors={booked("home")}
        >
          <div className="adm-home-status" role="status">
            <div className="adm-home-status-row">
              <span className="adm-home-status-label">Website</span>
              <strong
                data-tone={recordState === "published" ? "on" : "draft"}
              >
                {recordState === "published"
                  ? "Đang xuất bản"
                  : "Bản nháp — chưa lên web"}
              </strong>
            </div>
            <div className="adm-home-status-row">
              <span className="adm-home-status-label">Khám phá</span>
              <strong data-tone={showOnHome ? "on" : "off"}>
                {showOnHome ? "Đang bật" : "Đang tắt"}
              </strong>
              <span className="adm-home-status-count">
                {enabledCount}/{HOME_DESTINATION_LIMIT} điểm đang bật
                {showOnHome && slot ? ` · vị trí #${slot}` : ""}
              </span>
            </div>
            {showOnHome && recordState !== "published" ? (
              <small>
                Đang bật Khám phá nhưng chưa xuất bản — bấm “Xuất bản thay
                đổi” để thẻ lên trang chủ.
              </small>
            ) : null}
            {!showOnHome && recordState !== "published" ? (
              <small>
                Bản nháp: xuất bản rồi bật Khám phá nếu muốn lên trang chủ.
              </small>
            ) : null}
            {!showOnHome && recordState === "published" && !slotsFull ? (
              <small>
                Điểm này đang tắt cho khối Khám phá. Bật công tắc bên dưới để
                thẻ xuất hiện trên trang chủ.
              </small>
            ) : null}
            {slotsFull && !showOnHome ? (
              <small>
                Đã đủ {HOME_DESTINATION_LIMIT}/{HOME_DESTINATION_LIMIT} điểm
                Khám phá — tắt một điểm khác trước khi bật điểm này.
              </small>
            ) : null}
          </div>
          <div className="adm-home-controls">
            <Toggle
              label="Hiển thị trong khối Khám phá trên trang chủ"
              checked={showOnHome}
              disabled={slotsFull && !showOnHome}
              hint={`Tối đa ${HOME_DESTINATION_LIMIT} điểm được bật. Điểm phải được xuất bản mới lên web.`}
              onChange={(next) => {
                if (next && slotsFull) return;
                const patch: AdminRecord = { showOnHome: next };
                if (next && !(homeOrder > 0)) patch.homeOrder = nextHomeOrder;
                update(patch);
                markTouched("showOnHome");
              }}
            />
            <NumberField
              path="homeOrder"
              label="Thứ tự trong khối Khám phá"
              value={homeOrder}
              min={1}
              disabled={!showOnHome}
              hint="1 = hiện đầu tiên. Chỉ áp dụng khi điểm đang bật Khám phá."
              error={showError("homeOrder")}
              onBlur={() => markTouched("homeOrder")}
              onChange={(next) => update({ homeOrder: next })}
            />
          </div>
          {slotsFull && !showOnHome ? (
            <p className="adm-field-warning">
              Đã đủ {HOME_DESTINATION_LIMIT}/{HOME_DESTINATION_LIMIT} điểm cho
              khối Khám phá. Tắt một điểm đang bật trước khi bật điểm này.
            </p>
          ) : null}
          <div className="adm-destination-preview adm-destination-preview--home">
            <p className="adm-eyebrow">Thẻ sẽ xuất hiện</p>
            <article className="adm-card-preview">
              <div className="adm-card-preview-photo">
                <AssetImage
                  image={previewImage}
                  altFallback={name || "Điểm đến"}
                  sizes="(max-width: 700px) 100vw, 320px"
                />
              </div>
              <div className="adm-card-preview-copy">
                <span>
                  {slot ? `0${slot} / KHÁM PHÁ` : "CHƯA BẬT KHÁM PHÁ"}
                </span>
                <strong>{previewName || "Chưa có tên"}</strong>
                <span>{previewProvince || "Chưa có tỉnh/thành"}</span>
                <p>{previewSummary || "Chưa có tóm tắt."}</p>
              </div>
            </article>
            <p className="adm-hint">
              Liên kết thẻ: <code>{previewHrefLabel}</code> — mở trang tìm tour
              với từ khóa “{name.split(" – ")[0].split(" - ")[0] || "—"}”.
            </p>
          </div>
        </Section>

        <Section
          id="translations"
          number={5}
          title={SECTION_TITLES.translations}
          where="phiên bản /en của trang tìm tour"
          errors={0}
          collapsible
        >
          {!hasEnglish ? (
            <div className="adm-en-empty">
              <p>
                Chưa có bản dịch tiếng Anh. Trang EN sẽ dùng nội dung tiếng
                Việt cho đến khi bạn thêm bản dịch.
              </p>
              <button
                type="button"
                onClick={() =>
                  update({
                    _en: {
                      name: name || undefined,
                      summary: summary || undefined,
                      province: province || undefined,
                    },
                    _enReviewed: false,
                  })
                }
              >
                + Thêm bản dịch tiếng Anh
              </button>
            </div>
          ) : (
            <>
              <Toggle
                label="Đã duyệt bản dịch tiếng Anh"
                checked={reviewed}
                hint="Chỉ bật khi đã kiểm tra nội dung. Bản chưa duyệt không được index."
                onChange={(next) => update({ _enReviewed: next })}
              />
              <TextField
                path="_en.name"
                label="Tên tiếng Anh"
                value={textOf(en.name)}
                placeholder={name}
                onChange={(next) =>
                  setEnglish({ name: next.trim() ? next : undefined })
                }
              />
              <TextField
                path="_en.summary"
                label="Tóm tắt tiếng Anh"
                value={textOf(en.summary)}
                placeholder={summary}
                multiline
                rows={2}
                maxLength={180}
                onChange={(next) =>
                  setEnglish({ summary: next.trim() ? next : undefined })
                }
              />
              <TextField
                path="_en.province"
                label="Tỉnh / thành tiếng Anh"
                value={textOf(en.province)}
                placeholder={province}
                onChange={(next) =>
                  setEnglish({ province: next.trim() ? next : undefined })
                }
              />
            </>
          )}
        </Section>

        <Section
          id="advanced"
          number={6}
          title={SECTION_TITLES.advanced}
          where="mã kỹ thuật và trạng thái nội bộ — thường không cần sửa"
          errors={booked("advanced")}
          collapsible
        >
          <div className="adm-tour-grid-2">
            <Field
              id="destination-field-id"
              label="Mã nội dung (id)"
              hint="Hệ thống dùng để liên kết điểm đến với tour. Không đổi sau khi tạo."
            >
              <input
                id="destination-field-id"
                value={textOf(data.id)}
                readOnly
                disabled
              />
            </Field>
            <Field
              id="destination-field-slug"
              label="Slug"
              error={showError("slug")}
              hint={
                locked
                  ? "Đã khóa sau lần lưu đầu để bảo toàn dữ liệu liên kết."
                  : isPlaceholderSlug(data.slug)
                    ? "Slug tạm sẽ tự đổi theo tên điểm đến khi lưu."
                    : "Chỉ chữ thường, số và dấu gạch ngang. Điểm đến không có trang riêng; slug dùng nội bộ."
              }
            >
              {locked ? (
                <input
                  id="destination-field-slug"
                  value={textOf(data.slug)}
                  readOnly
                  disabled
                />
              ) : (
                <div className="adm-slug-row">
                  <input
                    id="destination-field-slug"
                    value={textOf(data.slug)}
                    pattern="[a-z0-9-]+"
                    onChange={(event) => update({ slug: event.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update({ slug: slugify(name || "diem-den-moi") })
                    }
                  >
                    Tạo từ tên
                  </button>
                </div>
              )}
            </Field>
            <div className={`adm-field${showError("contentStatus") ? " adm-field--invalid" : ""}`}>
              <AdmSelect
                label="Tình trạng xác minh"
                value={textOf(data.contentStatus) || "demo"}
                options={CONTENT_STATUS_OPTIONS}
                showValues={false}
                onChange={(next) => update({ contentStatus: next })}
              />
              <small className="adm-hint">
                Chỉ là nhãn theo dõi nội bộ, không quyết định điểm hiện/ẩn trên
                website. Dùng nút Xuất bản / Ẩn để đổi trạng thái public.
              </small>
            </div>
          </div>
          <dl className="adm-tour-meta">
            <div>
              <dt>Cập nhật lúc</dt>
              <dd>{textOf(data.updatedAt) || "—"}</dd>
            </div>
            <div>
              <dt>Liên kết thẻ</dt>
              <dd>
                <code>{previewHrefLabel}</code>
              </dd>
            </div>
          </dl>
          <p className="adm-hint">
            Mã, slug và ngày cập nhật do hệ thống quản lý. Slug không tạo trang
            riêng cho điểm đến; thẻ Khám phá mở trang tìm tour theo tên điểm.
          </p>
        </Section>
      </div>
    </div>
  );
});

function Section({
  id,
  number,
  title,
  where,
  errors,
  children,
  collapsible = false,
}: {
  id: DestinationSection;
  number: number;
  title: string;
  where: string;
  errors: number;
  children: ReactNode;
  collapsible?: boolean;
}) {
  const head = (
    <>
      <div>
        <p>Phần {String(number).padStart(2, "0")}</p>
        <h3>{title}</h3>
        <small className="adm-hint">Hiển thị ở: {where}.</small>
      </div>
      {errors > 0 ? <span className="adm-error-pill">{errors} lỗi</span> : null}
    </>
  );
  if (collapsible)
    return (
      <details
        id={`destination-section-${id}`}
        className="adm-tour-section adm-tour-section--collapsible"
      >
        <summary className="adm-tour-section-head">{head}</summary>
        <div className="adm-tour-section-body">{children}</div>
      </details>
    );
  return (
    <section id={`destination-section-${id}`} className="adm-tour-section">
      <header className="adm-tour-section-head">{head}</header>
      {children}
    </section>
  );
}

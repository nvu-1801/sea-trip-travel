"use client";

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ImageField, type UploadedImage } from "./image-picker";
import { AdmMultiSelect, AdmSelect } from "./ui-select";
import {
  ErrorSummary,
  ImageListEditor,
  NumberField,
  StringListEditor,
  TextField,
  Toggle,
  rec,
  recordsOf,
  textOf,
  numberOf,
  stringsOf,
  type AdminRecord,
} from "./tour-editor-fields";
import {
  collectTourIssues,
  type TourIssue,
  type TourSectionKey,
} from "@/domain/tour-rules";
import { slugify } from "@/lib/slugify";

export type TourEditorHandle = {
  /** Returns false (and jumps to the first issue) when the draft is invalid. */
  validate: () => boolean;
};

type Option = { value: string; label: string };
type ReferenceOptions = {
  categories?: Option[];
  destinations?: Option[];
  media?: Option[];
};

const newId = (prefix: string) =>
  `${prefix}_${crypto.randomUUID().slice(0, 8).replaceAll("-", "")}`;

/** Drops an optional string instead of storing `""` (which fails `.min(1)`). */
const optionalText = (value: string) => (value.trim() ? value : undefined);

const NIGHT_LABEL = "Số đêm";

function enDayFrom(day: AdminRecord, index: number): AdminRecord {
  return {
    id: textOf(day.id) || newId("day"),
    index: index + 1,
    title: textOf(day.title) || `Ngày ${index + 1}`,
    summary: optionalText(textOf(day.summary)),
    activities: stringsOf(day.activities),
    meals: stringsOf(day.meals),
    places: stringsOf(day.places),
    accommodation: optionalText(textOf(day.accommodation)),
  };
}

function cleanDay(day: AdminRecord, index: number): AdminRecord {
  return {
    id: textOf(day.id) || newId("day"),
    index: index + 1,
    title: textOf(day.title),
    ...(optionalText(textOf(day.summary))
      ? { summary: textOf(day.summary) }
      : {}),
    activities: stringsOf(day.activities),
    meals: stringsOf(day.meals),
    places: stringsOf(day.places),
    ...(optionalText(textOf(day.accommodation))
      ? { accommodation: textOf(day.accommodation) }
      : {}),
  };
}

export const TourEditor = forwardRef<
  TourEditorHandle,
  {
    value: AdminRecord;
    onChange: (value: AdminRecord) => void;
    references?: ReferenceOptions;
    onUploadImage?: (file: File) => Promise<UploadedImage>;
    onNavigateTab?: (tab: "messages" | "settings") => void;
    /** Slug/id are locked once the record has a saved revision. */
    locked?: boolean;
  }
>(function TourEditor(
  {
    value,
    onChange,
    references = {},
    onUploadImage,
    onNavigateTab,
    locked = false,
  },
  ref,
) {
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

  const data = rec(value);
  const title = textOf(data.title);
  const summary = textOf(data.summary);
  const tourCode = textOf(data.tourCode);
  const badge = textOf(data.badge);
  const tags = stringsOf(data.tags);
  const categoryIds = stringsOf(data.categoryIds);
  const destinationIds = stringsOf(data.destinationIds);
  const images = recordsOf(data.images);
  const overview = stringsOf(data.overview);
  const highlights = stringsOf(data.highlights);
  const included = stringsOf(data.included);
  const excluded = stringsOf(data.excluded);
  const notes = stringsOf(data.notes);
  const policies = stringsOf(data.policies);
  const gifts = stringsOf(data.gifts);
  const departurePoints = stringsOf(data.departurePoints);
  const returnPoints = stringsOf(data.returnPoints);
  const transport = stringsOf(data.transport);
  const packages = recordsOf(data.pricingOptions);
  const duration = rec(data.duration);
  const seo = rec(data.seo);
  const viDays = recordsOf(data.itinerary);
  const hasEnglish = Boolean(data._en && typeof data._en === "object");
  const en = rec(data._en);
  const reviewed = data._enReviewed === true;
  const isContact = data.priceFrom === null || data.priceFrom === undefined;
  const priceAmount = numberOf(rec(data.priceFrom).amount);

  const categories = useMemo(
    () => new Set((references.categories ?? []).map((option) => option.value)),
    [references.categories],
  );
  const destinations = useMemo(
    () =>
      new Set((references.destinations ?? []).map((option) => option.value)),
    [references.destinations],
  );

  const issues = collectTourIssues(data, { categories, destinations });
  const errorMap = new Map<string, string>();
  for (const issue of issues) errorMap.set(issue.path.join("."), issue.message);

  const markTouched = (path: string) =>
    setTouched((current) => {
      if (current.has(path)) return current;
      const next = new Set(current);
      next.add(path);
      return next;
    });

  const showError = (path: string) =>
    attempted || touched.has(path) ? errorMap.get(path) : undefined;

  const sectionIssues = (section: TourSectionKey) =>
    issues.filter((issue) => issue.section === section);

  const jumpTo = (issue: TourIssue) => {
    const section = document.getElementById(`tour-section-${issue.section}`);
    if (section instanceof HTMLDetailsElement) section.open = true;
    const input = document.getElementById(
      `tour-field-${issue.path.join(".")}`,
    );
    if (input) {
      input.scrollIntoView({ block: "center", behavior: "smooth" });
      input.focus();
      return;
    }
    document
      .getElementById(`tour-section-${issue.section}`)
      ?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  useImperativeHandle(
    ref,
    () => ({
      validate() {
        setAttempted(true);
        if (issues.length === 0) return true;
        requestAnimationFrame(() => jumpTo(issues[0]));
        return false;
      },
    }),
    [issues],
  );

  const update = (patch: AdminRecord) => onChange({ ...data, ...patch });

  /* --- General ---------------------------------------------------------- */

  const setEnglish = (patch: AdminRecord) => {
    const next = { ...en, ...patch };
    for (const key of Object.keys(next)) {
      if (next[key] === undefined) delete next[key];
    }
    update({ _en: next });
  };

  const buildEnglish = () => ({
    title,
    summary,
    overview: [...overview],
    highlights: [...highlights],
    itinerary: viDays.map((day, index) => enDayFrom(day, index)),
    included: [...included],
    excluded: [...excluded],
    notes: [...notes],
    policies: [...policies],
    tags: [...tags],
    priceNote: optionalText(textOf(data.priceNote)),
    badge: optionalText(badge),
    departurePoints: [...departurePoints],
    imageAlts: images.map((image) => textOf(image.alt) || "Ảnh tour"),
    ...(textOf(seo.title) || textOf(seo.description)
      ? {
          seo: {
            ...(textOf(seo.title) ? { title: textOf(seo.title) } : {}),
            ...(textOf(seo.description)
              ? { description: textOf(seo.description) }
              : {}),
          },
        }
      : {}),
  });

  /* --- Itinerary -------------------------------------------------------- */

  const enDays = viDays.map((day, index) => {
    const candidate = recordsOf(en.itinerary)[index];
    return candidate ? rec(candidate) : enDayFrom(day, index);
  });

  const writeItinerary = (
    nextVi: AdminRecord[],
    nextEn?: AdminRecord[],
  ) => {
    const cleanVi = nextVi.map((day, index) => cleanDay(day, index));
    const next: AdminRecord = {
      ...data,
      itinerary: cleanVi,
      duration: { ...duration, days: cleanVi.length },
    };
    if (hasEnglish && nextEn) {
      next._en = {
        ...en,
        itinerary: nextEn.map((day, index) => ({
          ...cleanDay(day, index),
          id: textOf(cleanVi[index]?.id) || textOf(day.id),
        })),
      };
    }
    onChange(next);
  };

  const addDay = () => {
    const day: AdminRecord = {
      id: newId("day"),
      title: `Ngày ${viDays.length + 1}`,
      summary: "",
      activities: [],
      meals: [],
      places: [],
    };
    writeItinerary(
      [...viDays, day],
      hasEnglish ? [...enDays, enDayFrom(day, viDays.length)] : undefined,
    );
  };

  const duplicateDay = (index: number) => {
    const copy = { ...viDays[index], id: newId("day") };
    const nextVi = [
      ...viDays.slice(0, index + 1),
      copy,
      ...viDays.slice(index + 1),
    ];
    const nextEn = hasEnglish
      ? [
          ...enDays.slice(0, index + 1),
          { ...enDays[index], id: textOf(copy.id) },
          ...enDays.slice(index + 1),
        ]
      : undefined;
    writeItinerary(nextVi, nextEn);
  };

  const removeDay = (index: number) => {
    writeItinerary(
      viDays.filter((_, i) => i !== index),
      hasEnglish ? enDays.filter((_, i) => i !== index) : undefined,
    );
  };

  const moveDay = (from: number, to: number) => {
    writeItinerary(
      viDays.map((day, index) => (index === from ? viDays[to] : index === to ? viDays[from] : day)),
      hasEnglish
        ? enDays.map((day, index) =>
            index === from ? enDays[to] : index === to ? enDays[from] : day,
          )
        : undefined,
    );
  };

  const updateDay = (index: number, patch: AdminRecord) =>
    writeItinerary(
      viDays.map((day, i) => (i === index ? { ...day, ...patch } : day)),
      // Structure only: the English text must not inherit a Vietnamese edit.
      hasEnglish ? enDays : undefined,
    );

  /* --- Packages --------------------------------------------------------- */

  const writePackages = (nextPackages: AdminRecord[]) => {
    const amounts = nextPackages.map((option) => numberOf(option.adultPrice));
    const nextPrice = nextPackages.length
      ? { amount: Math.min(...amounts), currency: "VND" }
      : isContact
        ? null
        : data.priceFrom;
    update({ pricingOptions: nextPackages, priceFrom: nextPrice });
  };

  const addPackage = () =>
    writePackages([
      ...packages,
      {
        id: newId("price"),
        label: `Gói ${packages.length + 1}`,
        adultPrice: 0,
        childPrice: 0,
      },
    ]);

  const updatePackage = (index: number, patch: AdminRecord) =>
    writePackages(
      packages.map((option, i) =>
        i === index ? { ...option, ...patch } : option,
      ),
    );

  const setContactMode = (contact: boolean) => {
    if (contact) {
      // Keep the packages so switching back never loses pricing data. The
      // public page hides the table while the tour is in "contact" mode.
      update({ priceFrom: null });
      return;
    }
    const lowest = packages.length
      ? Math.min(...packages.map((option) => numberOf(option.adultPrice)))
      : 0;
    update({
      priceFrom:
        lowest > 0
          ? { amount: lowest, currency: "VND" }
          : priceAmount > 0
            ? data.priceFrom
            : { amount: 0, currency: "VND" },
    });
  };

  /* --- SEO -------------------------------------------------------------- */

  const setSeo = (key: string, nextValue: string) => {
    const next = { ...seo };
    if (nextValue.trim()) next[key] = nextValue;
    else delete next[key];
    update({ seo: Object.keys(next).length ? next : undefined });
  };

  /* --- English helpers -------------------------------------------------- */

  const setEnDay = (index: number, patch: AdminRecord) => {
    const cleanPatch = { ...patch };
    if ("summary" in cleanPatch && !optionalText(textOf(cleanPatch.summary)))
      cleanPatch.summary = undefined;
    if (
      "accommodation" in cleanPatch &&
      !optionalText(textOf(cleanPatch.accommodation))
    )
      cleanPatch.accommodation = undefined;
    const next = viDays.map((day, i) => {
      const current = enDays[i] ?? enDayFrom(day, i);
      return i === index ? { ...current, ...cleanPatch } : current;
    });
    setEnglish({ itinerary: next });
  };

  const setEnImageAlt = (index: number, nextValue: string) => {
    const current = stringsOf(en.imageAlts);
    const next = images.map(
      (image, i) =>
        (i === index ? nextValue : current[i]) || textOf(image.alt) || "Ảnh tour",
    );
    setEnglish({ imageAlts: next });
  };

  const nav = (
    [
      ["general", "Thông tin chung"],
      ["media", "Ảnh & thư viện", images.length],
      ["overview", "Giới thiệu", overview.length],
      ["highlights", "Điểm nổi bật", highlights.length],
      ["itinerary", "Lịch trình", viDays.length],
      ["pricing", "Giá & các gói", packages.length],
      ["services", "Dịch vụ", included.length + excluded.length],
      ["notes", "Lưu ý & chính sách", notes.length + policies.length],
      [
        "logistics",
        "Di chuyển & khởi hành",
        departurePoints.length + returnPoints.length + transport.length,
      ],
      ["seo", "SEO", Object.keys(seo).length],
      ["translations", "Bản dịch tiếng Anh", hasEnglish ? 1 : 0],
      ["consult", "Tư vấn", 0],
      ["advanced", "Nâng cao", 0],
    ] as [TourSectionKey, string, number?][]
  ).map(([key, label, count]) => ({
    key,
    label,
    count,
    errors: sectionIssues(key).length,
  }));

  return (
    <div className="adm-tour-editor">
      <nav className="adm-tour-nav" aria-label="Các phần nội dung tour">
        <p className="adm-eyebrow">Nội dung tour</p>
        {nav.map((item) => (
          <a
            key={item.key}
            href={`#tour-section-${item.key}`}
            onClick={(event) => {
              event.preventDefault();
              const section = document.getElementById(
                `tour-section-${item.key}`,
              );
              if (section instanceof HTMLDetailsElement) section.open = true;
              section?.scrollIntoView({ behavior: "smooth", block: "start" });
              history.replaceState(null, "", `#tour-section-${item.key}`);
            }}
          >
            <span className="adm-tour-nav-label">{item.label}</span>
            {item.errors > 0 ? (
              <span className="adm-error-pill">{item.errors}</span>
            ) : typeof item.count === "number" && item.count > 0 ? (
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
              if (issues.length > 0) jumpTo(issues[0]);
            }}
          >
            Kiểm tra nội dung
          </button>
        </div>
      </nav>

      <div className="adm-tour-form">
        <ErrorSummary issues={issues} onJump={jumpTo} />

        {/* 1 — General --------------------------------------------------- */}
        <Section
          id="general"
          number={1}
          title="Thông tin chung"
          where="đầu trang chi tiết, thẻ tour, tìm kiếm và bộ lọc"
          errors={sectionIssues("general").length}
        >
          <div className="adm-tour-grid-2">
            <TextField
              path="title"
              label="Tiêu đề tour"
              value={title}
              required
              error={showError("title")}
              onBlur={() => markTouched("title")}
              onChange={(next) => update({ title: next })}
            />
            <TextField
              path="tourCode"
              label="Mã tour (tuỳ chọn)"
              value={tourCode}
              hint="Hiện thành nhãn nhỏ dưới tiêu đề."
              onBlur={() => markTouched("tourCode")}
              onChange={(next) => {
                const nextValue = { ...data };
                if (next.trim()) nextValue.tourCode = next;
                else delete nextValue.tourCode;
                onChange(nextValue);
              }}
            />
          </div>
          <TextField
            path="summary"
            label="Tóm tắt một câu"
            value={summary}
            required
            multiline
            rows={2}
            maxLength={220}
            error={showError("summary")}
            hint="Dùng trên thẻ tour, mô tả tìm kiếm và phần đầu trang chi tiết."
            onBlur={() => markTouched("summary")}
            onChange={(next) => update({ summary: next })}
          />
          <div className="adm-tour-grid-2">
            <TextField
              path="badge"
              label="Nhãn nổi bật (tuỳ chọn)"
              value={badge}
              maxLength={40}
              hint='Ví dụ "Đề xuất". Để trống để ẩn nhãn trên thẻ tour.'
              onBlur={() => markTouched("badge")}
              onChange={(next) => {
                const nextValue = { ...data };
                if (next.trim()) nextValue.badge = next;
                else nextValue.badge = "";
                onChange(nextValue);
              }}
            />
            <div className={`adm-field${showError("contentStatus") ? " adm-field--invalid" : ""}`}>
              <AdmSelect
                label="Tình trạng xác minh"
                value={textOf(data.contentStatus) || "demo"}
                options={[
                  { value: "demo", label: "Bản nháp nội dung (demo)" },
                  { value: "verified", label: "Đã xác minh với chủ tour" },
                ]}
                showValues={false}
                onChange={(next) => update({ contentStatus: next })}
              />
              {showError("contentStatus") ? (
                <p className="adm-field-error" role="alert">
                  {showError("contentStatus")}
                </p>
              ) : (
                <small className="adm-hint">
                  Nhãn theo dõi nội bộ, không quyết định tour hiện/ẩn trên
                  website. Dùng nút Xuất bản / Ẩn để đổi trạng thái public.
                </small>
              )}
            </div>
          </div>
          <h4 className="adm-subhead">Danh mục & điểm đến</h4>
          <div className={`adm-field${showError("categoryIds") ? " adm-field--invalid" : ""}`}>
            <AdmMultiSelect
              label="Danh mục của tour"
              values={categoryIds}
              options={references.categories ?? []}
              placeholder="Tìm danh mục để thêm…"
              showValues={false}
              onChange={(next) => update({ categoryIds: next })}
            />
            <small className="adm-hint">
              Tìm theo tên danh mục — không cần nhập mã. Tour cần ít nhất một
              danh mục.
            </small>
            {showError("categoryIds") ? (
              <p className="adm-field-error" role="alert">
                {showError("categoryIds")}
              </p>
            ) : null}
          </div>
          <div className={`adm-field${showError("destinationIds") ? " adm-field--invalid" : ""}`}>
            <AdmMultiSelect
              label="Điểm đến"
              values={destinationIds}
              options={references.destinations ?? []}
              placeholder="Tìm điểm đến để thêm…"
              showValues={false}
              onChange={(next) => update({ destinationIds: next })}
            />
            <small className="adm-hint">
              Điểm đến hiện trên thẻ tour, phần thông tin tour và bộ tìm kiếm.
            </small>
            {showError("destinationIds") ? (
              <p className="adm-field-error" role="alert">
                {showError("destinationIds")}
              </p>
            ) : null}
          </div>
          <h4 className="adm-subhead">Nhãn lọc</h4>
          <StringListEditor
            idPrefix="tags"
            label="Nhãn lọc"
            hint="Dùng cho bộ lọc ở trang danh mục và tìm kiếm. Mỗi dòng một nhãn."
            values={tags}
            multiline={false}
            itemLabel="nhãn"
            addLabel="Thêm nhãn"
            errorFor={(index) => showError(`tags.${index}`)}
            onBlurPath={markTouched}
            onChange={(next) => update({ tags: next })}
          />
        </Section>

        {/* 2 — Media ----------------------------------------------------- */}
        <Section
          id="media"
          number={2}
          title="Ảnh & thư viện"
          where="gallery trên trang chi tiết, ảnh bìa thẻ tour và ảnh chia sẻ"
          errors={sectionIssues("media").length}
        >
          <ImageListEditor
            images={images}
            media={references.media ?? []}
            errorFor={showError}
            onBlurPath={markTouched}
            onChange={(next) => update({ images: next })}
            onUploadImage={onUploadImage}
          />
        </Section>

        {/* 3 — Overview -------------------------------------------------- */}
        <Section
          id="overview"
          number={3}
          title="Giới thiệu"
          where="khối “Tổng quan” trên trang chi tiết"
          errors={sectionIssues("overview").length}
        >
          <StringListEditor
            idPrefix="overview"
            label="Đoạn giới thiệu"
            hint="Mỗi đoạn là một dòng. Đoạn đầu nên nêu điểm khác biệt của tour."
            values={overview}
            itemLabel="đoạn"
            addLabel="Thêm đoạn"
            errorFor={(index) => showError(`overview.${index}`)}
            onBlurPath={markTouched}
            onChange={(next) => update({ overview: next })}
          />
        </Section>

        {/* 4 — Highlights ------------------------------------------------ */}
        <Section
          id="highlights"
          number={4}
          title="Điểm nổi bật"
          where="khối “Điểm nổi bật” và 3 ý đầu trên thẻ tour"
          errors={sectionIssues("highlights").length}
        >
          <StringListEditor
            idPrefix="highlights"
            label="Điểm nổi bật"
            hint="Nên có 3–6 ý, mỗi ý một câu ngắn. 3 ý đầu cũng xuất hiện trên thẻ tour."
            values={highlights}
            itemLabel="điểm nổi bật"
            addLabel="Thêm điểm nổi bật"
            errorFor={(index) => showError(`highlights.${index}`)}
            onBlurPath={markTouched}
            onChange={(next) => update({ highlights: next })}
          />
        </Section>

        {/* 5 — Itinerary ------------------------------------------------- */}
        <Section
          id="itinerary"
          number={5}
          title="Lịch trình từng ngày"
          where="khối “Lịch trình” và dữ liệu JSON-LD"
          errors={sectionIssues("itinerary").length}
        >
          <div className="adm-tour-day-summary">
            <p>
              <strong>{viDays.length} ngày</strong> · Số ngày tự tính từ lịch
              trình bên dưới.
            </p>
            <NumberField
              path="duration.nights"
              label={NIGHT_LABEL}
              value={numberOf(duration.nights)}
              min={0}
              max={90}
              error={showError("duration.nights")}
              hint="Số đêm nghỉ. Phải nhỏ hơn hoặc bằng số ngày."
              onBlur={() => markTouched("duration.nights")}
              onChange={(next) =>
                update({ duration: { ...duration, nights: next } })
              }
            />
          </div>
          {errorMap.get("duration.nights") === undefined &&
          viDays.length !== numberOf(duration.days) ? (
            <div className="adm-tour-warning">
              <p>
                Số ngày đang lưu ({numberOf(duration.days)}) khác số ngày lịch
                trình ({viDays.length}). Lưu sẽ bị chặn cho đến khi khớp.
              </p>
              <button
                type="button"
                onClick={() =>
                  update({ duration: { ...duration, days: viDays.length } })
                }
              >
                Đồng bộ số ngày theo lịch trình
              </button>
            </div>
          ) : null}
          {viDays.length === 0 ? (
            <p className="adm-empty-note">
              Chưa có ngày nào. Thêm ngày đầu tiên để bắt đầu lịch trình.
            </p>
          ) : null}
          {viDays.map((day, index) => (
            <div className="adm-tour-day" key={textOf(day.id) || index}>
              <div className="adm-tour-day-head">
                <h4>Ngày {index + 1}</h4>
                <div className="adm-list-actions">
                  <button
                    type="button"
                    onClick={() => duplicateDay(index)}
                    title="Nhân bản ngày"
                  >
                    Nhân bản
                  </button>
                  <button
                    type="button"
                    aria-label={`Đưa ngày ${index + 1} lên`}
                    disabled={index === 0}
                    onClick={() => moveDay(index, index - 1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Đưa ngày ${index + 1} xuống`}
                    disabled={index === viDays.length - 1}
                    onClick={() => moveDay(index, index + 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="adm-danger"
                    aria-label={`Xóa ngày ${index + 1}`}
                    disabled={viDays.length <= 1}
                    title={
                      viDays.length <= 1
                        ? "Tour phải có ít nhất 1 ngày"
                        : "Xóa ngày"
                    }
                    onClick={() => removeDay(index)}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <TextField
                path={`itinerary.${index}.title`}
                label="Tiêu đề ngày"
                value={textOf(day.title)}
                required
                error={showError(`itinerary.${index}.title`)}
                onBlur={() => markTouched(`itinerary.${index}.title`)}
                onChange={(next) => updateDay(index, { title: next })}
              />
              <TextField
                path={`itinerary.${index}.summary`}
                label="Tóm tắt ngày (tuỳ chọn)"
                value={textOf(day.summary)}
                multiline
                rows={2}
                onBlur={() => markTouched(`itinerary.${index}.summary`)}
                onChange={(next) => updateDay(index, { summary: next })}
              />
              <TextField
                path={`itinerary.${index}.accommodation`}
                label="Lưu trú / nghỉ đêm (tuỳ chọn)"
                value={textOf(day.accommodation)}
                onBlur={() => markTouched(`itinerary.${index}.accommodation`)}
                onChange={(next) => updateDay(index, { accommodation: next })}
              />
              <StringListEditor
                idPrefix={`itinerary.${index}.activities`}
                label="Hoạt động trong ngày"
                values={stringsOf(day.activities)}
                multiline
                itemLabel="hoạt động"
                addLabel="Thêm hoạt động"
                errorFor={(item) =>
                  showError(`itinerary.${index}.activities.${item}`)
                }
                onBlurPath={markTouched}
                onChange={(next) => updateDay(index, { activities: next })}
              />
              <div className="adm-tour-grid-2">
                <StringListEditor
                  idPrefix={`itinerary.${index}.meals`}
                  label="Bữa ăn"
                  values={stringsOf(day.meals)}
                  multiline={false}
                  itemLabel="bữa ăn"
                  addLabel="Thêm bữa"
                  errorFor={(item) =>
                    showError(`itinerary.${index}.meals.${item}`)
                  }
                  onBlurPath={markTouched}
                  onChange={(next) => updateDay(index, { meals: next })}
                />
                <StringListEditor
                  idPrefix={`itinerary.${index}.places`}
                  label="Điểm tham quan"
                  values={stringsOf(day.places)}
                  multiline={false}
                  itemLabel="điểm"
                  addLabel="Thêm điểm"
                  errorFor={(item) =>
                    showError(`itinerary.${index}.places.${item}`)
                  }
                  onBlurPath={markTouched}
                  onChange={(next) => updateDay(index, { places: next })}
                />
              </div>
            </div>
          ))}
          <button type="button" className="adm-add-row" onClick={addDay}>
            ＋ Thêm ngày
          </button>
        </Section>

        {/* 6 — Pricing --------------------------------------------------- */}
        <Section
          id="pricing"
          number={6}
          title="Giá & các gói"
          where="thẻ giá, bảng giá và dữ liệu giá trong JSON-LD"
          errors={sectionIssues("pricing").length}
        >
          <div className="adm-mode-switch" role="group" aria-label="Cách hiển thị giá">
            <label>
              <input
                type="radio"
                name="tour-price-mode"
                checked={!isContact}
                onChange={() => setContactMode(false)}
              />
              Có giá công khai
            </label>
            <label>
              <input
                type="radio"
                name="tour-price-mode"
                checked={isContact}
                onChange={() => setContactMode(true)}
              />
              Liên hệ tư vấn
            </label>
          </div>
          {isContact ? (
            <p className="adm-hint">
              Trang sẽ hiển thị “Liên hệ tư vấn” và tạm ẩn bảng giá. Các gói
              bên dưới vẫn được giữ nguyên — chuyển lại “Có giá công khai” để
              dùng tiếp, không phải nhập lại.
            </p>
          ) : (
            <div className="adm-tour-grid-2">
              <NumberField
                path="priceFrom.amount"
                label="Giá từ (VND)"
                value={priceAmount}
                min={0}
                suffix="₫"
                disabled={packages.length > 0}
                error={showError("priceFrom.amount")}
                hint={
                  packages.length > 0
                    ? "Tự động bằng giá người lớn thấp nhất trong bảng giá."
                    : "Hiển thị trên thẻ tour và khối giá."
                }
                onBlur={() => markTouched("priceFrom.amount")}
                onChange={(next) =>
                  update({
                    priceFrom: next > 0 ? { amount: next, currency: "VND" } : { amount: 0, currency: "VND" },
                  })
                }
              />
              <TextField
                path="priceNote"
                label="Ghi chú giá (tuỳ chọn)"
                value={textOf(data.priceNote)}
                multiline
                rows={2}
                hint="Ví dụ: giá đã gồm VAT, chưa gồm vé tham quan…"
                onBlur={() => markTouched("priceNote")}
                onChange={(next) => {
                  const nextValue = { ...data };
                  if (next.trim()) nextValue.priceNote = next;
                  else delete nextValue.priceNote;
                  onChange(nextValue);
                }}
              />
            </div>
          )}
          <div className={`adm-tour-list${showError("pricingOptions") ? " adm-field--invalid" : ""}`}>
            <div className="adm-tour-list-head">
              <strong>Các gói giá</strong>
              <span>{packages.length}</span>
            </div>
            <p className="adm-hint">
              Mỗi gói là một dòng trong bảng giá. Giá người lớn thấp nhất tự
              động trở thành “Giá từ”.
            </p>
            {showError("pricingOptions") ? (
              <p className="adm-field-error" role="alert">
                {showError("pricingOptions")}
              </p>
            ) : null}
            {packages.length === 0 ? (
              <p className="adm-empty-note">
                Chưa có gói giá. Bảng giá chỉ hiện khi có ít nhất một gói.
              </p>
            ) : null}
            {packages.map((option, index) => (
              <div className="adm-price-row" key={textOf(option.id) || index}>
                <TextField
                  path={`pricingOptions.${index}.label`}
                  label="Nhãn gói"
                  value={textOf(option.label)}
                  required
                  error={showError(`pricingOptions.${index}.label`)}
                  onBlur={() => markTouched(`pricingOptions.${index}.label`)}
                  onChange={(next) => updatePackage(index, { label: next })}
                />
                <NumberField
                  path={`pricingOptions.${index}.adultPrice`}
                  label="Người lớn"
                  value={numberOf(option.adultPrice)}
                  min={1}
                  suffix="₫"
                  error={showError(`pricingOptions.${index}.adultPrice`)}
                  onBlur={() =>
                    markTouched(`pricingOptions.${index}.adultPrice`)
                  }
                  onChange={(next) => updatePackage(index, { adultPrice: next })}
                />
                <NumberField
                  path={`pricingOptions.${index}.childPrice`}
                  label="Trẻ em"
                  value={numberOf(option.childPrice)}
                  min={0}
                  suffix="₫"
                  error={showError(`pricingOptions.${index}.childPrice`)}
                  onBlur={() =>
                    markTouched(`pricingOptions.${index}.childPrice`)
                  }
                  onChange={(next) => updatePackage(index, { childPrice: next })}
                />
                <div className="adm-list-actions adm-price-actions">
                  <button
                    type="button"
                    aria-label={`Đưa gói ${index + 1} lên`}
                    disabled={index === 0}
                    onClick={() =>
                      writePackages(
                        packages.map((item, i) =>
                          i === index
                            ? packages[index - 1]
                            : i === index - 1
                              ? packages[index]
                              : item,
                        ),
                      )
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Đưa gói ${index + 1} xuống`}
                    disabled={index === packages.length - 1}
                    onClick={() =>
                      writePackages(
                        packages.map((item, i) =>
                          i === index
                            ? packages[index + 1]
                            : i === index + 1
                              ? packages[index]
                              : item,
                        ),
                      )
                    }
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="adm-danger"
                    aria-label={`Xóa gói ${index + 1}`}
                    onClick={() =>
                      writePackages(packages.filter((_, i) => i !== index))
                    }
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="adm-add-row" onClick={addPackage}>
              ＋ Thêm gói giá
            </button>
          </div>
          <StringListEditor
            idPrefix="gifts"
            label="Quà tặng kèm"
            values={gifts}
            multiline={false}
            itemLabel="quà tặng"
            addLabel="Thêm quà tặng"
            errorFor={(index) => showError(`gifts.${index}`)}
            onBlurPath={markTouched}
            onChange={(next) => update({ gifts: next })}
          />
        </Section>

        {/* 7 — Services -------------------------------------------------- */}
        <Section
          id="services"
          number={7}
          title="Dịch vụ bao gồm / không bao gồm"
          where="khối “Dịch vụ” trên trang chi tiết"
          errors={sectionIssues("services").length}
        >
          <div className="adm-tour-grid-2">
            <StringListEditor
              idPrefix="included"
              label="Đã bao gồm"
              values={included}
              itemLabel="dịch vụ"
              addLabel="Thêm dịch vụ đã gồm"
              errorFor={(index) => showError(`included.${index}`)}
              onBlurPath={markTouched}
              onChange={(next) => update({ included: next })}
            />
            <StringListEditor
              idPrefix="excluded"
              label="Không bao gồm"
              values={excluded}
              itemLabel="dịch vụ"
              addLabel="Thêm dịch vụ không gồm"
              errorFor={(index) => showError(`excluded.${index}`)}
              onBlurPath={markTouched}
              onChange={(next) => update({ excluded: next })}
            />
          </div>
        </Section>

        {/* 8 — Notes & policies ------------------------------------------ */}
        <Section
          id="notes"
          number={8}
          title="Lưu ý & chính sách"
          where="khối “Lưu ý” và “Chính sách” cuối trang"
          errors={sectionIssues("notes").length}
        >
          <div className="adm-tour-grid-2">
            <StringListEditor
              idPrefix="notes"
              label="Lưu ý cho khách"
              values={notes}
              itemLabel="lưu ý"
              addLabel="Thêm lưu ý"
              errorFor={(index) => showError(`notes.${index}`)}
              onBlurPath={markTouched}
              onChange={(next) => update({ notes: next })}
            />
            <StringListEditor
              idPrefix="policies"
              label="Chính sách huỷ / thanh toán"
              hint="Chỉ hiển thị khi có nội dung đã được xác minh."
              values={policies}
              itemLabel="chính sách"
              addLabel="Thêm chính sách"
              errorFor={(index) => showError(`policies.${index}`)}
              onBlurPath={markTouched}
              onChange={(next) => update({ policies: next })}
            />
          </div>
        </Section>

        {/* 9 — Logistics -------------------------------------------------- */}
        <Section
          id="logistics"
          number={9}
          title="Di chuyển & khởi hành"
          where="khối thông tin nhanh và sidebar giá"
          errors={sectionIssues("logistics").length}
        >
          <div className="adm-tour-grid-2">
            <StringListEditor
              idPrefix="departurePoints"
              label="Điểm khởi hành"
              values={departurePoints}
              multiline={false}
              itemLabel="điểm khởi hành"
              addLabel="Thêm điểm khởi hành"
              errorFor={(index) => showError(`departurePoints.${index}`)}
              onBlurPath={markTouched}
              onChange={(next) => update({ departurePoints: next })}
            />
            <StringListEditor
              idPrefix="returnPoints"
              label="Điểm kết thúc"
              values={returnPoints}
              multiline={false}
              itemLabel="điểm kết thúc"
              addLabel="Thêm điểm kết thúc"
              errorFor={(index) => showError(`returnPoints.${index}`)}
              onBlurPath={markTouched}
              onChange={(next) => update({ returnPoints: next })}
            />
          </div>
          <StringListEditor
            idPrefix="transport"
            label="Phương tiện"
            hint="Mỗi dòng một phương tiện hoặc chặng; trang chi tiết nối bằng dấu ·."
            values={transport}
            multiline={false}
            itemLabel="phương tiện"
            addLabel="Thêm phương tiện"
            errorFor={(index) => showError(`transport.${index}`)}
            onBlurPath={markTouched}
            onChange={(next) => update({ transport: next })}
          />
        </Section>

        {/* 10 — SEO ------------------------------------------------------- */}
        <Section
          id="seo"
          number={10}
          title="SEO & chia sẻ"
          where="thẻ title/meta, Open Graph và ảnh chia sẻ"
          errors={sectionIssues("seo").length}
        >
          <TextField
            path="seo.title"
            label="Tiêu đề SEO (tuỳ chọn)"
            value={textOf(seo.title)}
            hint="Để trống để dùng tiêu đề tour."
            maxLength={70}
            onBlur={() => markTouched("seo.title")}
            onChange={(next) => setSeo("title", next)}
          />
          <TextField
            path="seo.description"
            label="Mô tả SEO (tuỳ chọn)"
            value={textOf(seo.description)}
            multiline
            rows={3}
            maxLength={180}
            hint="Để trống để dùng phần tóm tắt tour."
            onBlur={() => markTouched("seo.description")}
            onChange={(next) => setSeo("description", next)}
          />
          <ImageField
            label="Ảnh chia sẻ (tuỳ chọn)"
            value={textOf(seo.ogImage)}
            media={references.media ?? []}
            onUpload={onUploadImage}
            compact
            whereUsed="Ảnh hiện khi chia sẻ link tour lên Facebook, Zalo hoặc Google. Để trống để dùng ảnh bìa tour."
            onChange={(next) => setSeo("ogImage", next)}
          />
        </Section>

        {/* 11 — English --------------------------------------------------- */}
        <Section
          id="translations"
          number={11}
          title="Bản dịch tiếng Anh"
          where="phiên bản /en/tour/… của trang này"
          errors={sectionIssues("translations").length}
          collapsible
        >
          {!hasEnglish ? (
            <div className="adm-en-empty">
              <p>
                Tour chưa có bản dịch trong CMS. Trang tiếng Anh hiện dùng nội
                dung tiếng Việt (hoặc bản dịch seed nếu có).
              </p>
              <button
                type="button"
                onClick={() =>
                  update({ _en: buildEnglish(), _enReviewed: false })
                }
              >
                ＋ Thêm bản dịch tiếng Anh
              </button>
            </div>
          ) : (
            <>
              <Toggle
                label="Đã duyệt bản dịch tiếng Anh"
                checked={reviewed}
                hint="Chỉ bật khi đã kiểm tra nội dung. Bản chưa duyệt sẽ không được index."
                onChange={(next) => update({ _enReviewed: next })}
              />
              <p className="adm-hint">
                Bản dịch chỉ chứa phần chữ. Slug, giá, thời lượng và đường dẫn
                ảnh luôn dùng chung với bản tiếng Việt. Để trống một ô nghĩa là
                trang EN sẽ dùng nội dung tiếng Việt cho ô đó.
              </p>
              <div className="adm-tour-grid-2">
                <TextField
                  path="_en.title"
                  label="Tiêu đề EN"
                  value={textOf(en.title)}
                  placeholder={title}
                  onBlur={() => markTouched("_en.title")}
                  onChange={(next) => setEnglish({ title: optionalText(next) })}
                />
                <TextField
                  path="_en.badge"
                  label="Nhãn nổi bật EN"
                  value={textOf(en.badge)}
                  placeholder={badge}
                  onChange={(next) => setEnglish({ badge: optionalText(next) })}
                />
              </div>
              <TextField
                path="_en.summary"
                label="Tóm tắt EN"
                value={textOf(en.summary)}
                placeholder={summary}
                multiline
                rows={2}
                maxLength={220}
                onBlur={() => markTouched("_en.summary")}
                onChange={(next) => setEnglish({ summary: optionalText(next) })}
              />
              <TextField
                path="_en.priceNote"
                label="Ghi chú giá EN"
                value={textOf(en.priceNote)}
                placeholder={textOf(data.priceNote)}
                multiline
                rows={2}
                onChange={(next) =>
                  setEnglish({ priceNote: optionalText(next) })
                }
              />
              <StringListEditor
                idPrefix="_en.departurePoints"
                label="Điểm khởi hành EN"
                values={stringsOf(en.departurePoints)}
                multiline={false}
                itemLabel="điểm"
                addLabel="Thêm điểm EN"
                errorFor={(index) =>
                  showError(`_en.departurePoints.${index}`)
                }
                onBlurPath={markTouched}
                onChange={(next) =>
                  setEnglish({
                    departurePoints: next.length ? next : undefined,
                  })
                }
                emptyText="Chưa dịch — đang dùng điểm khởi hành tiếng Việt."
              />

              <EnList
                label="Đoạn giới thiệu EN"
                field="overview"
                source={overview}
                en={en}
                showError={showError}
                markTouched={markTouched}
                setEnglish={setEnglish}
              />
              <EnList
                label="Điểm nổi bật EN"
                field="highlights"
                source={highlights}
                en={en}
                showError={showError}
                markTouched={markTouched}
                setEnglish={setEnglish}
              />
              <EnList
                label="Đã bao gồm EN"
                field="included"
                source={included}
                en={en}
                showError={showError}
                markTouched={markTouched}
                setEnglish={setEnglish}
              />
              <EnList
                label="Không bao gồm EN"
                field="excluded"
                source={excluded}
                en={en}
                showError={showError}
                markTouched={markTouched}
                setEnglish={setEnglish}
              />
              <EnList
                label="Lưu ý EN"
                field="notes"
                source={notes}
                en={en}
                showError={showError}
                markTouched={markTouched}
                setEnglish={setEnglish}
              />
              <EnList
                label="Chính sách EN"
                field="policies"
                source={policies}
                en={en}
                showError={showError}
                markTouched={markTouched}
                setEnglish={setEnglish}
              />
              <EnList
                label="Nhãn lọc EN"
                field="tags"
                source={tags}
                en={en}
                showError={showError}
                markTouched={markTouched}
                setEnglish={setEnglish}
                multiline={false}
              />

              <details className="adm-en-block">
                <summary>
                  Lịch trình EN ({viDays.length} ngày, khớp thứ tự với tiếng
                  Việt)
                </summary>
                {viDays.map((day, index) => {
                  const translated = enDays[index] ?? enDayFrom(day, index);
                  return (
                    <div className="adm-tour-day" key={`en-day-${index}`}>
                      <div className="adm-tour-day-head">
                        <h4>Ngày {index + 1} EN</h4>
                      </div>
                      <TextField
                        path={`_en.itinerary.${index}.title`}
                        label="Tiêu đề ngày EN"
                        value={textOf(translated.title)}
                        placeholder={textOf(day.title)}
                        onBlur={() =>
                          markTouched(`_en.itinerary.${index}.title`)
                        }
                        onChange={(next) =>
                          setEnDay(index, { title: next })
                        }
                      />
                      <TextField
                        path={`_en.itinerary.${index}.summary`}
                        label="Tóm tắt ngày EN"
                        value={textOf(translated.summary)}
                        placeholder={textOf(day.summary)}
                        multiline
                        rows={2}
                        onChange={(next) =>
                          setEnDay(index, { summary: next })
                        }
                      />
                      <TextField
                        path={`_en.itinerary.${index}.accommodation`}
                        label="Lưu trú EN"
                        value={textOf(translated.accommodation)}
                        placeholder={textOf(day.accommodation)}
                        onChange={(next) =>
                          setEnDay(index, { accommodation: next })
                        }
                      />
                      <StringListEditor
                        idPrefix={`_en.itinerary.${index}.activities`}
                        label="Hoạt động EN"
                        values={stringsOf(translated.activities)}
                        errorFor={(item) =>
                          showError(
                            `_en.itinerary.${index}.activities.${item}`,
                          )
                        }
                        onBlurPath={markTouched}
                        onChange={(next) =>
                          setEnDay(index, { activities: next })
                        }
                      />
                      <div className="adm-tour-grid-2">
                        <StringListEditor
                          idPrefix={`_en.itinerary.${index}.meals`}
                          label="Bữa ăn EN"
                          values={stringsOf(translated.meals)}
                          multiline={false}
                          errorFor={(item) =>
                            showError(`_en.itinerary.${index}.meals.${item}`)
                          }
                          onBlurPath={markTouched}
                          onChange={(next) =>
                            setEnDay(index, { meals: next })
                          }
                        />
                        <StringListEditor
                          idPrefix={`_en.itinerary.${index}.places`}
                          label="Điểm tham quan EN"
                          values={stringsOf(translated.places)}
                          multiline={false}
                          errorFor={(item) =>
                            showError(`_en.itinerary.${index}.places.${item}`)
                          }
                          onBlurPath={markTouched}
                          onChange={(next) =>
                            setEnDay(index, { places: next })
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </details>

              <details className="adm-en-block">
                <summary>Mô tả ảnh EN</summary>
                {images.map((image, index) => (
                  <TextField
                    key={`en-alt-${index}`}
                    path={`_en.imageAlts.${index}`}
                    label={`Mô tả ảnh ${index + 1} EN`}
                    value={stringsOf(en.imageAlts)[index] ?? ""}
                    placeholder={textOf(image.alt)}
                    onChange={(next) => setEnImageAlt(index, next)}
                    onBlur={() => markTouched(`_en.imageAlts.${index}`)}
                  />
                ))}
              </details>

              <details className="adm-en-block">
                <summary>SEO EN</summary>
                <TextField
                  path="_en.seo.title"
                  label="Tiêu đề SEO EN"
                  value={textOf(rec(en.seo).title)}
                  placeholder={textOf(seo.title)}
                  onChange={(next) =>
                    setEnglish({
                      seo: {
                        ...rec(en.seo),
                        ...(optionalText(next) ? { title: next } : {}),
                      },
                    })
                  }
                />
                <TextField
                  path="_en.seo.description"
                  label="Mô tả SEO EN"
                  value={textOf(rec(en.seo).description)}
                  placeholder={textOf(seo.description)}
                  multiline
                  rows={2}
                  onChange={(next) =>
                    setEnglish({
                      seo: {
                        ...rec(en.seo),
                        ...(optionalText(next) ? { description: next } : {}),
                      },
                    })
                  }
                />
              </details>

              <div className="adm-tour-warning">
                <p>
                  Các trường chưa có bản dịch theo cấu trúc hiện tại: phương
                  tiện, quà tặng, điểm kết thúc, mã tour. Trang EN dùng nội dung
                  tiếng Việt cho các phần này.
                </p>
              </div>
            </>
          )}
        </Section>

        {/* 12 — Consult --------------------------------------------------- */}
        <Section
          id="consult"
          number={12}
          title="Tư vấn"
          where="khối “Tư vấn” cuối trang chi tiết"
          errors={0}
          collapsible
        >
          <div className="adm-tour-consult">
            <p>
              Khối tư vấn dùng <strong>{title || "tiêu đề tour"}</strong> và giá{" "}
              <strong>
                {isContact
                  ? "Liên hệ tư vấn"
                  : priceAmount > 0
                    ? `${priceAmount.toLocaleString("vi-VN")} ₫`
                    : "chưa có giá"}
              </strong>
              . Lời mời, cam kết và quy trình là nội dung dùng chung của website.
            </p>
            <p className="adm-hint">
              Muốn lời mời riêng cho từng tour thì cần bổ sung trường
              <code>consultTitle</code> / <code>consultNote</code> vào schema
              tour (chưa có trong cấu trúc hiện tại).
            </p>
            <div className="adm-modal-actions">
              <button type="button" onClick={() => onNavigateTab?.("messages")}>
                Sửa nội dung VI / EN
              </button>
              <button type="button" onClick={() => onNavigateTab?.("settings")}>
                Sửa hotline / footer
              </button>
            </div>
          </div>
        </Section>

        {/* 13 — Advanced -------------------------------------------------- */}
        <Section
          id="advanced"
          number={13}
          title="Nâng cao"
          where="metadata kỹ thuật — chỉ đọc"
          errors={sectionIssues("advanced").length}
          collapsible
        >
          <div className="adm-tour-grid-2">
            <div className="adm-field">
              <label htmlFor="tour-field-id">Mã nội dung (id)</label>
              <input
                id="tour-field-id"
                value={textOf(data.id)}
                readOnly
                disabled
              />
              <small className="adm-hint">
                Hệ thống dùng để liên kết tour với danh mục, điểm đến và bài
                viết. Không sửa sau khi tạo.
              </small>
            </div>
            <div
              className={`adm-field${showError("slug") ? " adm-field--invalid" : ""}`}
            >
              <label htmlFor="tour-field-slug">Slug (đường dẫn)</label>
              {locked ? (
                <input
                  id="tour-field-slug"
                  value={textOf(data.slug)}
                  readOnly
                  disabled
                />
              ) : (
                <div className="adm-slug-row">
                  <input
                    id="tour-field-slug"
                    value={textOf(data.slug)}
                    pattern="[a-z0-9-]+"
                    aria-invalid={showError("slug") ? true : undefined}
                    onChange={(event) => update({ slug: event.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      update({ slug: slugify(title || "tour-moi") })
                    }
                  >
                    Tạo từ tiêu đề
                  </button>
                </div>
              )}
              <small className="adm-hint">
                {locked
                  ? "Đã khóa sau lần lưu đầu để bảo toàn liên kết đã phát hành."
                  : "Chỉ chữ thường, số và dấu gạch ngang. Kiểm tra trước khi lưu lần đầu."}
              </small>
              <small className="adm-hint">
                Đường dẫn công khai:{" "}
                <code>/tour/{textOf(data.slug) || "..."}</code>
              </small>
              {showError("slug") ? (
                <p className="adm-field-error" role="alert">
                  {showError("slug")}
                </p>
              ) : null}
            </div>
          </div>
          <dl className="adm-tour-meta">
            <div>
              <dt>Cập nhật lúc</dt>
              <dd>{textOf(data.updatedAt) || "—"}</dd>
            </div>
          </dl>
          <p className="adm-hint">
            Ngày cập nhật do hệ thống tự ghi khi lưu. Slug chỉ sửa được ở bản
            nháp đầu tiên.
          </p>
          {stringsOf(data.sourceDocuments).length > 0 ? (
            <div className="adm-field">
              <span className="adm-field-label">Nguồn tư liệu</span>
              <ul className="adm-tour-sources">
                {stringsOf(data.sourceDocuments).map((source) => (
                  <li key={source}>{source}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Section>
      </div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* Shared bits                                                                */
/* -------------------------------------------------------------------------- */

function Section({
  id,
  number,
  title,
  where,
  errors,
  children,
  collapsible = false,
}: {
  id: TourSectionKey;
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
      {errors > 0 ? (
        <span className="adm-error-pill">{errors} lỗi</span>
      ) : null}
    </>
  );
  if (collapsible)
    return (
      <details
        id={`tour-section-${id}`}
        className="adm-tour-section adm-tour-section--collapsible"
      >
        <summary className="adm-tour-section-head">{head}</summary>
        <div className="adm-tour-section-body">{children}</div>
      </details>
    );
  return (
    <section id={`tour-section-${id}`} className="adm-tour-section">
      <header className="adm-tour-section-head">{head}</header>
      {children}
    </section>
  );
}

function EnList({
  label,
  field,
  source,
  en,
  showError,
  markTouched,
  setEnglish,
  multiline = true,
}: {
  label: string;
  field: string;
  source: readonly string[];
  en: AdminRecord;
  showError: (path: string) => string | undefined;
  markTouched: (path: string) => void;
  setEnglish: (patch: AdminRecord) => void;
  multiline?: boolean;
}) {
  const value = en[field];
  if (!Array.isArray(value)) {
    return (
      <div className="adm-en-missing">
        <p>
          {label}: chưa có bản dịch — trang EN đang dùng nội dung tiếng Việt.
        </p>
        <button
          type="button"
          onClick={() => setEnglish({ [field]: [...source] })}
        >
          Dịch từ tiếng Việt
        </button>
      </div>
    );
  }
  return (
    <StringListEditor
      idPrefix={`_en.${field}`}
      label={label}
      values={stringsOf(value)}
      multiline={multiline}
      errorFor={(index) => showError(`_en.${field}.${index}`)}
      onBlurPath={markTouched}
      onChange={(next) =>
        setEnglish({ [field]: next.length ? next : undefined })
      }
      emptyText="Chưa có mục nào — trang EN sẽ ẩn phần này."
    />
  );
}

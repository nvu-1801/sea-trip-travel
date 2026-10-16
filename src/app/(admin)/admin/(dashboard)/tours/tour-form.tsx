"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveTourAction } from "@/server/admin/actions";
import { emptyActionState } from "@/server/admin/action-state";
import { Alert, Field, inputClass, textareaClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import type { TourFormState } from "./tour-form-model";

/**
 * Tour editor.
 *
 * The whole record is held in local state and submitted as one JSON payload,
 * which the server validates with `adminTourPayloadSchema` before writing. Child
 * collections (images, itinerary, price packages) are edited as rows, so no
 * content is ever expressed as a raw HTML string.
 */

const splitLines = (value: string): string[] =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

function toNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildPayload(form: TourFormState): Record<string, unknown> {
  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    summary: form.summary,
    tourCode: form.tourCode || undefined,
    categoryIds: form.categoryIds,
    destinationIds: form.destinationIds,
    durationDays: toNumber(form.durationDays) ?? 1,
    durationNights: toNumber(form.durationNights) ?? 0,
    departurePoints: splitLines(form.departurePoints),
    returnPoints: splitLines(form.returnPoints),
    transport: splitLines(form.transport),
    priceNote: form.priceNote || undefined,
    gifts: splitLines(form.gifts),
    highlights: splitLines(form.highlights),
    overview: splitLines(form.overview),
    included: splitLines(form.included),
    excluded: splitLines(form.excluded),
    notes: splitLines(form.notes),
    policies: splitLines(form.policies),
    tags: splitLines(form.tags),
    images: form.images
      .filter((image) => image.alt.trim() !== "")
      .map((image) => ({
        src: image.src.trim() || undefined,
        alt: image.alt.trim(),
        width: toNumber(image.width),
        height: toNumber(image.height),
        caption: image.caption.trim() || undefined,
      })),
    itinerary: form.itinerary
      .filter((day) => day.title.trim() !== "")
      .map((day) => ({
        title: day.title.trim(),
        summary: day.summary.trim() || undefined,
        activities: splitLines(day.activities),
        meals: splitLines(day.meals),
        places: splitLines(day.places),
        accommodation: day.accommodation.trim() || undefined,
      })),
    pricingOptions: form.pricingOptions
      .filter((option) => option.label.trim() !== "" && option.adultPrice.trim() !== "")
      .map((option) => ({
        id: option.id || undefined,
        label: option.label.trim(),
        accommodationClass: option.accommodationClass.trim() || undefined,
        adultPrice: toNumber(option.adultPrice),
        childPrice: toNumber(option.childPrice) ?? 0,
        surcharge: option.surcharge.trim() || undefined,
        validFrom: option.validFrom.trim() || undefined,
        validTo: option.validTo.trim() || undefined,
        note: option.note.trim() || undefined,
      })),
    seoTitle: form.seoTitle || undefined,
    seoDescription: form.seoDescription || undefined,
    seoOgImage: form.seoOgImage || undefined,
    contentStatus: form.contentStatus,
    status: form.status,
    featured: form.featured,
    sortOrder: toNumber(form.sortOrder) ?? 0,
  };
}

function MultiLineField({
  label,
  value,
  onChange,
  hint,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
}) {
  return (
    <Field label={label} hint={hint ?? "Mỗi dòng là một mục."}>
      <textarea
        className={textareaClass}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function TourForm({
  initial,
  categories,
  destinations,
  media,
  saved,
}: {
  initial: TourFormState;
  categories: { id: string; name: string }[];
  destinations: { id: string; name: string }[];
  media: { id: string; url: string; alt: string | null }[];
  saved?: boolean;
}) {
  const [form, setForm] = useState<TourFormState>(initial);
  const [state, action] = useActionState(saveTourAction, emptyActionState);

  const set = <K extends keyof TourFormState>(key: K, value: TourFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggleId = (key: "categoryIds" | "destinationIds", id: string) =>
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id],
    }));

  const errorFor = (field: string) =>
    state.ok === false ? state.fieldErrors?.[field]?.[0] : undefined;

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="payload" value={JSON.stringify(buildPayload(form))} />

      {state.ok === false ? <Alert tone="error">{state.message}</Alert> : null}
      {saved && state.ok !== false ? <Alert tone="success">Đã lưu tour.</Alert> : null}

      {/* --- Basics ------------------------------------------------------- */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-bold text-foreground">Thông tin cơ bản</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Tên tour" required error={errorFor("title")} className="md:col-span-2">
            <input className={inputClass} value={form.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
          <Field
            label="Slug (đường dẫn)"
            required
            hint="Chữ thường, số và dấu gạch ngang. Đổi slug sẽ tự tạo chuyển hướng 301 từ slug cũ."
            error={errorFor("slug")}
          >
            <input className={inputClass} value={form.slug} onChange={(e) => set("slug", e.target.value)} />
          </Field>
          <Field label="Mã tour" hint="Ví dụ ST01.">
            <input className={inputClass} value={form.tourCode} onChange={(e) => set("tourCode", e.target.value)} />
          </Field>
          <Field label="Mô tả ngắn" required hint="Tối đa 220 ký tự, hiển thị trên thẻ tour." error={errorFor("summary")} className="md:col-span-2">
            <textarea className={textareaClass} rows={2} value={form.summary} onChange={(e) => set("summary", e.target.value)} />
          </Field>
          <Field label="Thời lượng (ngày)" required error={errorFor("durationDays")}>
            <input type="number" min={1} className={inputClass} value={form.durationDays} onChange={(e) => set("durationDays", e.target.value)} />
          </Field>
          <Field label="Số đêm" error={errorFor("durationNights")}>
            <input type="number" min={0} className={inputClass} value={form.durationNights} onChange={(e) => set("durationNights", e.target.value)} />
          </Field>
        </div>
      </section>

      {/* --- Classification ---------------------------------------------- */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-bold text-foreground">Danh mục & điểm đến</h2>
        {errorFor("categoryIds") ? <p className="mt-2 text-xs font-medium text-danger">{errorFor("categoryIds")}</p> : null}
        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Danh mục</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    form.categoryIds.includes(category.id)
                      ? "border-brand-300 bg-primary-soft text-primary-strong"
                      : "border-border-strong bg-surface text-foreground-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.categoryIds.includes(category.id)}
                    onChange={() => toggleId("categoryIds", category.id)}
                  />
                  {category.name}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Điểm đến</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {destinations.map((destination) => (
                <label
                  key={destination.id}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    form.destinationIds.includes(destination.id)
                      ? "border-brand-300 bg-primary-soft text-primary-strong"
                      : "border-border-strong bg-surface text-foreground-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.destinationIds.includes(destination.id)}
                    onChange={() => toggleId("destinationIds", destination.id)}
                  />
                  {destination.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      {/* --- Content ------------------------------------------------------ */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-bold text-foreground">Nội dung</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <MultiLineField label="Điểm nổi bật" value={form.highlights} onChange={(v) => set("highlights", v)} />
          <MultiLineField label="Tổng quan (mỗi dòng một đoạn)" value={form.overview} onChange={(v) => set("overview", v)} />
          <MultiLineField label="Điểm đón" value={form.departurePoints} onChange={(v) => set("departurePoints", v)} />
          <MultiLineField label="Điểm trả" value={form.returnPoints} onChange={(v) => set("returnPoints", v)} />
          <MultiLineField label="Phương tiện" value={form.transport} onChange={(v) => set("transport", v)} />
          <MultiLineField label="Quà tặng / ưu đãi" value={form.gifts} onChange={(v) => set("gifts", v)} />
          <MultiLineField label="Bao gồm" value={form.included} onChange={(v) => set("included", v)} rows={5} />
          <MultiLineField label="Không bao gồm" value={form.excluded} onChange={(v) => set("excluded", v)} rows={5} />
          <MultiLineField label="Lưu ý" value={form.notes} onChange={(v) => set("notes", v)} rows={5} />
          <MultiLineField
            label="Chính sách (đặt cọc, thanh toán, hủy, trẻ em)"
            value={form.policies}
            onChange={(v) => set("policies", v)}
            rows={5}
            hint="Giữ theo từng tour. Mỗi dòng là một điều khoản; không dùng một mức chung cho toàn site."
          />
          <MultiLineField label="Nhãn lọc" value={form.tags} onChange={(v) => set("tags", v)} hint="Ví dụ: 1 ngày, nghỉ dưỡng." />
        </div>
      </section>

      {/* --- Images ------------------------------------------------------- */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Ảnh (ảnh đầu tiên là ảnh đại diện)</h2>
            <p className="mt-1 text-xs text-foreground-subtle">
              Khuyến nghị ảnh bìa 1200×800, banner 1920×1080. Tối đa 10 MB mỗi ảnh.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className={inputClass}
              value=""
              onChange={(event) => {
                const url = event.target.value;
                if (!url) return;
                setForm((current) => ({
                  ...current,
                  images: [...current.images, { src: url, alt: "", width: "", height: "", caption: "" }],
                }));
              }}
            >
              <option value="">+ Chọn ảnh có sẵn…</option>
              {media.map((item) => (
                <option key={item.id} value={item.url}>
                  {item.alt ?? item.url}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-border-strong bg-surface px-3 text-sm font-semibold"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  images: [...current.images, { src: "", alt: "", width: "", height: "", caption: "" }],
                }))
              }
            >
              Thêm dòng
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {form.images.length === 0 ? (
            <p className="text-sm text-foreground-muted">Chưa có ảnh. Tour sẽ dùng ảnh minh hoạ thương hiệu.</p>
          ) : null}
          {form.images.map((image, index) => (
            <div key={index} className="rounded-xl border border-border bg-surface-muted p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Đường dẫn ảnh" hint="Chọn từ thư viện hoặc dán /media/…">
                  <input
                    className={inputClass}
                    value={image.src}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        images: current.images.map((item, i) => (i === index ? { ...item, src: event.target.value } : item)),
                      }))
                    }
                  />
                </Field>
                <Field label="Mô tả ảnh (alt)" required>
                  <input
                    className={inputClass}
                    value={image.alt}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        images: current.images.map((item, i) => (i === index ? { ...item, alt: event.target.value } : item)),
                      }))
                    }
                  />
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <button
                  type="button"
                  className="inline-flex min-h-9 items-center rounded-lg border border-border-strong bg-surface px-3 text-xs font-semibold"
                  onClick={() =>
                    setForm((current) => {
                      const next = [...current.images];
                      if (index > 0) [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      return { ...current, images: next };
                    })
                  }
                >
                  ↑ Lên
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-9 items-center rounded-lg border border-danger/40 bg-danger-soft px-3 text-xs font-semibold text-danger"
                  onClick={() =>
                    setForm((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) }))
                  }
                >
                  Xoá ảnh
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Itinerary ---------------------------------------------------- */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">Lịch trình theo ngày</h2>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold"
            onClick={() =>
              setForm((current) => ({
                ...current,
                itinerary: [
                  ...current.itinerary,
                  { title: `Ngày ${current.itinerary.length + 1}`, summary: "", activities: "", meals: "", places: "", accommodation: "" },
                ],
              }))
            }
          >
            + Thêm ngày
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {form.itinerary.map((day, index) => (
            <div key={index} className="rounded-xl border border-border bg-surface-muted p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Ngày {index + 1}</p>
                <button
                  type="button"
                  className="text-xs font-semibold text-danger"
                  onClick={() =>
                    setForm((current) => ({ ...current, itinerary: current.itinerary.filter((_, i) => i !== index) }))
                  }
                >
                  Xoá ngày
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Tiêu đề ngày" required>
                  <input
                    className={inputClass}
                    value={day.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        itinerary: current.itinerary.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)),
                      }))
                    }
                  />
                </Field>
                <Field label="Tóm tắt ngày">
                  <input
                    className={inputClass}
                    value={day.summary}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        itinerary: current.itinerary.map((item, i) => (i === index ? { ...item, summary: event.target.value } : item)),
                      }))
                    }
                  />
                </Field>
                <Field label="Hoạt động / khung giờ" hint="Mỗi dòng một mốc.">
                  <textarea
                    className={textareaClass}
                    rows={4}
                    value={day.activities}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        itinerary: current.itinerary.map((item, i) => (i === index ? { ...item, activities: event.target.value } : item)),
                      }))
                    }
                  />
                </Field>
                <div className="flex flex-col gap-3">
                  <Field label="Bữa ăn" hint="Ví dụ: Sáng, Trưa, Tối.">
                    <textarea
                      className={textareaClass}
                      rows={2}
                      value={day.meals}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          itinerary: current.itinerary.map((item, i) => (i === index ? { ...item, meals: event.target.value } : item)),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Điểm dừng">
                    <textarea
                      className={textareaClass}
                      rows={2}
                      value={day.places}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          itinerary: current.itinerary.map((item, i) => (i === index ? { ...item, places: event.target.value } : item)),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Nơi nghỉ đêm">
                    <input
                      className={inputClass}
                      value={day.accommodation}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          itinerary: current.itinerary.map((item, i) => (i === index ? { ...item, accommodation: event.target.value } : item)),
                        }))
                      }
                    />
                  </Field>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- Pricing ------------------------------------------------------ */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Bảng giá theo gói / hạng lưu trú</h2>
            <p className="mt-1 text-xs text-foreground-subtle">
              Giá thấp nhất (theo người lớn) trở thành giá &quot;Từ …&quot;. Không có gói nào thì hiển thị &quot;Liên hệ tư vấn&quot;.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold"
            onClick={() =>
              setForm((current) => ({
                ...current,
                pricingOptions: [
                  ...current.pricingOptions,
                  { id: "", label: "", accommodationClass: "", adultPrice: "", childPrice: "", surcharge: "", validFrom: "", validTo: "", note: "" },
                ],
              }))
            }
          >
            + Thêm gói giá
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          {form.pricingOptions.map((option, index) => (
            <div key={index} className="rounded-xl border border-border bg-surface-muted p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Gói {index + 1}</p>
                <button
                  type="button"
                  className="text-xs font-semibold text-danger"
                  onClick={() =>
                    setForm((current) => ({ ...current, pricingOptions: current.pricingOptions.filter((_, i) => i !== index) }))
                  }
                >
                  Xoá gói
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                {(
                  [
                    ["label", "Tên gói", "Ví dụ: Khách sạn 3 sao"],
                    ["accommodationClass", "Hạng lưu trú", "Khách sạn 3 sao"],
                    ["adultPrice", "Giá người lớn (VNĐ)", "2940000"],
                    ["childPrice", "Giá trẻ em (VNĐ)", "1764000"],
                    ["surcharge", "Phụ thu", "Phụ thu lễ/Tết"],
                    ["validFrom", "Áp dụng từ", ""],
                    ["validTo", "Áp dụng đến", ""],
                    ["note", "Ghi chú", ""],
                  ] as const
                ).map(([key, label, placeholder]) => (
                  <Field key={key} label={label}>
                    <input
                      className={inputClass}
                      placeholder={placeholder}
                      value={option[key]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          pricingOptions: current.pricingOptions.map((item, i) =>
                            i === index ? { ...item, [key]: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                  </Field>
                ))}
              </div>
            </div>
          ))}
          {form.pricingOptions.length === 0 ? (
            <p className="text-sm text-foreground-muted">Chưa có giá. Tour sẽ hiển thị &quot;Liên hệ tư vấn&quot;.</p>
          ) : null}
        </div>
      </section>

      {/* --- SEO & publishing -------------------------------------------- */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-bold text-foreground">SEO & hiển thị</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Tiêu đề SEO">
            <input className={inputClass} value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
          </Field>
          <Field label="Mô tả SEO">
            <input className={inputClass} value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
          </Field>
          <Field label="Ảnh chia sẻ (OG)" hint="Đường dẫn nội bộ, ví dụ /media/…">
            <input className={inputClass} value={form.seoOgImage} onChange={(e) => set("seoOgImage", e.target.value)} />
          </Field>
          <Field label="Thứ tự hiển thị" hint="Số nhỏ hiển thị trước.">
            <input type="number" min={0} className={inputClass} value={form.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
          </Field>
          <Field label="Trạng thái">
            <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value as TourFormState["status"])}>
              <option value="draft">Nháp (chưa hiển thị)</option>
              <option value="published">Xuất bản (hiển thị công khai)</option>
              <option value="hidden">Ẩn (không hiển thị)</option>
            </select>
          </Field>
          <Field label="Mức độ nội dung">
            <select
              className={inputClass}
              value={form.contentStatus}
              onChange={(e) => set("contentStatus", e.target.value as TourFormState["contentStatus"])}
            >
              <option value="demo">Chưa duyệt (demo)</option>
              <option value="verified">Đã duyệt</option>
            </select>
          </Field>
          <label className="flex items-center gap-3 text-sm font-semibold text-foreground">
            <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="h-5 w-5 rounded border-border-strong" />
            Ghim là tour nổi bật
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/95 p-4 shadow-card backdrop-blur">
        <SubmitButton pendingLabel="Đang lưu…">Lưu tour</SubmitButton>
        <Link
          href="/admin/tours"
          className="inline-flex min-h-11 items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-foreground"
        >
          Quay lại danh sách
        </Link>
        {form.slug ? (
          <a
            href={`/tour/${form.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary-strong hover:underline"
          >
            Xem trước ↗
          </a>
        ) : null}
      </div>
    </form>
  );
}

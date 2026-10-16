"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveArticleAction } from "@/server/admin/actions";
import { emptyActionState } from "@/server/admin/action-state";
import { Alert, Field, inputClass, textareaClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";
import {
  blocksToPayload,
  emptyBlock,
  type ArticleFormBlock,
  type ArticleFormState,
} from "./article-form-model";

/**
 * Article editor.
 *
 * The body is a list of structured blocks, not raw HTML. That is deliberate:
 * there is no `dangerouslySetInnerHTML` anywhere in the render path, so a stored
 * article cannot carry a script — the strongest form of stored-XSS defence.
 */

const BLOCK_LABELS: Record<ArticleFormBlock["type"], string> = {
  paragraph: "Đoạn văn",
  heading: "Tiêu đề phụ",
  list: "Danh sách",
  quote: "Trích dẫn",
  callout: "Hộp ghi chú",
  image: "Ảnh",
};

function buildPayload(form: ArticleFormState): Record<string, unknown> {
  const split = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  const reading = form.readingMinutes.trim() === "" ? undefined : Number(form.readingMinutes);

  return {
    id: form.id,
    slug: form.slug,
    title: form.title,
    excerpt: form.excerpt,
    author: form.author,
    readingMinutes: Number.isFinite(reading) ? reading : undefined,
    coverSrc: form.coverSrc.trim() || undefined,
    coverAlt: form.coverAlt.trim() || undefined,
    tags: split(form.tags),
    destinationIds: form.destinationIds,
    relatedTourSlugs: form.relatedTourSlugs,
    body: blocksToPayload(form.body),
    publishedAt: form.publishedAt,
    updatedAt: form.updatedAt.trim() || undefined,
    seoTitle: form.seoTitle || undefined,
    seoDescription: form.seoDescription || undefined,
    seoOgImage: form.seoOgImage || undefined,
    contentStatus: form.contentStatus,
    status: form.status,
    featured: form.featured,
    sortOrder: Number(form.sortOrder) || 0,
  };
}

export function ArticleForm({
  initial,
  destinations,
  tours,
  media,
  saved,
}: {
  initial: ArticleFormState;
  destinations: { id: string; name: string }[];
  tours: { slug: string; title: string }[];
  media: { id: string; url: string; alt: string | null }[];
  saved?: boolean;
}) {
  const [form, setForm] = useState<ArticleFormState>(() => {
    if (initial.publishedAt) return initial;
    // Default a brand-new article to today. Done in the client initialiser so
    // the server render stays deterministic.
    return { ...initial, publishedAt: new Date().toISOString().slice(0, 10) };
  });
  const [state, action] = useActionState(saveArticleAction, emptyActionState);

  const set = <K extends keyof ArticleFormState>(key: K, value: ArticleFormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const updateBlock = (index: number, patch: Partial<ArticleFormBlock>) =>
    setForm((current) => ({
      ...current,
      body: current.body.map((block, i) => (i === index ? { ...block, ...patch } : block)),
    }));

  const moveBlock = (index: number, direction: -1 | 1) =>
    setForm((current) => {
      const next = [...current.body];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...current, body: next };
    });

  const errorFor = (field: string) => (state.ok === false ? state.fieldErrors?.[field]?.[0] : undefined);
  const textField = (key: keyof ArticleFormState) => ({
    value: String(form[key] ?? ""),
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(key, event.target.value as never),
  });

  return (
    <form action={action} className="flex flex-col gap-8">
      <input type="hidden" name="payload" value={JSON.stringify(buildPayload(form))} />

      {state.ok === false ? <Alert tone="error">{state.message}</Alert> : null}
      {saved && state.ok !== false ? <Alert tone="success">Đã lưu bài viết.</Alert> : null}

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-bold text-foreground">Thông tin bài viết</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label="Tiêu đề" required error={errorFor("title")} className="md:col-span-2">
            <input className={inputClass} {...textField("title")} />
          </Field>
          <Field label="Slug" required hint="Đổi slug sẽ tự tạo chuyển hướng 301." error={errorFor("slug")}>
            <input className={inputClass} {...textField("slug")} />
          </Field>
          <Field label="Tác giả">
            <input className={inputClass} {...textField("author")} />
          </Field>
          <Field label="Tóm tắt" required error={errorFor("excerpt")} className="md:col-span-2">
            <textarea className={textareaClass} rows={2} {...textField("excerpt")} />
          </Field>
          <Field label="Ngày đăng" required error={errorFor("publishedAt")}>
            <input type="date" className={inputClass} {...textField("publishedAt")} />
          </Field>
          <Field label="Ngày cập nhật nội dung" hint="Ví dụ: ngày duyệt lại bản dịch.">
            <input type="date" className={inputClass} {...textField("updatedAt")} />
          </Field>
          <Field label="Thời gian đọc (phút)">
            <input type="number" min={1} className={inputClass} {...textField("readingMinutes")} />
          </Field>
          <Field label="Nhãn" hint="Mỗi dòng một nhãn.">
            <textarea className={textareaClass} rows={2} {...textField("tags")} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-bold text-foreground">Ảnh bìa</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <Field label="Đường dẫn ảnh" hint="Chọn từ thư viện hoặc dán /media/…">
            <input className={inputClass} {...textField("coverSrc")} />
          </Field>
          <Field label="Mô tả ảnh (alt)" required={Boolean(form.coverSrc)}>
            <input className={inputClass} {...textField("coverAlt")} />
          </Field>
          <Field label="Chọn ảnh có sẵn">
            <select
              className={inputClass}
              value=""
              onChange={(event) => {
                if (!event.target.value) return;
                const chosen = media.find((item) => item.url === event.target.value);
                setForm((current) => ({
                  ...current,
                  coverSrc: event.target.value,
                  coverAlt: current.coverAlt || chosen?.alt || "",
                }));
              }}
            >
              <option value="">+ Chọn ảnh…</option>
              {media.map((item) => (
                <option key={item.id} value={item.url}>
                  {item.alt ?? item.url}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="mt-3 text-xs text-foreground-subtle">Khuyến nghị ảnh bìa 1200×800, tối đa 10 MB.</p>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Nội dung</h2>
            <p className="mt-1 text-xs text-foreground-subtle">
              Nội dung là các khối có cấu trúc: an toàn, không chèn được HTML.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(BLOCK_LABELS) as ArticleFormBlock["type"][]).map((type) => (
              <button
                key={type}
                type="button"
                className="inline-flex min-h-9 items-center rounded-lg border border-border-strong bg-surface px-3 text-xs font-semibold"
                onClick={() => setForm((current) => ({ ...current, body: [...current.body, emptyBlock(type)] }))}
              >
                + {BLOCK_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          {form.body.map((block, index) => (
            <div key={block.key} className="rounded-xl border border-border bg-surface-muted p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-primary-strong">
                  {BLOCK_LABELS[block.type]}
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" className="text-xs font-semibold text-foreground-muted" onClick={() => moveBlock(index, -1)}>
                    ↑
                  </button>
                  <button type="button" className="text-xs font-semibold text-foreground-muted" onClick={() => moveBlock(index, 1)}>
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-danger"
                    onClick={() => setForm((current) => ({ ...current, body: current.body.filter((_, i) => i !== index) }))}
                  >
                    Xoá
                  </button>
                </div>
              </div>

              <div className="mt-3">
                {block.type === "paragraph" ? (
                  <textarea className={textareaClass} rows={3} value={block.text} onChange={(e) => updateBlock(index, { text: e.target.value })} />
                ) : null}

                {block.type === "heading" ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr]">
                    <select className={inputClass} value={block.level} onChange={(e) => updateBlock(index, { level: e.target.value as "2" | "3" })}>
                      <option value="2">Cấp 2</option>
                      <option value="3">Cấp 3</option>
                    </select>
                    <input className={inputClass} value={block.text} onChange={(e) => updateBlock(index, { text: e.target.value })} />
                  </div>
                ) : null}

                {block.type === "list" ? (
                  <div className="grid grid-cols-1 gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-foreground-muted">
                      <input type="checkbox" checked={block.ordered} onChange={(e) => updateBlock(index, { ordered: e.target.checked })} />
                      Danh sách có số thứ tự
                    </label>
                    <textarea className={textareaClass} rows={3} value={block.items} onChange={(e) => updateBlock(index, { items: e.target.value })} placeholder="Mỗi dòng một mục" />
                  </div>
                ) : null}

                {block.type === "quote" ? (
                  <div className="grid grid-cols-1 gap-3">
                    <textarea className={textareaClass} rows={2} value={block.text} onChange={(e) => updateBlock(index, { text: e.target.value })} />
                    <input className={inputClass} value={block.cite} onChange={(e) => updateBlock(index, { cite: e.target.value })} placeholder="Nguồn (không bắt buộc)" />
                  </div>
                ) : null}

                {block.type === "callout" ? (
                  <div className="grid grid-cols-1 gap-3">
                    <select className={inputClass} value={block.tone} onChange={(e) => updateBlock(index, { tone: e.target.value as ArticleFormBlock["tone"] })}>
                      <option value="info">Thông tin</option>
                      <option value="tip">Mẹo</option>
                      <option value="warning">Lưu ý</option>
                    </select>
                    <input className={inputClass} value={block.title} onChange={(e) => updateBlock(index, { title: e.target.value })} placeholder="Tiêu đề (không bắt buộc)" />
                    <textarea className={textareaClass} rows={2} value={block.text} onChange={(e) => updateBlock(index, { text: e.target.value })} />
                  </div>
                ) : null}

                {block.type === "image" ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input className={inputClass} value={block.src} onChange={(e) => updateBlock(index, { src: e.target.value })} placeholder="/media/…" />
                    <input className={inputClass} value={block.alt} onChange={(e) => updateBlock(index, { alt: e.target.value })} placeholder="Mô tả ảnh (bắt buộc)" />
                    <input className={inputClass} value={block.caption} onChange={(e) => updateBlock(index, { caption: e.target.value })} placeholder="Chú thích (không bắt buộc)" />
                    <select
                      className={inputClass}
                      value=""
                      onChange={(event) => {
                        if (!event.target.value) return;
                        const chosen = media.find((item) => item.url === event.target.value);
                        updateBlock(index, { src: event.target.value, alt: block.alt || chosen?.alt || "" });
                      }}
                    >
                      <option value="">+ Chọn ảnh có sẵn…</option>
                      {media.map((item) => (
                        <option key={item.id} value={item.url}>
                          {item.alt ?? item.url}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-bold text-foreground">Liên kết & SEO</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <fieldset className="md:col-span-2">
            <legend className="text-sm font-semibold text-foreground">Điểm đến liên quan</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {destinations.map((destination) => {
                const active = form.destinationIds.includes(destination.id);
                return (
                  <label
                    key={destination.id}
                    className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      active ? "border-brand-300 bg-primary-soft text-primary-strong" : "border-border-strong bg-surface text-foreground-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={active}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          destinationIds: active
                            ? current.destinationIds.filter((id) => id !== destination.id)
                            : [...current.destinationIds, destination.id],
                        }))
                      }
                    />
                    {destination.name}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="md:col-span-2">
            <legend className="text-sm font-semibold text-foreground">Tour liên quan</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {tours.map((tour) => {
                const active = form.relatedTourSlugs.includes(tour.slug);
                return (
                  <label
                    key={tour.slug}
                    className={`inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      active ? "border-brand-300 bg-primary-soft text-primary-strong" : "border-border-strong bg-surface text-foreground-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={active}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          relatedTourSlugs: active
                            ? current.relatedTourSlugs.filter((slug) => slug !== tour.slug)
                            : [...current.relatedTourSlugs, tour.slug],
                        }))
                      }
                    />
                    {tour.title}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <Field label="Tiêu đề SEO">
            <input className={inputClass} {...textField("seoTitle")} />
          </Field>
          <Field label="Mô tả SEO">
            <input className={inputClass} {...textField("seoDescription")} />
          </Field>
          <Field label="Ảnh chia sẻ (OG)">
            <input className={inputClass} {...textField("seoOgImage")} />
          </Field>
          <Field label="Thứ tự hiển thị">
            <input type="number" min={0} className={inputClass} {...textField("sortOrder")} />
          </Field>
          <Field label="Trạng thái">
            <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value as ArticleFormState["status"])}>
              <option value="draft">Nháp (không hiển thị, không vào API công khai)</option>
              <option value="published">Xuất bản</option>
              <option value="hidden">Ẩn</option>
            </select>
          </Field>
          <Field label="Mức độ nội dung">
            <select
              className={inputClass}
              value={form.contentStatus}
              onChange={(e) => set("contentStatus", e.target.value as ArticleFormState["contentStatus"])}
            >
              <option value="demo">Chưa duyệt (demo)</option>
              <option value="verified">Đã duyệt</option>
            </select>
          </Field>
          <label className="flex items-center gap-3 text-sm font-semibold text-foreground">
            <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} className="h-5 w-5" />
            Ghim làm bài nổi bật
          </label>
        </div>
      </section>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface/95 p-4 shadow-card backdrop-blur">
        <SubmitButton pendingLabel="Đang lưu…">Lưu bài viết</SubmitButton>
        <Link href="/admin/articles" className="inline-flex min-h-11 items-center rounded-xl border border-border-strong bg-surface px-4 text-sm font-semibold text-foreground">
          Quay lại danh sách
        </Link>
        {form.slug ? (
          <a
            href={`/cam-nang-du-lich/${form.slug}`}
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

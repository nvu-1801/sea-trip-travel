"use client";

import { useActionState, useState } from "react";
import { saveSettingsAction } from "@/server/admin/actions";
import { emptyActionState } from "@/server/admin/action-state";
import { Alert, Field, inputClass, textareaClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/buttons";

export type SettingsField = {
  key: string;
  label: string;
  hint?: string;
  /** Defaults to a single-line text input. */
  type?: "text" | "textarea" | "media" | "tours";
  placeholder?: string;
};

/**
 * One owner-editable settings section.
 *
 * Only the fields the UI actually renders are exposed — the brief explicitly
 * rules out a page builder. Empty fields are dropped server-side, so clearing a
 * field restores the shipped default rather than blanking the page.
 */
export function SettingsForm({
  section,
  locale,
  title,
  description,
  fields,
  initial,
  media = [],
  tourOptions = [],
}: {
  section: "hero" | "contact" | "social" | "home";
  locale: "vi" | "en";
  title: string;
  description?: string;
  fields: SettingsField[];
  initial: Record<string, string | string[]>;
  media?: { id: string; url: string; alt: string | null }[];
  tourOptions?: { slug: string; title: string }[];
}) {
  const [values, setValues] = useState<Record<string, string | string[]>>(initial);
  const [state, action] = useActionState(saveSettingsAction, emptyActionState);

  const set = (key: string, value: string | string[]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const payload = Object.fromEntries(
    Object.entries(values).filter(([, value]) =>
      Array.isArray(value) ? value.length > 0 : String(value).trim() !== "",
    ),
  );

  return (
    <form action={action} className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-xs leading-relaxed text-foreground-subtle">{description}</p> : null}
        </div>
        <SubmitButton variant="secondary" pendingLabel="Đang lưu…">
          Lưu
        </SubmitButton>
      </div>

      {state.ok === true ? (
        <div className="mt-4">
          <Alert tone="success">{state.message}</Alert>
        </div>
      ) : null}
      {state.ok === false ? (
        <div className="mt-4">
          <Alert tone="error">{state.message}</Alert>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        {fields.map((field) => {
          const value = values[field.key];
          if (field.type === "media") {
            return (
              <Field key={field.key} label={field.label} hint={field.hint ?? "Chọn ảnh có sẵn hoặc dán /media/…"}>
                <div className="flex flex-col gap-2">
                  <input
                    className={inputClass}
                    value={String(value ?? "")}
                    placeholder="/media/…"
                    onChange={(event) => set(field.key, event.target.value)}
                  />
                  <select
                    className={inputClass}
                    value=""
                    onChange={(event) => {
                      if (!event.target.value) return;
                      set(field.key, event.target.value);
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
              </Field>
            );
          }

          if (field.type === "tours") {
            const selected = Array.isArray(value) ? value : [];
            return (
              <fieldset key={field.key} className="md:col-span-2">
                <legend className="text-sm font-semibold text-foreground">{field.label}</legend>
                {field.hint ? <p className="mt-1 text-xs text-foreground-subtle">{field.hint}</p> : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  {tourOptions.map((tour) => {
                    const active = selected.includes(tour.slug);
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
                            set(
                              field.key,
                              active ? selected.filter((slug) => slug !== tour.slug) : [...selected, tour.slug],
                            )
                          }
                        />
                        {tour.title}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          }

          return (
            <Field key={field.key} label={field.label} hint={field.hint} className={field.type === "textarea" ? "md:col-span-2" : undefined}>
              {field.type === "textarea" ? (
                <textarea
                  className={textareaClass}
                  rows={3}
                  value={String(value ?? "")}
                  onChange={(event) => set(field.key, event.target.value)}
                />
              ) : (
                <input
                  className={inputClass}
                  value={String(value ?? "")}
                  placeholder={field.placeholder}
                  onChange={(event) => set(field.key, event.target.value)}
                />
              )}
            </Field>
          );
        })}
      </div>
    </form>
  );
}

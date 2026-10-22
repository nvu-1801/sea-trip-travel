/** Merge SEO defaults without ever overwriting an existing title/description. */
export type Seo = { title?: string; description?: string };

export function fillSeoFields(
  current: unknown,
  fallback: { title: string; description: string },
): Seo | null {
  const value =
    current && typeof current === "object"
      ? ({ ...(current as Seo) } satisfies Seo)
      : {};
  let changed = false;
  if (!value.title?.trim()) {
    value.title = fallback.title;
    changed = true;
  }
  if (!value.description?.trim()) {
    value.description = fallback.description;
    changed = true;
  }
  return changed ? value : null;
}

import { defaultLanding, landingSchema } from "@/domain/landing";

/**
 * Draft data for the Home-section modal.
 *
 * Rows saved before a landing section existed may not contain that key. Run the
 * saved record through the schema so every nested default (logo/video arrays,
 * new copy fields) exists before the editor mounts; saved values still win.
 */
export function homeSectionDraft(
  saved: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  if (key === "hero") return structuredClone(saved);
  const defaults = structuredClone(defaultLanding) as Record<string, unknown>;
  const merged = { ...defaults, ...structuredClone(saved) };
  const parsed = landingSchema.safeParse(merged);
  if (parsed.success) return parsed.data as Record<string, unknown>;
  // Legacy rows can predate a field that is now required. Keep them editable by
  // merging only the section being opened instead of blocking the modal.
  const section = (defaults[key] ?? {}) as Record<string, unknown>;
  const current = (merged[key] ?? {}) as Record<string, unknown>;
  return {
    ...merged,
    [key]: { ...section, ...current },
  };
}

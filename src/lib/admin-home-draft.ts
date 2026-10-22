import { defaultLanding } from "@/domain/landing";

/**
 * Draft data for the Home-section modal.
 *
 * Rows saved before a landing section existed may not contain that key. Merge
 * the defaults under the saved record so the editor always receives an object;
 * saved values win, untouched sections keep their default shape.
 */
export function homeSectionDraft(
  saved: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  if (key === "hero") return structuredClone(saved);
  return {
    ...(structuredClone(defaultLanding) as Record<string, unknown>),
    ...structuredClone(saved),
  };
}

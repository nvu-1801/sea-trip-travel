/**
 * URL map for the Studio. The sidebar, quick search and “Sửa tour” jumps all
 * use this instead of local tab state, so reload and Back/Forward land on the
 * same section.
 */
export const ADMIN_SECTION_PATHS = {
  overview: "/admin",
  home: "/admin/home",
  theme: "/admin/theme",
  tours: "/admin/tours",
  articles: "/admin/articles",
  categories: "/admin/categories",
  destinations: "/admin/destinations",
  media: "/admin/media",
  messages: "/admin/messages",
  settings: "/admin/settings",
  leads: "/admin/leads",
  activity: "/admin/activity",
  health: "/admin/health",
  account: "/admin/account",
} as const;

export type AdminSection = keyof typeof ADMIN_SECTION_PATHS;

export const ADMIN_SECTIONS = Object.keys(
  ADMIN_SECTION_PATHS,
) as AdminSection[];

export function isAdminSection(value: string): value is AdminSection {
  return Object.hasOwn(ADMIN_SECTION_PATHS, value);
}

export function adminSectionHref(
  section: string,
  open?: { id: string; slug?: string },
): string {
  const base =
    ADMIN_SECTION_PATHS[section as AdminSection] ?? ADMIN_SECTION_PATHS.overview;
  if (!open) return base;
  const params = new URLSearchParams({ edit: open.slug || open.id });
  return `${base}?${params.toString()}`;
}

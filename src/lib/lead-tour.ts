export type TourOption = { value: string; label: string };

/**
 * Pick the tour a lead already chose. The slug is authoritative; if it is
 * missing or no longer published, an exact title match from the lead's
 * free-text interest is the only safe fallback.
 */
export function tourSlugForLead(
  lead: { tourSlug: string; interest: string } | undefined,
  options: TourOption[],
): string {
  if (!lead) return "";
  if (lead.tourSlug && options.some((option) => option.value === lead.tourSlug)) {
    return lead.tourSlug;
  }
  const interest = lead.interest.trim().toLowerCase();
  if (!interest) return "";
  return (
    options.find((option) => option.label.trim().toLowerCase() === interest)
      ?.value ?? ""
  );
}

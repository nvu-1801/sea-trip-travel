/**
 * Pure placement helpers for the customer-video coverflow.
 *
 * Keeping the wrap arithmetic out of the client component makes the seamless
 * loop testable: index 0 is the centre, −1 the card on its left and +1 the card
 * on its right, regardless of how many videos the CMS contains.
 */
export function customerVideoSlot(
  index: number,
  active: number,
  count: number,
): number {
  if (count <= 0) return 0;
  let slot = index - active;
  if (slot > count / 2) slot -= count;
  if (slot < -count / 2) slot += count;
  return slot;
}

/** How many cards each side of the centre remain visible at this breakpoint. */
export function customerVideoSideCount(count: number, compact: boolean): number {
  if (count <= 1) return 0;
  if (compact) return 1;
  return count >= 5 ? 2 : 1;
}

/**
 * Card-sized version of a CMS video title. The full string is still used in the
 * accessible name; visually we remove the repeated organizer suffix so the
 * headline reads like a title, not a legal caption.
 */
export function customerDisplayTitle(title: string): string {
  const cleaned = title
    .replace(
      /\s*[-–—|,]\s*(?:đơn vị tổ chức|đơn vị thực hiện|organi[sz]er|organi[sz]ed by)\s*:?\s*.*$/i,
      "",
    )
    .replace(/^sea\s+trip\s+travel\s+(?:đồng hành cùng|đồng hành|travels? with)\s+/i, "")
    .replace(/\s*[-–—|]\s*sea\s+trip\s+travel\s*\.?$/i, "")
    .replace(/\s+/g, " ")
    .replace(/[.\s]+$/, "")
    .trim();
  return cleaned || title.trim();
}

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

/**
 * Default cover files replaced in the repository. Bump the revision whenever
 * their pixels change: the same URL is cached by the browser and the Next image
 * optimizer, so a query revision is the smallest way to serve the new frame
 * without touching owner-uploaded covers.
 */
const STOCK_VIDEO_COVERS = new Set([
  "/images/customers/videos/cKpNJv2x-3I.jpg",
  "/images/customers/videos/8ybMTyzbfxo.jpg",
  "/images/customers/videos/uRNs9VkZSx4.jpg",
  "/images/customers/videos/PebkD6IFJD8.jpg",
  "/images/customers/videos/tFTWDt5K8pY.jpg",
  "/images/customers/videos/CcO59qGJLGk.jpg",
]);
export const CUSTOMER_VIDEO_COVER_REVISION = "2026-11-01";

/** Version only the six bundled covers; a custom owner cover stays untouched. */
export function customerVideoCoverSrc(src?: string): string | undefined {
  if (!src || !STOCK_VIDEO_COVERS.has(src)) return src;
  return `${src}?v=${CUSTOMER_VIDEO_COVER_REVISION}`;
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

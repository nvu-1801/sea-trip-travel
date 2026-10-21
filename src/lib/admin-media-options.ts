/** Image fields store a src, not a media record ID. Different library records
 * may describe the same file (tour/hero); expose one choice per stored value.
 * Keep the first record's label and leave the full media library untouched. */
export function mediaSelectOptions(
  library: readonly { src: string; alt: string }[],
): { value: string; label: string }[] {
  const options = new Map<string, { value: string; label: string }>();
  for (const item of library) {
    if (!options.has(item.src)) {
      options.set(item.src, { value: item.src, label: item.alt });
    }
  }
  return [...options.values()];
}

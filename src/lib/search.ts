/** Stable Vietnamese accent folding, including capital Đ. */
export function searchKey(value: string) {
  return value
    .normalize("NFD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

import { customerTours } from "./customer-programs";
import { legacyQuyNhonPhuYenTours } from "./quy-nhon-phu-yen-legacy";

const importedIds = new Set(customerTours.map((tour) => tour.id));
export const quyNhonPhuYenTours = [
  ...customerTours,
  ...legacyQuyNhonPhuYenTours.filter((tour) => !importedIds.has(tour.id)),
];

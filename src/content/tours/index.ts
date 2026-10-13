import { z } from "zod";
import { tourSchema, type Tour } from "@/domain/tour";
import { quyNhonPhuYenTours } from "./quy-nhon-phu-yen";
import { mienTrungTours } from "./mien-trung";
import { mienBacTours } from "./mien-bac";
import { mienNamTours } from "./mien-nam";
import { tayNguyenTours } from "./tay-nguyen";

/**
 * All tours, validated at module load.
 *
 * `parse` runs once when this module is first imported. If any record breaks
 * the domain contract the build fails loudly instead of shipping broken data.
 * This is the "validation gate" between the content files and the UI.
 */
export const tours: readonly Tour[] = z.array(tourSchema).parse([
  ...quyNhonPhuYenTours,
  ...mienTrungTours,
  ...mienBacTours,
  ...mienNamTours,
  ...tayNguyenTours,
]);

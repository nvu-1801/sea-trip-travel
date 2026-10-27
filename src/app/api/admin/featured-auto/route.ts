import { requireSession } from "@/server/cms/auth";
import { handle, reply } from "@/server/cms/http";
import { getAutomaticFeaturedTours } from "@/lib/data/tours";

export const dynamic = "force-dynamic";

/**
 * The six tours the home page is showing while "Tour nổi bật" has no manual
 * pins. The Studio editor lists them read-only so "tự động" is not a mystery
 * number, and each row can jump to the tour form.
 */
export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    return reply(
      getAutomaticFeaturedTours(6, "vi").map((tour) => ({
        key: tour.slug,
        label: tour.title,
        duration: `${tour.duration.days}N${tour.duration.nights}Đ`,
        price: tour.priceFrom
          ? `${tour.priceFrom.amount.toLocaleString("vi-VN")} ₫`
          : null,
      })),
    );
  });
}

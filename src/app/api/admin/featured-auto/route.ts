import { requireSession } from "@/server/cms/auth";
import { handle, reply } from "@/server/cms/http";
import { getAutomaticFeaturedTours } from "@/lib/data/tours";
import { FEATURED_LIMIT } from "@/lib/featured";

export const dynamic = "force-dynamic";

/**
 * The tours the home page shows while “Tour nổi bật” is on automatic. The
 * Studio editor computes the same list locally; this endpoint remains for
 * older clients and scripted checks.
 */
export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const categoryId =
      new URL(request.url).searchParams.get("categoryId") ?? undefined;
    return reply(
      getAutomaticFeaturedTours(FEATURED_LIMIT, "vi", categoryId).map((tour) => ({
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

import { activePromotion } from "@/domain/promotion";
import { reply } from "@/server/cms/http";
import { publicPromotions } from "@/server/cms/promotions";

export async function GET(request: Request) {
  const tour = new URL(request.url).searchParams.get("tour");
  if (tour !== null && !/^[a-z0-9-]{1,120}$/.test(tour)) return reply(null);
  return reply(activePromotion(publicPromotions(), tour, Date.now()) ?? null);
}

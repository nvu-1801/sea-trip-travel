import "server-only";
import { published } from "./store";
import { db } from "./db";
import type { Promotion, PublicPromotion } from "@/domain/promotion";

export function publicPromotions(): PublicPromotion[] {
  const items = published<Promotion>("promotions", []);
  if (!items.length) return [];
  const closed = new Set(db().prepare("SELECT campaign_id FROM promotion_results").all().map((row) => row.campaign_id));
  return items.filter((item) => !closed.has(item.id)).map(({ name, ...item }) => {
    void name;
    return item;
  });
}

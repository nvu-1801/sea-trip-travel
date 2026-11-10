import "server-only";
import { published } from "./store";
import type { Promotion, PublicPromotion } from "@/domain/promotion";

export function publicPromotions(): PublicPromotion[] {
  return published<Promotion>("promotions", []).map(({ name, ...item }) => {
    void name;
    return item;
  });
}

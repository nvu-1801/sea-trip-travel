import type { Metadata } from "next";
import {
  CategoryPageView,
  buildCategoryMetadata,
} from "@/features/tours/category-page-view";

/**
 * Category route. The path is a constant rather than a route param so this page
 * stays a fully static prerender.
 */
const CATEGORY_PATH = "/tour-quy-nhon-phu-yen/tour-quy-nhon-1-ngay";

export const metadata: Metadata = buildCategoryMetadata(CATEGORY_PATH);

export default function Page() {
  return <CategoryPageView categoryPath={CATEGORY_PATH} />;
}

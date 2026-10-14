import type { Metadata } from "next";
import { buildCategoryMetadata, CategoryPageView } from "@/features/tours/category-page-view";
import { resolveLocaleFromParams } from "@/i18n/params";

const CATEGORY_PATH = "/tour-quy-nhon-phu-yen/tour-quy-nhon-1-ngay";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  return buildCategoryMetadata(CATEGORY_PATH, await resolveLocaleFromParams(params));
}

export default async function Page({ params }: PageProps<"/[locale]">) {
  return (
    <CategoryPageView
      categoryPath={CATEGORY_PATH}
      locale={await resolveLocaleFromParams(params)}
    />
  );
}

import { notFound, permanentRedirect } from "next/navigation";
import { getCategoryByPath } from "@/lib/data/categories";
import { contentRedirect } from "@/lib/data/redirects";
import {
  CategoryPageView,
  buildCategoryMetadata,
} from "@/features/tours/category-page-view";
import { resolveLocaleFromParams } from "@/i18n/params";
import { localizePath } from "@/i18n/routing";

/**
 * Catch-all for unmatched paths inside the `[locale]` tree.
 *
 * Without it, a URL that matches no route (e.g. `/khong-ton-tai`) never enters
 * the `[locale]` segment, so Next serves the framework's default (English) 404
 * and the localized `not-found.tsx` is bypassed. Matching here and calling
 * `notFound()` sends the request through the localized boundary instead.
 *
 * Real routes always win: a catch-all is the lowest-priority match, so this only
 * fires for genuinely unknown paths.
 */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[...rest]">) {
  const p = await params;
  const locale = await resolveLocaleFromParams(params);
  const path = "/" + p.rest.join("/");
  if (!getCategoryByPath(path, locale)) {
    const target = contentRedirect(path);
    if (target) permanentRedirect(localizePath(locale, target));
  }
  return buildCategoryMetadata(path, locale);
}
export default async function LocaleCatchAll({
  params,
}: PageProps<"/[locale]/[...rest]">) {
  const p = await params,
    locale = await resolveLocaleFromParams(params),
    path = "/" + p.rest.join("/");
  if (getCategoryByPath(path, locale))
    return <CategoryPageView categoryPath={path} locale={locale} />;
  const target = contentRedirect(path);
  if (target) permanentRedirect(localizePath(locale, target));
  notFound();
}

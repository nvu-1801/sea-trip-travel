import "server-only";
import { articles as seedArticles, tourCategories as seedCategories, tours as seedTours } from "@/content";
import type { TravelArticle } from "@/domain/article";
import type { TourCategory } from "@/domain/category";
import type { Tour } from "@/domain/tour";
import { adminSectionHref } from "@/lib/admin-routes";
import {
  seoStatus,
  type HealthSeo,
  type HealthSeoIssue,
} from "@/lib/health";
import { isPlaceholderSlug } from "@/lib/public-slug";
import {
  articleTranslationStatus,
  categoryTranslationStatus,
  tourTranslationStatus,
} from "@/lib/data/localize";
import { published } from "@/server/cms/store";
import sitemapRoute from "@/app/sitemap";
import robotsRoute from "@/app/robots";

/**
 * Deterministic SEO audit of the published catalogue.
 *
 * No crawling and no third-party API: it checks the same records the site
 * renders, so every finding is actionable and reproducible in CI.
 */

type Kind = "tour" | "article" | "category";

type Page = {
  kind: Kind;
  id: string;
  slug: string;
  name: string;
  title: string;
  description: string;
  customTitle: boolean;
  customDescription: boolean;
  missingCover: boolean;
  missingImageAlt: boolean;
  noDestination: boolean;
  noRelatedTours: boolean;
};

export type SeoAuditInput = {
  tours?: readonly Tour[];
  articles?: readonly TravelArticle[];
  categories?: readonly TourCategory[];
  englishStatus?: (kind: Kind, id: string) => "missing" | "draft" | "reviewed";
  sitemapUrls?: number | null;
};

const textLength = (value: string) => value.trim().length;

function sample(names: string[], limit = 3): string {
  const shown = names.slice(0, limit).join(" · ");
  return names.length > limit ? `${shown} … (+${names.length - limit})` : shown;
}

export function auditSeo(input: SeoAuditInput = {}): HealthSeo {
  const tours = input.tours ?? published<Tour>("tours", seedTours);
  const articles =
    input.articles ?? published<TravelArticle>("articles", seedArticles);
  const categories =
    input.categories ?? published<TourCategory>("categories", seedCategories);
  const english =
    input.englishStatus ??
    ((kind, id) =>
      kind === "tour"
        ? tourTranslationStatus(id, "en")
        : kind === "article"
          ? articleTranslationStatus(id, "en")
          : categoryTranslationStatus(id, "en"));

  const pages: Page[] = [
    ...tours.map((tour) => {
      const cover =
        tour.images.find((image) => image.src) ?? tour.images[0] ?? null;
      return {
        kind: "tour" as const,
        id: tour.id,
        slug: tour.slug,
        name: tour.title,
        title: tour.seo?.title?.trim() || tour.title,
        description: tour.seo?.description?.trim() || tour.summary,
        customTitle: Boolean(tour.seo?.title?.trim()),
        customDescription: Boolean(tour.seo?.description?.trim()),
        missingCover: !cover?.src,
        missingImageAlt: Boolean(cover?.src && !cover.alt?.trim()),
        noDestination: tour.destinationIds.length === 0,
        noRelatedTours: false,
      };
    }),
    ...articles.map((article) => ({
      kind: "article" as const,
      id: article.id,
      slug: article.slug,
      name: article.title,
      title: article.seo?.title?.trim() || article.title,
      description: article.seo?.description?.trim() || article.excerpt,
      customTitle: Boolean(article.seo?.title?.trim()),
      customDescription: Boolean(article.seo?.description?.trim()),
      missingCover: !article.cover?.src,
      missingImageAlt: Boolean(article.cover?.src && !article.cover.alt?.trim()),
      noDestination: false,
      noRelatedTours: article.relatedTourSlugs.length === 0,
    })),
    ...categories.map((category) => ({
      kind: "category" as const,
      id: category.id,
      slug: category.slug,
      name: category.name,
      title: category.seo?.title?.trim() || category.name,
      description: category.seo?.description?.trim() || category.description,
      customTitle: Boolean(category.seo?.title?.trim()),
      customDescription: Boolean(category.seo?.description?.trim()),
      missingCover: Boolean(category.image && !category.image.src),
      missingImageAlt: Boolean(category.image?.src && !category.image.alt?.trim()),
      noDestination: false,
      noRelatedTours: false,
    })),
  ];

  const issues: HealthSeoIssue[] = [];
  const add = (
    id: string,
    severity: HealthSeoIssue["severity"],
    title: string,
    detail: string,
    count: number,
    href: string | null,
  ) => {
    if (count > 0) issues.push({ id, severity, title, detail, count, href });
  };
  const firstHref = (page: Page) =>
    adminSectionHref(
      page.kind === "tour"
        ? "tours"
        : page.kind === "article"
          ? "articles"
          : "categories",
      { id: page.id, slug: page.slug },
    );

  // --- Metadata -----------------------------------------------------------
  const missingTitle = pages.filter((page) => !page.customTitle);
  const missingDescription = pages.filter((page) => !page.customDescription);
  const shortTitle = pages.filter(
    (page) => textLength(page.title) < 30 || textLength(page.title) > 65,
  );
  const shortDescription = pages.filter(
    (page) =>
      textLength(page.description) < 80 || textLength(page.description) > 170,
  );
  const byTitle = new Map<string, Page[]>();
  const byDescription = new Map<string, Page[]>();
  for (const page of pages) {
    const titleKey = page.title.toLowerCase().replace(/\s+/g, " ").trim();
    const descriptionKey = page.description
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
    byTitle.set(titleKey, [...(byTitle.get(titleKey) ?? []), page]);
    byDescription.set(descriptionKey, [
      ...(byDescription.get(descriptionKey) ?? []),
      page,
    ]);
  }
  const duplicateTitles = [...byTitle.values()].filter(
    (group) => group.length > 1,
  );
  const duplicateDescriptions = [...byDescription.values()].filter(
    (group) => group.length > 1,
  );
  const duplicateTitlePages = duplicateTitles.reduce(
    (sum, group) => sum + group.length,
    0,
  );
  const duplicateDescriptionPages = duplicateDescriptions.reduce(
    (sum, group) => sum + group.length,
    0,
  );

  add(
    "missing-seo-title",
    "low",
    "Chưa đặt title SEO riêng",
    "Trang vẫn dùng tiêu đề hiển thị. Nên viết title 30–65 ký tự cho kết quả tìm kiếm.",
    missingTitle.length,
    missingTitle[0] ? firstHref(missingTitle[0]) : null,
  );
  add(
    "missing-seo-description",
    "low",
    "Chưa đặt description SEO riêng",
    "Đang dùng mô tả ngắn. Nên viết 80–170 ký tự để Google hiển thị đúng ý.",
    missingDescription.length,
    missingDescription[0] ? firstHref(missingDescription[0]) : null,
  );
  add(
    "title-length",
    "medium",
    "Title ngoài khoảng 30–65 ký tự",
    `Ví dụ: ${sample(shortTitle.map((page) => page.name))}`,
    shortTitle.length,
    shortTitle[0] ? firstHref(shortTitle[0]) : null,
  );
  add(
    "description-length",
    "medium",
    "Description ngoài khoảng 80–170 ký tự",
    `Ví dụ: ${sample(shortDescription.map((page) => page.name))}`,
    shortDescription.length,
    shortDescription[0] ? firstHref(shortDescription[0]) : null,
  );
  add(
    "duplicate-title",
    "high",
    "Nhiều trang dùng cùng một title",
    duplicateTitles
      .map((group) => `${group[0].title} (${group.length} trang)`)
      .slice(0, 2)
      .join(" · "),
    duplicateTitlePages,
    duplicateTitles[0] ? firstHref(duplicateTitles[0][0]) : null,
  );
  add(
    "duplicate-description",
    "medium",
    "Nhiều trang dùng cùng một description",
    duplicateDescriptions
      .map((group) => `${group[0].name} (${group.length} trang)`)
      .slice(0, 2)
      .join(" · "),
    duplicateDescriptionPages,
    duplicateDescriptions[0] ? firstHref(duplicateDescriptions[0][0]) : null,
  );

  // --- Content & internal links ------------------------------------------
  const missingCover = pages.filter((page) => page.missingCover);
  const missingAlt = pages.filter((page) => page.missingImageAlt);
  const noDestination = tours.filter((tour) => tour.destinationIds.length === 0);
  const noRelatedTours = articles.filter(
    (article) => article.relatedTourSlugs.length === 0,
  );

  const childrenOf = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    childrenOf.set(category.parentId, [
      ...(childrenOf.get(category.parentId) ?? []),
      category.id,
    ]);
  }
  const descendants = (id: string): string[] => {
    const out = [id];
    for (let index = 0; index < out.length; index += 1)
      out.push(...(childrenOf.get(out[index]) ?? []));
    return out;
  };
  const emptyCategories = categories.filter((category) => {
    const ids = new Set(descendants(category.id));
    return !tours.some((tour) =>
      tour.categoryIds.some((id) => ids.has(id)),
    );
  });

  add(
    "missing-cover",
    "medium",
    "Thiếu ảnh đại diện",
    "Card và ảnh chia sẻ mạng xã hội đang dùng nền thương hiệu thay vì ảnh thật.",
    missingCover.length,
    missingCover[0] ? firstHref(missingCover[0]) : null,
  );
  add(
    "missing-alt",
    "medium",
    "Ảnh thiếu mô tả alt",
    "Ảnh có nguồn nhưng thiếu alt sẽ mất điểm tiếp cận và tìm kiếm ảnh.",
    missingAlt.length,
    missingAlt[0] ? firstHref(missingAlt[0]) : null,
  );
  add(
    "tour-no-destination",
    "low",
    "Tour chưa gắn điểm đến",
    "Điểm đến giúp tour xuất hiện trong tìm kiếm và khối khám phá.",
    noDestination.length,
    noDestination[0]
      ? adminSectionHref("tours", {
          id: noDestination[0].id,
          slug: noDestination[0].slug,
        })
      : null,
  );
  add(
    "article-no-tour",
    "low",
    "Bài viết chưa liên kết tour",
    "Bài cẩm nang nên có ít nhất một tour liên quan để dẫn khách vào phễu.",
    noRelatedTours.length,
    noRelatedTours[0]
      ? adminSectionHref("articles", {
          id: noRelatedTours[0].id,
          slug: noRelatedTours[0].slug,
        })
      : null,
  );
  add(
    "empty-category",
    "medium",
    "Danh mục chưa có tour",
    `Ví dụ: ${sample(emptyCategories.map((category) => category.name))}`,
    emptyCategories.length,
    emptyCategories[0]
      ? adminSectionHref("categories", {
          id: emptyCategories[0].id,
          slug: emptyCategories[0].slug,
        })
      : null,
  );

  // --- Technical ----------------------------------------------------------
  const placeholderSlugs = placeholderSlugPages(pages);
  add(
    "placeholder-slug",
    "high",
    "Slug tạm chưa đổi",
    "Slug dạng noi-dung-… không có từ khoá. Đổi sang tên thật để URL dễ đọc.",
    placeholderSlugs.length,
    placeholderSlugs[0] ? firstHref(placeholderSlugs[0]) : null,
  );

  let sitemapUrls = input.sitemapUrls ?? null;
  if (sitemapUrls === null) {
    try {
      sitemapUrls = sitemapRoute().length;
    } catch {
      sitemapUrls = null;
    }
  }
  add(
    "sitemap",
    "high",
    "Không đọc được sitemap",
    "Google cần /sitemap.xml để biết các URL cần thu thập.",
    sitemapUrls && sitemapUrls > 0 ? 0 : 1,
    null,
  );
  try {
    const robots = robotsRoute();
    const robotsSitemap = Array.isArray(robots.sitemap)
      ? robots.sitemap.length
      : robots.sitemap
        ? 1
        : 0;
    add(
      "robots-sitemap",
      "high",
      "robots.txt thiếu khai báo sitemap",
      "Thêm dòng Sitemap: để crawler tìm thấy sitemap.",
      robotsSitemap > 0 ? 0 : 1,
      null,
    );
  } catch {
    add(
      "robots",
      "high",
      "Không đọc được robots.txt",
      "Kiểm tra route /robots.txt trước khi phát hành.",
      1,
      null,
    );
  }

  // --- English coverage ---------------------------------------------------
  const reviewed = pages.filter((page) => english(page.kind, page.id) === "reviewed")
    .length;
  const draft = pages.filter((page) => english(page.kind, page.id) === "draft")
    .length;
  add(
    "english-draft",
    "low",
    "Bản dịch EN chưa duyệt",
    "Bản nháp EN không được index và không xuất hiện trong sitemap.",
    draft,
    null,
  );

  // --- Score --------------------------------------------------------------
  const metadata =
    40 -
    Math.min(
      40,
      Math.min(
        8,
        missingTitle.length * 0.5 + missingDescription.length * 0.5,
      ) +
        shortTitle.length * 1 +
        shortDescription.length * 1 +
        duplicateTitlePages * 4 +
        duplicateDescriptionPages * 2,
    );
  const content =
    25 -
    Math.min(
      25,
      missingCover.length * 3 +
        missingAlt.length * 3 +
        noDestination.length * 1 +
        noRelatedTours.length * 0.5 +
        emptyCategories.length * 2,
    );
  const technical =
    20 -
    Math.min(
      20,
      placeholderSlugs.length * 4 +
        (sitemapUrls && sitemapUrls > 0 ? 0 : 6) +
        (issues.some((issue) => issue.id === "robots") ? 4 : 0),
    );
  const i18n = pages.length > 0 ? (15 * reviewed) / pages.length : 15;
  const score = Math.max(
    0,
    Math.min(100, Math.round(metadata + content + technical + i18n)),
  );

  const order = { high: 0, medium: 1, low: 2 } as const;
  return {
    score,
    status: seoStatus(score),
    pages: pages.length + 4,
    indexablePages: sitemapUrls ?? pages.length + 4,
    sitemapUrls,
    translation: { reviewed, total: pages.length },
    issues: issues.sort(
      (a, b) => order[a.severity] - order[b.severity] || b.count - a.count,
    ),
  };
}

function placeholderSlugPages(pages: Page[]): Page[] {
  return pages.filter((page) => isPlaceholderSlug(page.slug));
}

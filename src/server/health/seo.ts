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
  type HealthSeoIssueItem,
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
  /** Cap the drill-down list: the modal only ever needs one readable page. */
  const MAX_ITEMS = 25;
  const KIND_LABEL: Record<Kind, string> = {
    tour: "Tour",
    article: "Bài viết",
    category: "Danh mục",
  };
  const add = (input: {
    id: string;
    area: HealthSeoIssue["area"];
    severity: HealthSeoIssue["severity"];
    title: string;
    detail: string;
    count: number;
    href: string | null;
    items?: HealthSeoIssueItem[];
  }) => {
    if (input.count <= 0) return;
    const items = (input.items ?? []).slice(0, MAX_ITEMS);
    issues.push({
      id: input.id,
      area: input.area,
      severity: input.severity,
      title: input.title,
      detail: input.detail,
      count: input.count,
      href: input.href,
      items,
      hidden: Math.max(0, input.count - items.length),
    });
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
  /** Deep link into the English panel of the editor where it exists. */
  const translationHref = (page: Page) =>
    page.kind === "tour"
      ? `${firstHref(page)}#tour-section-translations`
      : firstHref(page);
  const pageItems = (
    list: Page[],
    describe: (page: Page) => string | null = (page) =>
      `${KIND_LABEL[page.kind]} · ${page.slug}`,
    hrefOf: (page: Page) => string | null = firstHref,
  ): HealthSeoIssueItem[] =>
    list.map((page) => ({
      label: page.name,
      detail: describe(page),
      href: hrefOf(page),
    }));

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

  add({
    id: "missing-seo-title",
    area: "metadata",
    severity: "low",
    title: "Chưa đặt title SEO riêng",
    detail:
      "Trang vẫn dùng tiêu đề hiển thị. Nên viết title 30–65 ký tự cho kết quả tìm kiếm.",
    count: missingTitle.length,
    href: missingTitle[0] ? firstHref(missingTitle[0]) : null,
    items: pageItems(missingTitle),
  });
  add({
    id: "missing-seo-description",
    area: "metadata",
    severity: "low",
    title: "Chưa đặt description SEO riêng",
    detail:
      "Đang dùng mô tả ngắn. Nên viết 80–170 ký tự để Google hiển thị đúng ý.",
    count: missingDescription.length,
    href: missingDescription[0] ? firstHref(missingDescription[0]) : null,
    items: pageItems(missingDescription),
  });
  add({
    id: "title-length",
    area: "metadata",
    severity: "medium",
    title: "Title ngoài khoảng 30–65 ký tự",
    detail: `Ví dụ: ${sample(shortTitle.map((page) => page.name))}`,
    count: shortTitle.length,
    href: shortTitle[0] ? firstHref(shortTitle[0]) : null,
    items: pageItems(
      shortTitle,
      (page) =>
        `${textLength(page.title)} ký tự · ${KIND_LABEL[page.kind]} · ${page.slug}`,
    ),
  });
  add({
    id: "description-length",
    area: "metadata",
    severity: "medium",
    title: "Description ngoài khoảng 80–170 ký tự",
    detail: `Ví dụ: ${sample(shortDescription.map((page) => page.name))}`,
    count: shortDescription.length,
    href: shortDescription[0] ? firstHref(shortDescription[0]) : null,
    items: pageItems(
      shortDescription,
      (page) =>
        `${textLength(page.description)} ký tự · ${KIND_LABEL[page.kind]} · ${page.slug}`,
    ),
  });
  add({
    id: "duplicate-title",
    area: "metadata",
    severity: "high",
    title: "Nhiều trang dùng cùng một title",
    detail: duplicateTitles
      .map((group) => `${group[0].title} (${group.length} trang)`)
      .slice(0, 2)
      .join(" · "),
    count: duplicateTitlePages,
    href: duplicateTitles[0] ? firstHref(duplicateTitles[0][0]) : null,
    items: duplicateTitles.flatMap((group) =>
      group.map((page) => ({
        label: page.name,
        detail: `Trùng title với ${group.length - 1} trang khác · ${KIND_LABEL[page.kind]}`,
        href: firstHref(page),
      })),
    ),
  });
  add({
    id: "duplicate-description",
    area: "metadata",
    severity: "medium",
    title: "Nhiều trang dùng cùng một description",
    detail: duplicateDescriptions
      .map((group) => `${group[0].name} (${group.length} trang)`)
      .slice(0, 2)
      .join(" · "),
    count: duplicateDescriptionPages,
    href: duplicateDescriptions[0] ? firstHref(duplicateDescriptions[0][0]) : null,
    items: duplicateDescriptions.flatMap((group) =>
      group.map((page) => ({
        label: page.name,
        detail: `Trùng description với ${group.length - 1} trang khác · ${KIND_LABEL[page.kind]}`,
        href: firstHref(page),
      })),
    ),
  });

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

  add({
    id: "missing-cover",
    area: "content",
    severity: "medium",
    title: "Thiếu ảnh đại diện",
    detail:
      "Card và ảnh chia sẻ mạng xã hội đang dùng nền thương hiệu thay vì ảnh thật.",
    count: missingCover.length,
    href: missingCover[0] ? firstHref(missingCover[0]) : null,
    items: pageItems(
      missingCover,
      (page) => `${KIND_LABEL[page.kind]} · chưa có ảnh đại diện`,
    ),
  });
  add({
    id: "missing-alt",
    area: "content",
    severity: "medium",
    title: "Ảnh thiếu mô tả alt",
    detail:
      "Ảnh có nguồn nhưng thiếu alt sẽ mất điểm tiếp cận và tìm kiếm ảnh.",
    count: missingAlt.length,
    href: missingAlt[0] ? firstHref(missingAlt[0]) : null,
    items: pageItems(
      missingAlt,
      (page) => `${KIND_LABEL[page.kind]} · ảnh thiếu alt`,
    ),
  });
  add({
    id: "tour-no-destination",
    area: "content",
    severity: "low",
    title: "Tour chưa gắn điểm đến",
    detail: "Điểm đến giúp tour xuất hiện trong tìm kiếm và khối khám phá.",
    count: noDestination.length,
    href: noDestination[0]
      ? adminSectionHref("tours", {
          id: noDestination[0].id,
          slug: noDestination[0].slug,
        })
      : null,
    items: noDestination.map((tour) => ({
      label: tour.title,
      detail: `Tour · ${tour.slug}`,
      href: adminSectionHref("tours", { id: tour.id, slug: tour.slug }),
    })),
  });
  add({
    id: "article-no-tour",
    area: "content",
    severity: "low",
    title: "Bài viết chưa liên kết tour",
    detail:
      "Bài cẩm nang nên có ít nhất một tour liên quan để dẫn khách vào phễu.",
    count: noRelatedTours.length,
    href: noRelatedTours[0]
      ? adminSectionHref("articles", {
          id: noRelatedTours[0].id,
          slug: noRelatedTours[0].slug,
        })
      : null,
    items: noRelatedTours.map((article) => ({
      label: article.title,
      detail: `Bài viết · ${article.slug}`,
      href: adminSectionHref("articles", {
        id: article.id,
        slug: article.slug,
      }),
    })),
  });
  add({
    id: "empty-category",
    area: "content",
    severity: "medium",
    title: "Danh mục chưa có tour",
    detail: `Ví dụ: ${sample(emptyCategories.map((category) => category.name))}`,
    count: emptyCategories.length,
    href: emptyCategories[0]
      ? adminSectionHref("categories", {
          id: emptyCategories[0].id,
          slug: emptyCategories[0].slug,
        })
      : null,
    items: emptyCategories.map((category) => ({
      label: category.name,
      detail: "Danh mục · 0 tour trong nhánh",
      href: adminSectionHref("categories", {
        id: category.id,
        slug: category.slug,
      }),
    })),
  });

  // --- Technical ----------------------------------------------------------
  const placeholderSlugs = placeholderSlugPages(pages);
  add({
    id: "placeholder-slug",
    area: "technical",
    severity: "high",
    title: "Slug tạm chưa đổi",
    detail:
      "Slug dạng noi-dung-… không có từ khoá. Đổi sang tên thật để URL dễ đọc.",
    count: placeholderSlugs.length,
    href: placeholderSlugs[0] ? firstHref(placeholderSlugs[0]) : null,
    items: pageItems(placeholderSlugs),
  });

  let sitemapUrls = input.sitemapUrls ?? null;
  if (sitemapUrls === null) {
    try {
      sitemapUrls = sitemapRoute().length;
    } catch {
      sitemapUrls = null;
    }
  }
  const sitemapBroken = !sitemapUrls || sitemapUrls <= 0;
  add({
    id: "sitemap",
    area: "technical",
    severity: "high",
    title: "Không đọc được sitemap",
    detail: "Google cần /sitemap.xml để biết các URL cần thu thập.",
    count: sitemapBroken ? 1 : 0,
    href: null,
    items: sitemapBroken
      ? [
          {
            label: "Kiểm tra /sitemap.xml",
            detail: "Route sinh sitemap phải trả về danh sách URL công khai.",
            href: "/sitemap.xml",
            external: true,
          },
        ]
      : [],
  });
  try {
    const robots = robotsRoute();
    const robotsSitemap = Array.isArray(robots.sitemap)
      ? robots.sitemap.length
      : robots.sitemap
        ? 1
        : 0;
    add({
      id: "robots-sitemap",
      area: "technical",
      severity: "high",
      title: "robots.txt thiếu khai báo sitemap",
      detail: "Thêm dòng Sitemap: để crawler tìm thấy sitemap.",
      count: robotsSitemap > 0 ? 0 : 1,
      href: null,
      items:
        robotsSitemap > 0
          ? []
          : [
              {
                label: "Kiểm tra /robots.txt",
                detail: "Cần một dòng Sitemap: trỏ tới /sitemap.xml.",
                href: "/robots.txt",
                external: true,
              },
            ],
    });
  } catch {
    add({
      id: "robots",
      area: "technical",
      severity: "high",
      title: "Không đọc được robots.txt",
      detail: "Kiểm tra route /robots.txt trước khi phát hành.",
      count: 1,
      href: null,
      items: [
        {
          label: "Mở /robots.txt",
          detail: "Route robots phải trả về nội dung hợp lệ.",
          href: "/robots.txt",
          external: true,
        },
      ],
    });
  }

  // --- English coverage ---------------------------------------------------
  const englishOf = new Map(
    pages.map((page) => [
      `${page.kind}:${page.id}`,
      english(page.kind, page.id),
    ]),
  );
  const statusPages = (status: "missing" | "draft" | "reviewed") =>
    pages.filter((page) => englishOf.get(`${page.kind}:${page.id}`) === status);
  const reviewedPages = statusPages("reviewed");
  const draftPages = statusPages("draft");
  const missingPages = statusPages("missing");
  const reviewed = reviewedPages.length;
  const translationDetail = (label: string) => (page: Page) =>
    `${label} · ${KIND_LABEL[page.kind]} · ${page.slug}`;
  add({
    id: "english-missing",
    area: "translation",
    severity: "low",
    title: "Chưa có bản dịch EN",
    detail:
      "Trang chỉ có tiếng Việt. Bản dịch giúp khách quốc tế đọc được và tăng điểm nội dung song ngữ.",
    count: missingPages.length,
    href: missingPages[0] ? translationHref(missingPages[0]) : null,
    items: pageItems(
      missingPages,
      translationDetail("Chưa dịch"),
      translationHref,
    ),
  });
  add({
    id: "english-draft",
    area: "translation",
    severity: "low",
    title: "Bản dịch EN chưa duyệt",
    detail: "Bản nháp EN không được index và không xuất hiện trong sitemap.",
    count: draftPages.length,
    href: draftPages[0] ? translationHref(draftPages[0]) : null,
    items: pageItems(draftPages, translationDetail("Bản nháp"), translationHref),
  });

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

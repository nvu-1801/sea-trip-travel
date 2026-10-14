import { z } from "zod";
import { tourCategorySchema } from "@/domain/category";
import { destinationSchema } from "@/domain/destination";
import { travelArticleSchema } from "@/domain/article";
import { destinations as rawDestinations } from "./destinations";
import { tourCategories as rawCategories } from "./categories";
import { articles as rawArticles } from "./articles";
import { tours } from "./tours";

/**
 * Content composition + integrity gate.
 *
 * Everything the app reads goes through this module. Records are validated
 * against the domain schemas and then cross-checked so a dangling reference
 * (a tour pointing at a category that does not exist) breaks the build rather
 * than producing a dead link in production.
 */

export const destinations = z.array(destinationSchema).parse(rawDestinations);
export const tourCategories = z.array(tourCategorySchema).parse(rawCategories);
export const articles = z.array(travelArticleSchema).parse(rawArticles);

export { tours };

/** Referential integrity — throws on the first problem found. */
function assertIntegrity(): void {
  const problems: string[] = [];

  const categoryIds = new Set(tourCategories.map((c) => c.id));
  const destinationIds = new Set(destinations.map((d) => d.id));

  const unique = <T>(items: readonly T[], pick: (item: T) => string, label: string) => {
    const seen = new Map<string, number>();
    for (const item of items) {
      const key = pick(item);
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    for (const [key, count] of seen) {
      if (count > 1) problems.push(`${label} trùng khoá "${key}" (${count} bản ghi)`);
    }
  };

  unique(tours, (t) => t.slug, "Tour slug");
  unique(tours, (t) => t.id, "Tour id");
  unique(tourCategories, (c) => c.path, "Category path");
  unique(destinations, (d) => d.slug, "Destination slug");
  unique(articles, (a) => a.slug, "Article slug");

  for (const tour of tours) {
    for (const id of tour.categoryIds) {
      if (!categoryIds.has(id)) {
        problems.push(`Tour "${tour.slug}" tham chiếu danh mục không tồn tại: ${id}`);
      }
    }
    for (const id of tour.destinationIds) {
      if (!destinationIds.has(id)) {
        problems.push(`Tour "${tour.slug}" tham chiếu điểm đến không tồn tại: ${id}`);
      }
    }
  }

  for (const category of tourCategories) {
    if (category.parentId && !categoryIds.has(category.parentId)) {
      problems.push(`Danh mục "${category.slug}" có parentId không tồn tại: ${category.parentId}`);
    }
  }

  const tourSlugs = new Set(tours.map((t) => t.slug));
  for (const article of articles) {
    for (const slug of article.relatedTourSlugs) {
      if (!tourSlugs.has(slug)) {
        problems.push(`Bài viết "${article.slug}" tham chiếu tour không tồn tại: ${slug}`);
      }
    }
    for (const id of article.destinationIds) {
      if (!destinationIds.has(id)) {
        problems.push(`Bài viết "${article.slug}" tham chiếu điểm đến không tồn tại: ${id}`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Lỗi toàn vẹn dữ liệu nội dung (${problems.length}):\n- ${problems.join("\n- ")}`,
    );
  }
}

assertIntegrity();

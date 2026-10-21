import "server-only";
import { z } from "zod";
import { contentPageSchema } from "@/domain/page";
import { pageSeeds } from "@/content/pages";
import { articles, destinations, tourCategories, tours } from "@/content";
import { tourSchema } from "@/domain/tour";
import { travelArticleSchema } from "@/domain/article";
import { destinationSchema } from "@/domain/destination";
import { tourCategorySchema } from "@/domain/category";
import { db, audit, transaction } from "./db";
import { defaultHero, heroSchema } from "@/domain/home-hero";
import { defaultLanding, landingSchema } from "@/domain/landing";
import {
  defaultSettings,
  messageSeeds,
  messagesSchema,
  settingsSchema,
} from "./settings";

/** Chuẩn hoá SĐT Việt Nam về dạng tel:+84... để nút gọi/Zalo luôn đúng. */
export function normalizeHotlineHref(hotline: string): string {
  const digits = hotline.replace(/\D/g, "");
  let normalized = digits;
  if (normalized.startsWith("84") && normalized.length >= 11) {
    normalized = normalized;
  } else if (normalized.startsWith("0") && normalized.length >= 9) {
    normalized = `84${normalized.slice(1)}`;
  } else if (normalized.length >= 9 && !normalized.startsWith("84")) {
    normalized = `84${normalized.replace(/^0+/, "")}`;
  }
  if (!/^\d{9,12}$/.test(normalized)) return "tel:+84969297064";
  return `tel:+${normalized}`;
}

// Strip defaults from overlays: a missing translated itinerary must retain VI.
const translatedTour = z.object({
  title: tourSchema.shape.title.optional(),
  summary: tourSchema.shape.summary.optional(),
  overview: tourSchema.shape.overview.removeDefault().optional(),
  itinerary: tourSchema.shape.itinerary.removeDefault().optional(),
  highlights: tourSchema.shape.highlights.removeDefault().optional(),
  included: tourSchema.shape.included.removeDefault().optional(),
  excluded: tourSchema.shape.excluded.removeDefault().optional(),
  notes: tourSchema.shape.notes.removeDefault().optional(),
  policies: tourSchema.shape.policies.removeDefault().optional(),
  tags: tourSchema.shape.tags.removeDefault().optional(),
  seo: tourSchema.shape.seo,
  priceNote: tourSchema.shape.priceNote,
});
const translatedArticle = z.object({
  title: travelArticleSchema.shape.title.optional(),
  excerpt: travelArticleSchema.shape.excerpt.optional(),
  body: travelArticleSchema.shape.body.removeDefault().optional(),
  tags: travelArticleSchema.shape.tags.removeDefault().optional(),
  seo: travelArticleSchema.shape.seo,
});
export const schemas = {
  pages: contentPageSchema,
  tours: tourSchema.extend({
    _en: translatedTour.optional(),
    _enReviewed: z.boolean().optional(),
  }),
  articles: travelArticleSchema.extend({
    _en: translatedArticle.optional(),
    _enReviewed: z.boolean().optional(),
  }),
  categories: tourCategorySchema.extend({
    _en: tourCategorySchema
      .pick({ name: true, description: true, tagline: true, seo: true })
      .partial()
      .optional(),
    _enReviewed: z.boolean().optional(),
  }),
  destinations: destinationSchema.extend({
    _en: destinationSchema
      .pick({ name: true, summary: true, province: true })
      .partial()
      .optional(),
    _enReviewed: z.boolean().optional(),
  }),
  settings: settingsSchema,
  hero: heroSchema,
  landing: landingSchema,
  messages: messagesSchema,
};
export type Collection = keyof typeof schemas;
const seeds = {
  pages: pageSeeds,
  tours,
  articles,
  categories: tourCategories,
  destinations,
  settings: [defaultSettings],
  hero: [defaultHero],
  landing: [defaultLanding],
  messages: messageSeeds,
};
export type CmsRecord = {
  collection: Collection;
  id: string;
  data: Record<string, unknown>;
  state: string;
  revision: number;
  updated_at: string;
};
let seeded = false;
export function seed() {
  if (seeded) return;
  transaction(() => {
    const insert = db().prepare(
      "INSERT OR IGNORE INTO records(collection,id,data,published,state,updated_at) VALUES(?,?,?,?,?,?)",
    );
    for (const [collection, items] of Object.entries(seeds))
      for (const item of items) {
        const json = JSON.stringify(item);
        insert.run(
          collection,
          item.id,
          json,
          json,
          "published",
          new Date().toISOString(),
        );
      }
  });
  seeded = true;
}
export function published<T>(
  collection: Collection,
  fallback: readonly T[],
): T[] {
  if (process.env.CMS_ENABLED !== "1") return [...fallback];
  seed();
  return (
    db()
      .prepare(
        "SELECT published FROM records WHERE collection=? AND published IS NOT NULL AND state!='deleted' ORDER BY rowid",
      )
      .all(collection) as { published: string }[]
  ).map((row) => JSON.parse(row.published) as T);
}
export function list(collection: Collection): CmsRecord[] {
  seed();
  return (
    db()
      .prepare(
        "SELECT collection,id,data,state,revision,updated_at FROM records WHERE collection=? ORDER BY updated_at DESC",
      )
      .all(collection) as unknown as (Omit<CmsRecord, "data"> & {
      data: string;
    })[]
  ).map((row) => {
    const saved = JSON.parse(row.data);
    const merge = (base: unknown, value: unknown): unknown => {
      if (
        base &&
        value &&
        typeof base === "object" &&
        typeof value === "object" &&
        !Array.isArray(base) &&
        !Array.isArray(value)
      ) {
        const b = base as Record<string, unknown>,
          v = value as Record<string, unknown>;
        return {
          ...v,
          ...Object.fromEntries(
            Object.keys(b).map((key) => [
              key,
              key in v ? merge(b[key], v[key]) : b[key],
            ]),
          ),
        };
      }
      return value ?? base;
    };
    const data =
      collection === "landing"
        ? landingSchema.parse(saved)
        : collection === "settings"
          ? settingsSchema.parse(saved)
          : collection === "pages"
            ? contentPageSchema.parse(saved)
            : collection === "messages"
              ? merge(
                  messageSeeds.find((seed) => seed.id === row.id),
                  saved,
                )
              : saved;
    return { ...row, data };
  });
}
function mergeDefaults(base: unknown, saved: unknown): unknown {
  if (
    base &&
    saved &&
    typeof base === "object" &&
    typeof saved === "object" &&
    !Array.isArray(base) &&
    !Array.isArray(saved)
  ) {
    const a = base as Record<string, unknown>,
      b = saved as Record<string, unknown>;
    return {
      ...b,
      ...Object.fromEntries(
        Object.keys(a).map((key) => [
          key,
          key in b ? mergeDefaults(a[key], b[key]) : a[key],
        ]),
      ),
    };
  }
  return saved ?? base;
}
function scopedPublication(
  collection: Collection,
  data: Record<string, unknown>,
  previous: string | null,
  paths?: string[][],
) {
  if (
    !previous ||
    !paths?.length ||
    paths.some((path) => !path.length) ||
    !["landing", "settings", "messages"].includes(collection)
  )
    return data;
  const raw = JSON.parse(previous);
  let baseline = schemas[collection].parse(
    collection === "messages"
      ? mergeDefaults(
          messageSeeds.find((seed) => seed.id === data.id),
          raw,
        )
      : raw,
  ) as Record<string, unknown>;
  for (const path of paths) {
    if (
      path.some((key) =>
        ["__proto__", "constructor", "prototype", "id"].includes(key),
      )
    )
      throw new Error("Trường xuất bản không hợp lệ");
    let value: unknown = data;
    for (const key of path) {
      if (!value || typeof value !== "object" || !Object.hasOwn(value, key))
        throw new Error("Trường xuất bản không tồn tại");
      value = (value as Record<string, unknown>)[key];
    }
    const assign = (
      object: Record<string, unknown>,
      keys: string[],
    ): Record<string, unknown> => {
      const [head, ...tail] = keys;
      return {
        ...object,
        [head]: tail.length
          ? assign((object[head] ?? {}) as Record<string, unknown>, tail)
          : value,
      };
    };
    baseline = assign(baseline, path);
  }
  return schemas[collection].parse(baseline) as Record<string, unknown>;
}
function saveRecord(
  collection: Collection,
  input: unknown,
  revision: number,
  action: "save" | "publish" | "unpublish" | "delete" | "restore",
  publishPaths?: string[][],
) {
  let normalized = input;
  if (
    collection === "settings" &&
    normalized &&
    typeof normalized === "object" &&
    "contact" in (normalized as Record<string, unknown>)
  ) {
    const contact = (normalized as Record<string, Record<string, unknown>>)
      .contact;
    // Admin chỉ cần sửa SĐT hiển thị — link tel: tự chuẩn hoá để nút gọi/Zalo luôn đúng.
    if (contact && typeof contact.hotline === "string") {
      normalized = {
        ...(normalized as Record<string, unknown>),
        contact: {
          ...contact,
          hotlineHref: normalizeHotlineHref(contact.hotline),
        },
      };
    }
  }
  const data = schemas[collection].parse(normalized) as {
    id: string;
    slug?: string;
    path?: string;
  };
  if (
    collection === "pages" &&
    (data.slug === "chinh-sach-bao-mat") !== (data.id === "page_privacy")
  )
    throw new Error(
      "Đường dẫn chính sách bảo mật được dành riêng cho trang hiện có",
    );
  const encoded = JSON.stringify(data);
  if (encoded.length > 500000) throw new Error("Nội dung vượt quá giới hạn");
  // Image URLs are local, cannot be protocol-relative, executable or traverse directories.
  const inspect = (value: unknown, key = "") => {
    if (
      typeof value === "string" &&
      ["src", "ogImage", "path", "photoSrc", "logoSrc"].includes(key) &&
      (!/^\/(?!\/)/.test(value) ||
        value.includes("..") ||
        /[\\\x00-\x1f]/.test(value))
    )
      throw new Error("Đường dẫn không an toàn");
    if (value && typeof value === "object")
      for (const [k, v] of Object.entries(value)) inspect(v, k);
  };
  inspect(data);
  const commit = () => {
    const previous = db()
      .prepare(
        "SELECT revision,published,state,data FROM records WHERE collection=? AND id=?",
      )
      .get(collection, data.id) as
      | {
          revision: number;
          published: string | null;
          state: string;
          data: string;
        }
      | undefined;
    if ((previous?.revision ?? 0) !== revision)
      throw new Error("Nội dung đã thay đổi. Tải lại trước khi lưu.");
    if (previous) {
      const old = JSON.parse(previous.data);
      if (old.slug !== data.slug || old.path !== data.path)
        throw new Error(
          "Giữ nguyên slug/đường dẫn để bảo toàn liên kết đã phát hành.",
        );
    }
    if (
      ["settings", "messages", "hero", "landing"].includes(collection) &&
      action !== "publish" &&
      action !== "save"
    )
      throw new Error("Không thể ẩn/xóa cấu hình hệ thống");
    const all = list(collection);
    if (
      all.some(
        (row) =>
          row.id !== data.id &&
          row.state !== "deleted" &&
          ((data.slug && row.data.slug === data.slug) ||
            (data.path && row.data.path === data.path)),
      )
    )
      throw new Error("Slug/đường dẫn đã tồn tại");
    const present = (kind: Collection, id: string) =>
      list(kind).some((row) => row.id === id && row.state !== "deleted");
    const raw = data as Record<string, unknown>;
    if (
      collection === "categories" &&
      !previous &&
      !/^\/danh-muc\/[a-z0-9/-]+$/.test(String(raw.path))
    )
      throw new Error("Danh mục mới dùng đường dẫn /danh-muc/<slug>");
    if (collection === "tours") {
      const tour = tourSchema.parse(data);
      if (tour.priceFrom && tour.priceFrom.amount <= 0)
        throw new Error(
          "Giá từ phải lớn hơn 0; dùng giá liên hệ nếu chưa có giá",
        );
      if (tour.duration.days > 90 || tour.duration.nights > tour.duration.days)
        throw new Error("Thời lượng tour không hợp lệ");
      if (
        new Set(tour.itinerary.map((day) => day.id)).size !==
          tour.itinerary.length ||
        new Set(tour.pricingOptions.map((option) => option.id)).size !==
          tour.pricingOptions.length
      )
        throw new Error("Mã ngày hoặc mã gói giá bị trùng");
      if (
        tour.itinerary.length !== tour.duration.days ||
        tour.itinerary.some((day, i) => day.index !== i + 1)
      )
        throw new Error(
          "Số ngày lịch trình phải khớp thời lượng và đúng thứ tự",
        );
      if (
        tour.categoryIds.some((id) => !present("categories", id)) ||
        tour.destinationIds.some((id) => !present("destinations", id))
      )
        throw new Error("Danh mục/điểm đến không tồn tại");
      if (
        tour.pricingOptions.length &&
        tour.priceFrom?.amount !==
          Math.min(...tour.pricingOptions.map((p) => p.adultPrice))
      )
        throw new Error("Giá từ phải khớp giá thấp nhất trong bảng giá");
      const translated = raw._en as
        { itinerary?: { index: number }[] } | undefined;
      if (
        translated?.itinerary &&
        (translated.itinerary.length !== tour.duration.days ||
          translated.itinerary.some((day, i) => day.index !== i + 1))
      )
        throw new Error(
          "Lịch trình tiếng Anh phải khớp số ngày và đúng thứ tự",
        );
    }
    if (collection === "landing") {
      const landing = landingSchema.parse(data);
      if (landing.featured.tourIds.some((id) => !present("tours", id)))
        throw new Error(
          "Tour nổi bật không tồn tại; chọn lại tour trong danh sách",
        );
      const slugs = [
        landing.guides.featuredSlug,
        ...landing.guides.picks,
      ].filter(Boolean);
      if (
        slugs.some(
          (slug) =>
            !list("articles").some(
              (row) => row.data.slug === slug && row.state !== "deleted",
            ),
        )
      )
        throw new Error("Bài viết được chọn không tồn tại");
    }
    if (collection === "articles") {
      const article = travelArticleSchema.parse(data);
      if (
        article.destinationIds.some((id) => !present("destinations", id)) ||
        article.relatedTourSlugs.some(
          (slug) =>
            !list("tours").some(
              (r) => r.data.slug === slug && r.state !== "deleted",
            ),
        )
      )
        throw new Error("Tour/điểm đến liên quan không tồn tại");
    }
    if (collection === "categories" && raw.parentId) {
      const visited = new Set([data.id]);
      let parent = String(raw.parentId);
      while (parent) {
        if (visited.has(parent)) throw new Error("Danh mục tạo thành vòng lặp");
        visited.add(parent);
        const row = list("categories").find(
          (r) => r.id === parent && r.state !== "deleted",
        );
        if (!row) throw new Error("Danh mục cha không tồn tại");
        parent = String(row.data.parentId ?? "");
      }
    }
    if (
      action === "delete" &&
      (collection === "categories" || collection === "destinations")
    ) {
      const field =
        collection === "categories" ? "categoryIds" : "destinationIds";
      if (
        list("tours").some(
          (row) =>
            row.state !== "deleted" &&
            (row.data[field] as string[]).includes(data.id),
        ) ||
        (collection === "categories" &&
          all.some(
            (row) => row.state !== "deleted" && row.data.parentId === data.id,
          ))
      )
        throw new Error("Đang được tham chiếu; gỡ liên kết trước khi xóa");
    }
    if (
      action === "delete" &&
      collection === "destinations" &&
      list("articles").some(
        (row) =>
          row.state !== "deleted" &&
          (row.data.destinationIds as string[]).includes(data.id),
      )
    )
      throw new Error("Điểm đến đang được bài viết tham chiếu");
    if (
      action === "delete" &&
      collection === "tours" &&
      list("articles").some(
        (row) =>
          row.state !== "deleted" &&
          (row.data.relatedTourSlugs as string[]).includes(data.slug ?? ""),
      )
    )
      throw new Error(
        "Tour đang được bài viết tham chiếu; gỡ liên kết trước khi xóa",
      );
    if (
      action === "delete" &&
      (collection === "tours" || collection === "articles")
    ) {
      const refs = list("landing").flatMap((row) => [
        row.data,
        ...((
          db()
            .prepare(
              "SELECT published FROM records WHERE collection='landing' AND id=?",
            )
            .get(row.id) as { published: string | null }
        )?.published
          ? [
              JSON.parse(
                (
                  db()
                    .prepare(
                      "SELECT published FROM records WHERE collection='landing' AND id=?",
                    )
                    .get(row.id) as { published: string }
                ).published,
              ),
            ]
          : []),
      ]);
      if (
        refs.some((raw) => {
          const home = landingSchema.parse(raw);
          return collection === "tours"
            ? home.featured.tourIds.includes(data.id)
            : [home.guides.featuredSlug, ...home.guides.picks].includes(
                data.slug ?? "",
              );
        })
      )
        throw new Error(
          "Nội dung đang được ghim trên trang chủ. Gỡ lựa chọn và xuất bản trang chủ trước khi xóa.",
        );
    }
    const now = new Date().toISOString();
    if (action === "save" || action === "publish") {
      if (collection === "articles")
        (data as Record<string, unknown>).updatedAt = now.slice(0, 10);
      if (collection === "tours" || collection === "pages")
        (data as Record<string, unknown>).updatedAt = now;
    } else if (previous && "updatedAt" in data) {
      // Thùng rác / ẩn / khôi phục không được đổi ngày hiển thị của bản ghi.
      (data as Record<string, unknown>).updatedAt = (
        JSON.parse(previous.data) as Record<string, unknown>
      ).updatedAt;
    }
    const json = JSON.stringify(data);
    let state =
      action === "delete"
        ? "deleted"
        : action === "publish"
          ? "published"
          : action === "unpublish" || action === "restore"
            ? "draft"
            : "draft";
    const publicData =
      action === "publish"
        ? scopedPublication(
            collection,
            data,
            previous?.published ?? null,
            publishPaths,
          )
        : data;
    if (action === "publish" && JSON.stringify(publicData) !== json)
      state = "draft";
    const publicValue =
      action === "publish"
        ? ["tours", "articles", "categories", "destinations"].includes(
            collection,
          )
          ? JSON.stringify({ ...publicData, _cmsEdited: true })
          : JSON.stringify(publicData)
        : ["unpublish", "delete", "restore"].includes(action)
          ? null
          : (previous?.published ?? null);
    db()
      .prepare(
        "INSERT INTO records(collection,id,data,published,state,revision,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(collection,id) DO UPDATE SET data=excluded.data,published=excluded.published,state=excluded.state,revision=excluded.revision,updated_at=excluded.updated_at",
      )
      .run(collection, data.id, json, publicValue, state, revision + 1, now);
    audit(action, `${collection}/${data.id}`);
    return { id: data.id, revision: revision + 1 };
  };
  return commit();
}
type SaveAction = "save" | "publish" | "unpublish" | "delete" | "restore";
export function save(
  collection: Collection,
  input: unknown,
  revision: number,
  action: SaveAction,
) {
  seed();
  return transaction(() => saveRecord(collection, input, revision, action));
}
/** One section editor may update copy and selection together. All or nothing. */
export function saveBatch(
  changes: {
    collection: Collection;
    data: unknown;
    revision: number;
    action: SaveAction;
    paths?: string[][];
  }[],
) {
  seed();
  return transaction(() =>
    changes.map((change) =>
      saveRecord(
        change.collection,
        change.data,
        change.revision,
        change.action,
        change.paths,
      ),
    ),
  );
}
export function settings() {
  return settingsSchema.parse(
    published("settings", [defaultSettings])[0] ?? defaultSettings,
  );
}
export function homeHero() {
  return heroSchema.parse(published("hero", [defaultHero])[0] ?? defaultHero);
}
export function landingSections() {
  return landingSchema.parse(
    published("landing", [defaultLanding])[0] ?? defaultLanding,
  );
}
export function consumeLimit(key: string, max: number, windowMs: number) {
  return transaction(() => {
    const now = Date.now();
    db().prepare("DELETE FROM attempts WHERE expires<?").run(now);
    db()
      .prepare(
        "INSERT INTO attempts(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
      )
      .run(key, now + windowMs);
    const row = db()
      .prepare("SELECT count FROM attempts WHERE key=?")
      .get(key) as { count: number };
    return row.count <= max;
  });
}

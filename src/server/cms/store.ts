import "server-only";
import { z } from "zod";
import { articles, destinations, tourCategories, tours } from "@/content";
import { tourRecordSchema } from "@/domain/tour-cms";
import { collectTourBusinessIssues } from "@/domain/tour-rules";
import { travelArticleSchema } from "@/domain/article";
import {
  destinationSchema,
  MAX_HOME_DESTINATIONS,
} from "@/domain/destination";
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

const translatedArticle = z.object({
  title: travelArticleSchema.shape.title.optional(),
  excerpt: travelArticleSchema.shape.excerpt.optional(),
  body: travelArticleSchema.shape.body.removeDefault().optional(),
  tags: travelArticleSchema.shape.tags.removeDefault().optional(),
  seo: travelArticleSchema.shape.seo,
});
export const schemas = {
  tours: tourRecordSchema,
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
const hasHomeFields = (data: Record<string, unknown>) =>
  typeof data.showOnHome === "boolean" &&
  typeof data.homeOrder === "number";

/**
 * Databases created before the explicit home switch existed have no
 * `showOnHome`. Backfill it once so an upgrade keeps exactly the cards the old
 * implicit rule produced (Quy Nhơn – Phú Yên, has a photo, first three by
 * `order`) instead of emptying the "Khám phá" block.
 */
function backfillDestinationHomeFlags() {
  const rows = db()
    .prepare(
      "SELECT id,data,published,state FROM records WHERE collection='destinations'",
    )
    .all() as {
    id: string;
    data: string;
    published: string | null;
    state: string;
  }[];
  const parsed = rows.map((row) => ({
    ...row,
    data: JSON.parse(row.data) as Record<string, unknown>,
  }));
  const missing = parsed.filter((row) => !hasHomeFields(row.data));
  if (!missing.length) return;

  const enabled = parsed.filter(
    (row) => row.state !== "deleted" && row.data.showOnHome === true,
  );
  let nextOrder = Math.max(
    0,
    ...enabled.map((row) => Number(row.data.homeOrder ?? 0)),
  );
  const candidates = missing
    .filter(
      (row) =>
        row.state !== "deleted" &&
        row.data.showOnHome !== true &&
        row.data.region === "quy-nhon-phu-yen" &&
        Boolean((row.data.image as { src?: string } | undefined)?.src),
    )
    .sort(
      (a, b) =>
        Number(a.data.order ?? 0) - Number(b.data.order ?? 0) ||
        a.id.localeCompare(b.id),
    );

  const assignments = new Map<string, number>();
  for (const row of candidates) {
    if (enabled.length >= MAX_HOME_DESTINATIONS) break;
    enabled.push(row);
    nextOrder += 1;
    assignments.set(row.id, nextOrder);
  }

  const update = db().prepare(
    "UPDATE records SET data=?, published=? WHERE collection='destinations' AND id=?",
  );
  for (const row of missing) {
    const homeOrder = assignments.get(row.id);
    const showOnHome = homeOrder !== undefined;
    const data = {
      ...row.data,
      showOnHome,
      homeOrder: showOnHome
        ? homeOrder
        : Number(row.data.homeOrder ?? 0),
    };
    const published = row.published
      ? JSON.stringify({
          ...(JSON.parse(row.published) as Record<string, unknown>),
          showOnHome: data.showOnHome,
          homeOrder: data.homeOrder,
        })
      : null;
    update.run(JSON.stringify(data), published, row.id);
  }
}

type StoredImage = {
  src?: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
};

/**
 * A CMS row outlives the content file it was seeded from: `seed()` inserts with
 * `INSERT OR IGNORE`, so photos added to the TypeScript content later never
 * reached rows created before them. Tour records written while the media was
 * still a placeholder therefore kept `images: [{ alt }]` with no `src`, and the
 * tour detail page rendered the branded gradient instead of the real photo.
 *
 * Fill those missing sources from the current content (alt first, then the same
 * position, then the next unused photo) and append photos the stale row never
 * had. Rows where every image already has a `src` are left untouched, so an
 * editor's own media choice is never overwritten.
 */
export function fillTourImageSources(): number {
  const sourceById = new Map(
    tours.map((tour) => [
      tour.id,
      (tour.images ?? []).filter((image) => Boolean(image.src)),
    ]),
  );
  const rows = db()
    .prepare(
      "SELECT id,data,published FROM records WHERE collection='tours' AND state!='deleted'",
    )
    .all() as { id: string; data: string; published: string | null }[];

  const update = db().prepare(
    "UPDATE records SET data=?, published=? WHERE collection='tours' AND id=?",
  );

  let repaired = 0;
  for (const row of rows) {
    const source = sourceById.get(row.id);
    if (!source?.length) continue;

    const data = JSON.parse(row.data) as { images?: StoredImage[] };
    const published = row.published
      ? (JSON.parse(row.published) as { images?: StoredImage[] })
      : null;
    const current = published?.images ?? data.images ?? [];
    if (!current.some((image) => !image.src)) continue;

    const used = new Set(
      current
        .map((image) => image.src)
        .filter((src): src is string => Boolean(src)),
    );
    const merged: StoredImage[] = [];
    for (const [index, image] of current.entries()) {
      if (image.src) {
        merged.push(image);
        continue;
      }
      const match =
        source.find(
          (candidate) =>
            candidate.src &&
            candidate.alt === image.alt &&
            !used.has(candidate.src),
        ) ??
        source.find(
          (candidate, at) =>
            at === index && candidate.src && !used.has(candidate.src),
        ) ??
        source.find(
          (candidate) => candidate.src && !used.has(candidate.src),
        );
      if (!match?.src) continue;
      used.add(match.src);
      merged.push({
        ...match,
        alt: image.alt || match.alt,
        ...(image.caption ? { caption: image.caption } : {}),
      });
    }
    // Append photos the stale record never had, so a content refresh also
    // reaches tours whose media list was shorter than the source.
    for (const image of source)
      if (image.src && !used.has(image.src)) {
        merged.push(image);
        used.add(image.src);
      }
    if (merged.length === 0) continue;

    data.images = merged;
    if (published) published.images = merged;
    update.run(
      JSON.stringify(data),
      published ? JSON.stringify(published) : null,
      row.id,
    );
    repaired += 1;
  }
  return repaired;
}

/**
 * Settings rows seeded before the SEO fields existed have no `seo` object.
 * Public metadata merges defaults at read time, but the Studio form reads the
 * stored row — without this the owner would never see the new fields. Fill the
 * defaults once, preserving any values already saved.
 */
export function backfillSettingsSeo(): number {
  const rows = db()
    .prepare("SELECT id,data,published FROM records WHERE collection='settings'")
    .all() as { id: string; data: string; published: string | null }[];
  const update = db().prepare(
    "UPDATE records SET data=?, published=? WHERE collection='settings' AND id=?",
  );
  const hasSeo = (value: unknown) => {
    if (!value || typeof value !== "object") return false;
    const record = value as Record<string, unknown>;
    return Object.keys(defaultSettings.seo).every(
      (key) =>
        typeof record[key] === "string" &&
        (record[key] as string).trim().length > 0,
    );
  };
  const mergeSeo = (value: unknown) => ({
    ...defaultSettings.seo,
    ...(value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {}),
  });

  let repaired = 0;
  for (const row of rows) {
    const data = JSON.parse(row.data) as Record<string, unknown>;
    const published = row.published
      ? (JSON.parse(row.published) as Record<string, unknown>)
      : null;
    const dataNeeds = !hasSeo(data.seo);
    const publishedNeeds = published ? !hasSeo(published.seo) : false;
    if (!dataNeeds && !publishedNeeds) continue;
    if (dataNeeds) data.seo = mergeSeo(data.seo);
    if (published && publishedNeeds) published.seo = mergeSeo(published.seo);
    update.run(
      JSON.stringify(data),
      published ? JSON.stringify(published) : null,
      row.id,
    );
    repaired += 1;
  }
  return repaired;
}

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
    backfillDestinationHomeFlags();
    fillTourImageSources();
    backfillSettingsSeo();
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
  ).map((row) => ({ ...row, data: JSON.parse(row.data) }));
}

/**
 * Permanently removes trashed rows older than the retention window.
 * Deleted rows carry `updated_at` = time of the delete action, so no
 * migration is needed. Runs lazily from the admin content API — never
 * touches published rows.
 */
export const TRASH_RETENTION_DAYS = 60;

export function purgeExpiredTrash(nowMs: number = Date.now()): number {
  const cutoff = new Date(
    nowMs - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  return transaction(() => {
    const result = db()
      .prepare("DELETE FROM records WHERE state='deleted' AND updated_at<?")
      .run(cutoff);
    return Number(result.changes ?? 0);
  });
}
export function save(
  collection: Collection,
  input: unknown,
  revision: number,
  action: "save" | "publish" | "unpublish" | "delete" | "restore",
) {
  seed();
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
  const encoded = JSON.stringify(data);
  if (encoded.length > 500000) throw new Error("Nội dung vượt quá giới hạn");
  // Image URLs are local, cannot be protocol-relative, executable or traverse directories.
  const inspect = (value: unknown, key = "") => {
    if (
      typeof value === "string" &&
      ["src", "ogImage", "path"].includes(key) &&
      (!/^\/(?!\/)/.test(value) ||
        value.includes("..") ||
        /[\\\x00-\x1f]/.test(value))
    )
      throw new Error("Đường dẫn không an toàn");
    if (value && typeof value === "object")
      for (const [k, v] of Object.entries(value)) inspect(v, k);
  };
  inspect(data);
  return transaction(() => {
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
      collection === "destinations" &&
      (data as Record<string, unknown>).showOnHome === true
    ) {
      const otherEnabled = all.filter(
        (row) =>
          row.id !== data.id &&
          row.state !== "deleted" &&
          row.data.showOnHome === true,
      );
      if (otherEnabled.length >= MAX_HOME_DESTINATIONS)
        throw new Error(
          `Khối Khám phá trang chủ chỉ hiện tối đa ${MAX_HOME_DESTINATIONS} điểm. Hãy tắt một điểm đang bật trước khi bật thêm.`,
        );
      const raw = data as Record<string, unknown>;
      const homeOrder = Number(raw.homeOrder ?? 0);
      if (!Number.isInteger(homeOrder) || homeOrder <= 0)
        raw.homeOrder =
          Math.max(
            0,
            ...otherEnabled.map((row) => Number(row.data.homeOrder ?? 0)),
          ) + 1;
    }
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
      const tour = tourRecordSchema.parse(data);
      // Business rules live in `domain/tour-rules.ts` so the Studio form can
      // show the same failures next to the offending field before POSTing.
      const issues = collectTourBusinessIssues(tour, {
        categories: new Set(
          list("categories")
            .filter((row) => row.state !== "deleted")
            .map((row) => String(row.data.id)),
        ),
        destinations: new Set(
          list("destinations")
            .filter((row) => row.state !== "deleted")
            .map((row) => String(row.data.id)),
        ),
      });
      if (issues.length > 0)
        throw new Error(
          [...new Set(issues.map((issue) => issue.message))]
            .slice(0, 4)
            .join(" · "),
        );
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
    const now = new Date().toISOString();
    if (action === "save" || action === "publish") {
      if (collection === "articles")
        (data as Record<string, unknown>).updatedAt = now.slice(0, 10);
      if (collection === "tours")
        (data as Record<string, unknown>).updatedAt = now;
    } else if (previous && "updatedAt" in data) {
      // Thùng rác / ẩn / khôi phục không được đổi ngày hiển thị của bản ghi.
      (data as Record<string, unknown>).updatedAt = (
        JSON.parse(previous.data) as Record<string, unknown>
      ).updatedAt;
    }
    const json = JSON.stringify(data);
    const state =
      action === "delete"
        ? "deleted"
        : action === "publish"
          ? "published"
          : action === "unpublish" || action === "restore"
            ? "draft"
            : "draft";
    const publicValue =
      action === "publish"
        ? ["tours", "articles", "categories", "destinations"].includes(
            collection,
          )
          ? JSON.stringify({ ...data, _cmsEdited: true })
          : json
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
  });
}
export function settings() {
  const stored = published("settings", [defaultSettings])[0];
  if (!stored) return defaultSettings;
  // Settings rows written before a field existed must inherit the default for
  // that field. Merging (rather than overwriting) keeps every owner edit.
  return settingsSchema.parse({
    ...defaultSettings,
    ...stored,
    contact: { ...defaultSettings.contact, ...stored.contact },
    seo: { ...defaultSettings.seo, ...(stored as { seo?: object }).seo },
  });
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

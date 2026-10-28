import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { contentVersion, transaction } from "../src/server/cms/db";
import { versionResponse } from "../src/server/cms/version-response";
import { defaultHero, heroSchema } from "../src/domain/home-hero";
import { defaultLanding, landingSchema } from "../src/domain/landing";
import { homeHero, settings } from "../src/server/cms/store";
import { HOME_SEO } from "../src/content/seo";
import { searchKey } from "../src/lib/search";
import {
  resolveArticle,
  articleTranslationStatus,
} from "../src/lib/data/localize";
import type { TravelArticle } from "../src/domain/article";
import { defaultSettings } from "../src/server/cms/settings";
import { MAX_HOME_DESTINATIONS } from "../src/domain/destination";
import { getFeaturedTours, getAutomaticFeaturedTours } from "../src/lib/data/tours";
import { slugFromTitle } from "../src/lib/public-slug";
import { featuredCopy, getFeaturedHome } from "../src/lib/data/featured";
test("default CMS social links preserve the hotline-derived Zalo contact", () => {
  assert.ok(
    defaultSettings.socialLinks.some((link) =>
      link.href.startsWith("https://zalo.me/"),
    ),
  );
  assert.ok(defaultSettings.footerLinks.every((link) => link.labelEn));
});
test("Vietnamese search folds uppercase Đ and all diacritics", () => {
  assert.equal(searchKey("ĐÀ NẴNG – Điểm đến"), "da nang – diem den");
});
const directory = mkdtempSync(path.join(tmpdir(), "seatrip-cms-"));
process.env.CMS_DB_PATH = path.join(directory, "test.sqlite");
process.env.CMS_ENABLED = "1";
process.env.LEAD_ENCRYPTION_KEY = randomBytes(32).toString("hex");
import {
  list,
  save,
  published,
  consumeLimit,
  schemas,
  purgeExpiredTrash,
  TRASH_RETENTION_DAYS,
  fillTourImageSources,
  backfillSettingsSeo,
  fillMissingMediaSources,
  saveHomeRegions,
  migrateContent,
  MEDIA_SOURCE_MIGRATION,
  redirectTarget,
  repairPlaceholderSlugs,
} from "../src/server/cms/store";
import {
  hashPassword,
  verifyPassword,
  sameOrigin,
} from "../src/server/cms/auth";
import { db } from "../src/server/cms/db";
import { cmsDataDir } from "../src/server/cms/db";
import {
  encrypt,
  decrypt,
  persistLead,
  listLeads,
} from "../src/server/cms/leads";
after(() => {
  db().close();
  rmSync(directory, { recursive: true, force: true });
});
test("password hashes are salted; invalid credentials fail", () => {
  const hash = hashPassword("a-test-password-12345");
  assert.notEqual(hash, hashPassword("a-test-password-12345"));
  assert.equal(verifyPassword("a-test-password-12345", hash), true);
  assert.equal(verifyPassword("wrong", hash), false);
  assert.throws(() => hashPassword("short"));
});
test("editing source copy never silently reuses a stale English seed translation", () => {
  const row = list("articles")[0];
  save(
    "articles",
    { ...row.data, title: "Nội dung nguồn vừa thay đổi" },
    row.revision,
    "publish",
  );
  const article = published<TravelArticle>("articles", []).find(
    (item) => item.id === row.id,
  )!;
  assert.equal(
    resolveArticle(article, "en").title,
    "Nội dung nguồn vừa thay đổi",
  );
  assert.equal(articleTranslationStatus(row.id, "en"), "missing");
});
test("partial English translations preserve the source itinerary and article body", () => {
  const tour = list("tours")[0];
  const parsed = schemas.tours.parse({
    ...tour.data,
    _en: { title: "An English title" },
  });
  assert.deepEqual(Object.keys(parsed._en ?? {}), ["title"]);
  const article = list("articles")[0];
  const translated = schemas.articles.parse({
    ...article.data,
    _en: { title: "An English article" },
  });
  assert.deepEqual(Object.keys(translated._en ?? {}), ["title"]);
});
test("origin protection rejects cross-site and missing Origin", () => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  assert.doesNotThrow(() =>
    sameOrigin(
      new Request("https://example.com/api/admin", {
        headers: { origin: "https://example.com" },
      }),
    ),
  );
  assert.throws(() =>
    sameOrigin(
      new Request("https://example.com/api/admin", {
        headers: { origin: "https://evil.test" },
      }),
    ),
  );
  assert.throws(() => sameOrigin(new Request("https://example.com/api/admin")));
});
test("draft edits stay private; publish is immediate; optimistic locking rejects stale writes", () => {
  const first = list("tours")[0];
  const title = String(first.data.title);
  const data = { ...first.data, title: "Bản nháp kiểm thử" };
  save("tours", data, first.revision, "save");
  assert.equal(
    published<{ id: string; title: string }>("tours", []).find(
      (x) => x.id === first.id,
    )?.title,
    title,
  );
  assert.throws(
    () => save("tours", data, first.revision, "publish"),
    /Tải lại/,
  );
  save("tours", data, first.revision + 1, "publish");
  assert.equal(
    published<{ id: string; title: string }>("tours", []).find(
      (x) => x.id === first.id,
    )?.title,
    "Bản nháp kiểm thử",
  );
  save("tours", data, first.revision + 2, "unpublish");
  assert.ok(
    !published<{ id: string }>("tours", []).some((x) => x.id === first.id),
  );
});
test("new tour is absent until publish; soft delete and restore keep content recoverable", () => {
  const first = list("tours")[1];
  const data = { ...first.data, id: "tour_cms_new", slug: "cms-new-tour" };
  save("tours", data, 0, "save");
  assert.ok(
    !published<{ slug: string }>("tours", []).some(
      (x) => x.slug === "cms-new-tour",
    ),
  );
  save("tours", data, 1, "publish");
  assert.ok(
    published<{ slug: string }>("tours", []).some(
      (x) => x.slug === "cms-new-tour",
    ),
  );
  save("tours", data, 2, "delete");
  assert.ok(
    !published<{ slug: string }>("tours", []).some(
      (x) => x.slug === "cms-new-tour",
    ),
  );
  save("tours", data, 3, "restore");
  assert.equal(
    list("tours").find((x) => x.id === "tour_cms_new")?.state,
    "draft",
  );
});
test("articles support soft delete and restore without changing display date", () => {
  const source = list("articles")[0];
  const data = {
    ...source.data,
    id: "art_cms_trash",
    slug: "cms-trash-article",
  };
  save("articles", data, 0, "save");
  save("articles", data, 1, "publish");
  const pub = list("articles").find((x) => x.id === "art_cms_trash")!;
  assert.equal(pub.state, "published");
  const stamp = String(
    (pub.data as Record<string, unknown>).updatedAt ??
      (pub.data as Record<string, unknown>).publishedAt,
  );
  save("articles", pub.data, pub.revision, "delete");
  const removed = list("articles").find((x) => x.id === "art_cms_trash")!;
  assert.equal(removed.state, "deleted");
  assert.ok(
    !published<{ id: string }>("articles", []).some(
      (x) => x.id === "art_cms_trash",
    ),
  );
  assert.equal(
    String(
      (removed.data as Record<string, unknown>).updatedAt ??
        (removed.data as Record<string, unknown>).publishedAt,
    ),
    stamp,
  );
  save("articles", removed.data, removed.revision, "restore");
  const restored = list("articles").find((x) => x.id === "art_cms_trash")!;
  assert.equal(restored.state, "draft");
  assert.ok(
    !published<{ id: string }>("articles", []).some(
      (x) => x.id === "art_cms_trash",
    ),
  );
});
test("reject slug changes, missing references, cyclic categories and unsafe image paths", () => {
  const row = list("tours")[1];
  assert.throws(
    () =>
      save(
        "tours",
        { ...row.data, slug: "changed-slug" },
        row.revision,
        "publish",
      ),
    /slug/,
  );
  assert.throws(
    () =>
      save(
        "tours",
        { ...row.data, categoryIds: ["missing"] },
        row.revision,
        "publish",
      ),
    /không tồn tại/,
  );
  assert.throws(
    () =>
      save(
        "tours",
        { ...row.data, images: [{ src: "//evil.test/x", alt: "bad" }] },
        row.revision,
        "publish",
      ),
    /an toàn/,
  );
  const category = list("categories")[0];
  assert.throws(
    () =>
      save(
        "categories",
        { ...category.data, parentId: category.id },
        category.revision,
        "save",
      ),
    /vòng lặp/,
  );
  assert.throws(
    () => save("categories", category.data, category.revision, "delete"),
    /tham chiếu/,
  );
});
test("footer and VI/EN copy publish with original structure intact", () => {
  const settings = list("settings")[0];
  save(
    "settings",
    {
      ...settings.data,
      footerLinks: [{ label: "Test footer", href: "/lien-he" }],
    },
    settings.revision,
    "publish",
  );
  assert.equal(
    published<{ footerLinks: { label: string }[] }>("settings", [])[0]
      .footerLinks[0].label,
    "Test footer",
  );
  const messages = list("messages")[0];
  assert.throws(() =>
    save(
      "messages",
      { id: messages.id, site: {} },
      messages.revision,
      "publish",
    ),
  );
  assert.throws(() =>
    save(
      "settings",
      {
        ...settings.data,
        footerLinks: [{ label: "x", href: "javascript:alert(1)" }],
      },
      settings.revision + 1,
      "publish",
    ),
  );
});
test("login limit remains enforced by persistent SQLite counters", () => {
  assert.equal(consumeLimit("unit", 2, 60000), true);
  assert.equal(consumeLimit("unit", 2, 60000), true);
  assert.equal(consumeLimit("unit", 2, 60000), false);
});
test("lead encryption authenticates data; plaintext PII never enters SQLite payload", () => {
  const data = { fullName: "Khách kiểm thử", phone: "0901234567" };
  const encoded = encrypt(data);
  assert.ok(!encoded.includes(data.phone));
  assert.deepEqual(decrypt(encoded), data);
  const corrupted =
    encoded.slice(0, -2) + (encoded.endsWith("ff") ? "ee" : "ff");
  assert.throws(() => decrypt(corrupted));
  persistLead("test-lead", data);
  assert.equal(listLeads().length, 1);
  assert.equal(
    (
      db().prepare("SELECT data FROM leads WHERE id=?").get("test-lead") as {
        data: string;
      }
    ).data.includes(data.phone),
    false,
  );
});
test("VACUUM backup is independently readable and passes integrity check", () => {
  const file = path.join(directory, "backup.sqlite");
  db().prepare("VACUUM INTO ?").run(file);
  const backup = new DatabaseSync(file);
  assert.equal(
    backup.prepare("PRAGMA integrity_check").get()?.integrity_check,
    "ok",
  );
  assert.ok(
    Number(
      backup.prepare("SELECT COUNT(*) AS count FROM records").get()?.count,
    ) > 0,
  );
  backup.close();
});

test("live versions separate private drafts from published changes and soft deletion", () => {
  const row = list("articles").find((item) => item.state !== "deleted")!;
  const admin = Number(contentVersion("admin"));
  const publicBefore = contentVersion("public");
  const data = { ...row.data, title: "Live revision test" };
  save("articles", data, row.revision, "save");
  assert.equal(contentVersion("public"), publicBefore);
  assert.equal(Number(contentVersion("admin")), admin + 1);
  assert.throws(() => save("articles", data, row.revision, "publish"));
  assert.equal(contentVersion("public"), publicBefore);
  assert.equal(Number(contentVersion("admin")), admin + 1);
  save("articles", data, row.revision + 1, "publish");
  assert.equal(Number(contentVersion("public")), Number(publicBefore) + 1);
  save("articles", data, row.revision + 2, "delete");
  assert.equal(Number(contentVersion("public")), Number(publicBefore) + 2);
  save("articles", data, row.revision + 3, "restore");
  assert.equal(Number(contentVersion("public")), Number(publicBefore) + 2);
});

test("live versions are transactional and observe another process sharing the DB", () => {
  const admin = contentVersion("admin");
  const publicBefore = contentVersion("public");
  assert.throws(() =>
    transaction(() => {
      db().prepare("UPDATE leads SET status='won'").run();
      throw new Error("Rollback test");
    }),
  );
  assert.equal(contentVersion("admin"), admin);
  const other = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import { DatabaseSync } from 'node:sqlite';
    const connection = new DatabaseSync(process.env.CMS_DB_PATH);
    connection.prepare("UPDATE leads SET status='contacted'").run();
    connection.close();
  `,
    ],
    { env: process.env, encoding: "utf8" },
  );
  assert.equal(other.status, 0, other.stderr);
  assert.ok(Number(contentVersion("admin")) > Number(admin));
  assert.equal(contentVersion("public"), publicBefore);
});

test("public version endpoint exposes only its counter and supports conditional requests", async () => {
  const response = versionResponse(
    new Request("https://example.test/api/content-version"),
    "public",
  );
  assert.deepEqual(await response.json(), {
    version: contentVersion("public"),
  });
  const etag = response.headers.get("etag")!;
  const unchanged = versionResponse(
    new Request("https://example.test/api/content-version", {
      headers: { "if-none-match": etag },
    }),
    "public",
  );
  assert.equal(unchanged.status, 304);
  assert.equal(await unchanged.text(), "");
});

test("hero mode and both photo configurations survive draft, publish and switching", () => {
  const row = list("hero")[0];
  assert.equal(homeHero().mode, "carousel");
  const draft = {
    ...row.data,
    mode: "collage",
    vi: { ...defaultHero.vi, titleLine1: "Hero đang chuẩn bị" },
  };
  save("hero", draft, row.revision, "save");
  assert.equal(homeHero().mode, "carousel");
  assert.notEqual(homeHero().vi.titleLine1, "Hero đang chuẩn bị");
  save("hero", draft, row.revision + 1, "publish");
  assert.equal(homeHero().mode, "collage");
  assert.equal(homeHero().vi.titleLine1, "Hero đang chuẩn bị");
  assert.equal(homeHero().slides.length, 5);
  save("hero", { ...draft, mode: "carousel" }, row.revision + 2, "publish");
  assert.equal(homeHero().collageMain.src, defaultHero.collageMain.src);
  assert.throws(() => save("hero", draft, row.revision + 3, "delete"));
  assert.throws(() => save("hero", draft, row.revision, "publish"));
});

test("hero validation rejects empty/duplicate slides, unsafe links and excessive autoplay", () => {
  assert.equal(
    heroSchema.safeParse({ ...defaultHero, slides: [] }).success,
    false,
  );
  assert.equal(
    heroSchema.safeParse({
      ...defaultHero,
      slides: [defaultHero.slides[0], defaultHero.slides[0]],
    }).success,
    false,
  );
  for (const primaryHref of [
    "javascript:alert(1)",
    "//evil.test",
    "/\\evil.test",
    "/../admin",
  ])
    assert.equal(
      heroSchema.safeParse({ ...defaultHero, primaryHref }).success,
      false,
    );
  assert.equal(
    heroSchema.safeParse({ ...defaultHero, intervalSeconds: 2 }).success,
    false,
  );
  assert.equal(
    heroSchema.safeParse({
      ...defaultHero,
      collageMain: { ...defaultHero.collageMain, positionX: 101 },
    }).success,
    false,
  );
});
test("landing sections carry admin-editable trust, principles, featured and guide picks", () => {
  assert.equal(defaultLanding.trust.items.length, 4);
  assert.equal(defaultLanding.values.principles.length, 4);
  assert.deepEqual(defaultLanding.featured.tourIds, []);
  assert.equal(defaultLanding.guides.featuredSlug, "");
  // Old database rows saved before these fields existed still parse:
  // zod defaults backfill them, so no explicit migration is required.
  const legacy = { ...defaultLanding } as Record<string, unknown>;
  delete legacy.trust;
  delete legacy.featured;
  delete legacy.guides;
  const migrated = landingSchema.parse({
    ...legacy,
    values: { photoSrc: "/x.webp" },
  });
  assert.deepEqual(migrated.trust.items, []);
  assert.deepEqual(migrated.featured.tourIds, []);
  assert.equal(migrated.guides.featuredSlug, "");
  assert.ok(migrated.values.photoSrc.startsWith("/"));
  // Invalid icon keys and unknown tour id shapes are rejected.
  assert.equal(
    landingSchema.safeParse({
      ...defaultLanding,
      trust: { items: [{ icon: "rocket", title: "x", body: "y" }] },
    }).success,
    false,
  );
});
test("destination rows written before the home switch still parse", () => {
  const parsed = schemas.destinations.parse({
    id: "dest_legacy",
    slug: "legacy-destination",
    name: "Điểm đến cũ",
    region: "mien-bac",
    summary: "Bản ghi chưa từng có cờ Khám phá.",
  });
  assert.equal(parsed.showOnHome, false);
  assert.equal(parsed.homeOrder, 0);
});

test("home explore is capped at three and auto-numbers a new pick", () => {
  const destinations = list("destinations").filter(
    (row) => row.state !== "deleted",
  );
  const enabled = destinations.filter((row) => row.data.showOnHome === true);
  assert.equal(enabled.length, MAX_HOME_DESTINATIONS);
  const off = destinations.find((row) => row.data.showOnHome !== true)!;
  assert.throws(
    () =>
      save(
        "destinations",
        { ...off.data, showOnHome: true, homeOrder: 0 },
        off.revision,
        "save",
      ),
    /tối đa 3/,
  );
  const disabled = enabled[0];
  save(
    "destinations",
    { ...disabled.data, showOnHome: false },
    disabled.revision,
    "save",
  );
  save(
    "destinations",
    { ...off.data, showOnHome: true, homeOrder: 0 },
    off.revision,
    "save",
  );
  const updated = list("destinations").find((row) => row.id === off.id)!;
  assert.equal(updated.data.showOnHome, true);
  assert.ok(Number(updated.data.homeOrder) > 0);
});

test("stale tour rows inherit photo sources from the content files", () => {
  const id = "tour_mb_sapa_3n2d";
  const row = list("tours").find((item) => item.id === id)!;
  const stale = {
    ...row.data,
    images: [
      { alt: "Ruộng bậc thang Sa Pa" },
      { alt: "Đỉnh Fansipan trong mây" },
      { alt: "Bản làng vùng cao Lào Cai" },
    ],
  };
  db()
    .prepare(
      "UPDATE records SET data=?,published=? WHERE collection='tours' AND id=?",
    )
    .run(JSON.stringify(stale), JSON.stringify(stale), id);

  assert.ok(fillTourImageSources() >= 1);
  const images = list("tours").find((item) => item.id === id)!.data
    .images as { src?: string; alt?: string }[];
  assert.ok(images.length >= 3);
  assert.ok(images.every((image) => image.src?.startsWith("/images/")));
  assert.equal(images[0].alt, "Ruộng bậc thang Sa Pa");
  // Idempotent: a second boot must not touch the repaired row.
  assert.equal(fillTourImageSources(), 0);
});

const storeFileUrl = new URL("../src/server/cms/store.ts", import.meta.url).href;

/** Write a row exactly as an older release stored it. */
function writeStoredRow(
  collection: string,
  id: string,
  data: Record<string, unknown>,
) {
  db()
    .prepare(
      "UPDATE records SET data=?,published=? WHERE collection=? AND id=?",
    )
    .run(JSON.stringify(data), JSON.stringify(data), collection, id);
}

function readStoredRow(collection: string, id: string) {
  return db()
    .prepare("SELECT data,published FROM records WHERE collection=? AND id=?")
    .get(collection, id) as { data: string; published: string | null };
}

function restoreStoredRow(
  collection: string,
  id: string,
  row: { data: string; published: string | null },
) {
  db()
    .prepare(
      "UPDATE records SET data=?,published=? WHERE collection=? AND id=?",
    )
    .run(row.data, row.published, collection, id);
}

test("legacy category and article rows recover the seed photo in draft and published", () => {
  const categoryId = "cat_mien_bac";
  const articleId = "art_thoi_diem_qn";
  const before = {
    category: readStoredRow("categories", categoryId),
    article: readStoredRow("articles", articleId),
  };
  const category = list("categories").find((row) => row.id === categoryId)!;
  const article = list("articles").find((row) => row.id === articleId)!;
  const categoryAlt = (category.data.image as { alt: string }).alt;
  const articleAlt = (article.data.cover as { alt: string }).alt;
  // Production stored `src: null` on categories and no `src` at all on the
  // article covers; both shapes must be treated as "no photo yet".
  const staleCategory = {
    ...category.data,
    image: { alt: categoryAlt, src: null },
  };
  const staleArticle = { ...article.data, cover: { alt: articleAlt } };
  writeStoredRow("categories", categoryId, staleCategory);
  writeStoredRow("articles", articleId, staleArticle);

  const publicVersionBefore = contentVersion("public");
  assert.ok(fillMissingMediaSources() >= 2);
  // The write goes through the same table trigger as an admin edit, so the
  // public content version moves and cached clients refresh.
  assert.ok(Number(contentVersion("public")) > Number(publicVersionBefore));

  const liveCategory = published<{
    id: string;
    image?: { src?: string; alt?: string };
  }>("categories", []).find((row) => row.id === categoryId)!;
  assert.equal(liveCategory.image?.src, "/images/destinations/ha-long.jpg");
  assert.equal(liveCategory.image?.alt, categoryAlt);
  const liveArticle = published<{
    id: string;
    cover?: { src?: string; alt?: string };
  }>("articles", []).find((row) => row.id === articleId)!;
  assert.equal(liveArticle.cover?.src, "/images/tours/d7233006cc4fd0f9.jpeg");
  assert.equal(liveArticle.cover?.alt, articleAlt);

  // Only `src` was added — alt, body, SEO and every other stored field survive.
  assert.deepEqual(list("categories").find((row) => row.id === categoryId)!.data, {
    ...staleCategory,
    image: { ...staleCategory.image, src: "/images/destinations/ha-long.jpg" },
  });
  assert.deepEqual(list("articles").find((row) => row.id === articleId)!.data, {
    ...staleArticle,
    cover: { ...staleArticle.cover, src: "/images/tours/d7233006cc4fd0f9.jpeg" },
  });

  // Running again finds nothing missing and writes nothing.
  assert.equal(fillMissingMediaSources(), 0);
  restoreStoredRow("categories", categoryId, before.category);
  restoreStoredRow("articles", articleId, before.article);
});

test("missing published image objects recover without overwriting an owner's draft photo", () => {
  for (const image of [undefined, null]) {
    const id = "cat_mien_bac";
    const before = readStoredRow("categories", id);
    try {
      const row = JSON.parse(before.data) as Record<string, unknown>;
      const draft = { ...row, image: { src: "/images/uploads/owner.jpg", alt: "Ảnh riêng" } };
      const live = { ...row, image };
      db().prepare("UPDATE records SET data=?,published=? WHERE collection='categories' AND id=?")
        .run(JSON.stringify(draft), JSON.stringify(live), id);
      fillMissingMediaSources();
      const repaired = readStoredRow("categories", id);
      assert.deepEqual(JSON.parse(repaired.data), draft);
      assert.deepEqual(JSON.parse(repaired.published!), {
        ...live,
        image: { src: "/images/destinations/ha-long.jpg", alt: "Vịnh Hạ Long nhìn từ đảo Ti Tốp" },
      });
    } finally {
      restoreStoredRow("categories", id, before);
    }
  }
});

test("the media backfill never replaces a photo the owner picked", () => {
  const id = "cat_mien_trung";
  const before = readStoredRow("categories", id);
  const row = JSON.parse(before.data) as Record<string, unknown>;
  const chosen = {
    ...(row.image as Record<string, unknown>),
    src: "/images/uploads/owner-pick.jpg",
    alt: "Ảnh chủ shop chọn",
  };
  writeStoredRow("categories", id, { ...row, image: chosen });

  fillMissingMediaSources();
  const stored = list("categories").find((item) => item.id === id)!;
  assert.equal(
    (stored.data.image as { src: string }).src,
    "/images/uploads/owner-pick.jpg",
  );
  assert.equal((stored.data.image as { alt: string }).alt, "Ảnh chủ shop chọn");
  assert.equal(
    (JSON.parse(readStoredRow("categories", id).published!) as {
      image: { src: string };
    }).image.src,
    "/images/uploads/owner-pick.jpg",
  );
  restoreStoredRow("categories", id, before);
});

test("a deploy repairs missing image objects even after the v1 migration ran", () => {
  const id = "cat_tay_nguyen";
  const before = readStoredRow("categories", id);
  const row = JSON.parse(before.data) as Record<string, unknown>;
  const alt = (row.image as { alt: string }).alt;
  // v1 skipped categories with no image object, but still recorded success.
  const legacy = { ...row };
  delete legacy.image;
  writeStoredRow("categories", id, legacy);
  db().prepare("INSERT OR IGNORE INTO cms_migrations(id,applied_at) VALUES(?,?)")
    .run("media-sources/categories-articles:v1", new Date().toISOString());
  db().prepare("DELETE FROM cms_migrations WHERE id=?").run(MEDIA_SOURCE_MIGRATION);

  // Booting the new build is a separate process, exactly like a deploy.
  const boot = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--conditions=react-server",
      "-e",
      `const { list } = require(${JSON.stringify(fileURLToPath(storeFileUrl))}); list("categories");`,
    ],
    { env: process.env, encoding: "utf8" },
  );
  assert.equal(boot.status, 0, boot.stderr);
  assert.equal(
    (list("categories").find((item) => item.id === id)!.data.image as {
      src?: string;
    }).src,
    "/images/destinations/da-lat.jpg",
  );
  assert.equal(
    (
      JSON.parse(readStoredRow("categories", id).published!) as {
        image: { src?: string };
      }
    ).image.src,
    "/images/destinations/da-lat.jpg",
  );

  // The ledger records it once; a later boot does not touch the row again.
  const ledger = db()
    .prepare("SELECT COUNT(*) AS total FROM cms_migrations WHERE id=?")
    .get(MEDIA_SOURCE_MIGRATION) as { total: number };
  assert.equal(ledger.total, 1);
  writeStoredRow("categories", id, { ...row, image: { alt } });
  assert.equal(migrateContent(), 0);
  assert.equal(
    (list("categories").find((item) => item.id === id)!.data.image as {
      src?: string;
    }).src,
    undefined,
  );
  restoreStoredRow("categories", id, before);
});

test("destination CRUD round-trips draft, publish, unpublish, delete and restore", () => {
  const seed = list("destinations")[0];
  const draft = {
    ...seed.data,
    id: "dest_crud_check",
    slug: "diem-crud-check",
    name: "Điểm CRUD",
    summary: "Bản ghi dùng cho kiểm thử CRUD.",
    order: 99,
    showOnHome: false,
    homeOrder: 0,
  };
  const created = save("destinations", draft, 0, "save");
  assert.equal(created.revision, 1);
  assert.ok(
    !published<{ id: string }>("destinations", []).some(
      (row) => row.id === "dest_crud_check",
    ),
  );

  const updated = save(
    "destinations",
    { ...draft, name: "Điểm CRUD đã sửa" },
    created.revision,
    "publish",
  );
  const live = published<{ id: string; name: string }>("destinations", []);
  assert.equal(
    live.find((row) => row.id === "dest_crud_check")?.name,
    "Điểm CRUD đã sửa",
  );

  const hidden = save(
    "destinations",
    { ...draft, name: "Điểm CRUD đã sửa" },
    updated.revision,
    "unpublish",
  );
  assert.ok(
    !published<{ id: string }>("destinations", []).some(
      (row) => row.id === "dest_crud_check",
    ),
  );
  assert.equal(
    list("destinations").find((row) => row.id === "dest_crud_check")?.state,
    "draft",
  );

  const trashed = save(
    "destinations",
    { ...draft, name: "Điểm CRUD đã sửa" },
    hidden.revision,
    "delete",
  );
  assert.equal(
    list("destinations").find((row) => row.id === "dest_crud_check")?.state,
    "deleted",
  );

  save(
    "destinations",
    { ...draft, name: "Điểm CRUD đã sửa" },
    trashed.revision,
    "restore",
  );
  assert.equal(
    list("destinations").find((row) => row.id === "dest_crud_check")?.state,
    "draft",
  );
});

test("category CRUD keeps its path stable and can be restored", () => {
  const seed = list("categories")[0];
  const draft = {
    ...seed.data,
    id: "cat_crud_check",
    slug: "danh-muc-crud-check",
    path: "/danh-muc/danh-muc-crud-check",
    name: "Danh mục CRUD",
    parentId: null,
    order: 99,
  };
  const created = save("categories", draft, 0, "save");
  assert.equal(created.revision, 1);
  const renamed = save(
    "categories",
    { ...draft, name: "Danh mục CRUD đã sửa" },
    created.revision,
    "publish",
  );
  assert.equal(
    published<{ id: string; name: string }>("categories", []).find(
      (row) => row.id === "cat_crud_check",
    )?.name,
    "Danh mục CRUD đã sửa",
  );
  const trashed = save(
    "categories",
    { ...draft, name: "Danh mục CRUD đã sửa" },
    renamed.revision,
    "delete",
  );
  assert.equal(
    list("categories").find((row) => row.id === "cat_crud_check")?.state,
    "deleted",
  );
  save(
    "categories",
    { ...draft, name: "Danh mục CRUD đã sửa" },
    trashed.revision,
    "restore",
  );
  assert.equal(
    list("categories").find((row) => row.id === "cat_crud_check")?.state,
    "draft",
  );
});

test("article CRUD publishes, hides and restores without losing the display date", () => {
  const seed = list("articles")[0];
  const draft = {
    ...seed.data,
    id: "art_crud_check",
    slug: "bai-viet-crud-check",
    title: "Bài viết CRUD",
    publishedAt: "2026-01-02",
  };
  const created = save("articles", draft, 0, "save");
  const live = save(
    "articles",
    { ...draft, title: "Bài viết CRUD đã sửa" },
    created.revision,
    "publish",
  );
  assert.equal(
    published<{ id: string; title: string }>("articles", []).find(
      (row) => row.id === "art_crud_check",
    )?.title,
    "Bài viết CRUD đã sửa",
  );
  const hidden = save(
    "articles",
    { ...draft, title: "Bài viết CRUD đã sửa" },
    live.revision,
    "unpublish",
  );
  assert.ok(
    !published<{ id: string }>("articles", []).some(
      (row) => row.id === "art_crud_check",
    ),
  );
  const trashed = save(
    "articles",
    { ...draft, title: "Bài viết CRUD đã sửa" },
    hidden.revision,
    "delete",
  );
  assert.equal(
    list("articles").find((row) => row.id === "art_crud_check")?.state,
    "deleted",
  );
  save(
    "articles",
    { ...draft, title: "Bài viết CRUD đã sửa" },
    trashed.revision,
    "restore",
  );
  const restored = list("articles").find((row) => row.id === "art_crud_check")!;
  assert.equal(restored.state, "draft");
  assert.equal(restored.data.publishedAt, "2026-01-02");
});

test("home featured tours follow the pinned order and stop at the selection", () => {
  const landing = list("landing")[0];
  const automatic = getFeaturedTours(6, "vi").map((tour) => tour.slug);
  assert.ok(automatic.length >= 2);
  const pinned = [automatic[1], automatic[0]];
  save(
    "landing",
    { ...landing.data, featured: { tourIds: pinned } },
    landing.revision,
    "publish",
  );
  const selected = getFeaturedTours(6, "vi");
  assert.deepEqual(
    selected.map((tour) => tour.slug),
    pinned,
  );
  // An unknown key is ignored; a slug and an id both resolve.
  save(
    "landing",
    {
      ...landing.data,
      featured: { tourIds: [automatic[0], "missing-tour", pinned[0]] },
    },
    landing.revision + 1,
    "publish",
  );
  assert.deepEqual(
    getFeaturedTours(6, "vi").map((tour) => tour.slug),
    [automatic[0], pinned[0]],
  );
  save("landing", landing.data, landing.revision + 2, "publish");
});

test("settings rows written before the SEO fields inherit safe defaults", () => {
  const row = list("settings")[0];
  const legacy = { ...row.data } as Record<string, unknown>;
  delete legacy.seo;
  db()
    .prepare(
      "UPDATE records SET data=?, published=? WHERE collection='settings' AND id=?",
    )
    .run(JSON.stringify(legacy), JSON.stringify(legacy), row.id);
  try {
    const current = settings();
    assert.equal(current.seo.homeTitle, HOME_SEO.vi.title);
    assert.equal(current.seo.homeDescription, HOME_SEO.vi.description);
    assert.equal(current.seo.homeTitleEn, HOME_SEO.en.title);
  } finally {
    db()
      .prepare(
        "UPDATE records SET data=?, published=? WHERE collection='settings' AND id=?",
      )
      .run(JSON.stringify(row.data), JSON.stringify(row.data), row.id);
  }
});

test("legacy settings rows receive SEO defaults for the Studio form", () => {
  const row = list("settings")[0];
  const legacy = { ...row.data } as Record<string, unknown>;
  delete legacy.seo;
  db()
    .prepare(
      "UPDATE records SET data=?, published=? WHERE collection='settings' AND id=?",
    )
    .run(JSON.stringify(legacy), JSON.stringify(legacy), row.id);

  assert.ok(backfillSettingsSeo() >= 1);
  const current = list("settings")[0].data as {
    seo?: { homeTitle?: string };
  };
  assert.equal(current.seo?.homeTitle, HOME_SEO.vi.title);
  assert.equal(backfillSettingsSeo(), 0);
});

test("trash auto-deletes rows older than the retention window", () => {
  const oldDate = new Date(
    Date.now() - (TRASH_RETENTION_DAYS + 5) * 24 * 60 * 60 * 1000,
  ).toISOString();
  const freshDate = new Date().toISOString();
  db()
    .prepare(
      "INSERT INTO records(collection,id,data,published,state,revision,updated_at) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      "tours",
      "tour_trash_old",
      "{}",
      null,
      "deleted",
      1,
      oldDate,
    );
  db()
    .prepare(
      "INSERT INTO records(collection,id,data,published,state,revision,updated_at) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      "tours",
      "tour_trash_fresh",
      "{}",
      null,
      "deleted",
      1,
      freshDate,
    );
  const removed = purgeExpiredTrash();
  assert.ok(removed >= 1);
  const ids = list("tours").map((row) => row.id);
  assert.ok(!ids.includes("tour_trash_old"));
  assert.ok(ids.includes("tour_trash_fresh"));
});
test("cms data dir stays local unless running on Vercel", () => {
  const prev = process.env.VERCEL;
  delete process.env.VERCEL;
  assert.ok(cmsDataDir().endsWith("data"));
  process.env.VERCEL = "1";
  assert.equal(cmsDataDir(), "/tmp");
  if (prev === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = prev;
});

test("home regions save atomically, publish only scoped fields, and reject stale edits", () => {
  const landing = list("landing")[0];
  const category = list("categories").find((row) => row.id === "cat_mien_bac")!;
  const beforeLanding = readStoredRow("landing", landing.id);
  const beforeCategory = readStoredRow("categories", category.id);
  try {
    const publicLanding = JSON.parse(beforeLanding.published!);
    const publicCategory = JSON.parse(beforeCategory.published!);
    // Simulate unrelated private drafts in the same records.
    const privateLanding = {
      ...landing.data,
      explore: { ...defaultLanding.explore, titleA: "PRIVATE EXPLORE" },
    };
    const privateCategory = {
      ...category.data,
      description: "PRIVATE CATEGORY DESCRIPTION",
    };
    save("landing", privateLanding, landing.revision, "save");
    save("categories", privateCategory, category.revision, "save");
    const regions = { ...defaultLanding.regions, titleA: "Việt Nam mới" };
    const cards = [
      {
        id: category.id,
        revision: category.revision + 1,
        name: "Tour Miền Bắc mới",
        tagline: "Hà Nội và Hạ Long",
        image: { src: "/images/destinations/ha-long.jpg", alt: "Hạ Long" },
      },
    ];
    saveHomeRegions({
      revision: landing.revision + 1,
      action: "save",
      regions,
      cards,
    });
    assert.equal(
      readStoredRow("landing", landing.id).published,
      beforeLanding.published,
    );
    assert.equal(
      readStoredRow("categories", category.id).published,
      beforeCategory.published,
    );
    const draftLanding = readStoredRow("landing", landing.id);
    const draftCategory = readStoredRow("categories", category.id);
    const revision = landing.revision + 2;
    // One stale category must roll back the earlier landing write and audit.
    const auditBefore = (
      db().prepare("SELECT COUNT(*) AS n FROM audit").get() as { n: number }
    ).n;
    assert.throws(
      () =>
        saveHomeRegions({
          revision,
          action: "publish",
          regions,
          cards: [{ ...cards[0], revision: 0 }],
        }),
      /đã thay đổi/,
    );
    assert.deepEqual(readStoredRow("landing", landing.id), draftLanding);
    assert.deepEqual(readStoredRow("categories", category.id), draftCategory);
    assert.equal(
      (db().prepare("SELECT COUNT(*) AS n FROM audit").get() as { n: number })
        .n,
      auditBefore,
    );
    assert.equal(list("landing")[0].revision, revision);
    saveHomeRegions({
      revision,
      action: "publish",
      regions,
      cards: [{ ...cards[0], revision: category.revision + 2 }],
    });
    const liveLanding = JSON.parse(
      readStoredRow("landing", landing.id).published!,
    );
    const liveCategory = JSON.parse(
      readStoredRow("categories", category.id).published!,
    );
    assert.equal(liveLanding.regions.titleA, regions.titleA);
    assert.deepEqual(liveLanding.explore, publicLanding.explore);
    assert.equal(liveCategory.name, cards[0].name);
    assert.equal(liveCategory.description, publicCategory.description);
    assert.deepEqual(liveCategory.image, cards[0].image);
    assert.equal(
      JSON.parse(readStoredRow("categories", category.id).data).description,
      "PRIVATE CATEGORY DESCRIPTION",
    );
    assert.equal(
      JSON.parse(readStoredRow("landing", landing.id).data).explore.titleA,
      "PRIVATE EXPLORE",
    );
    // IDs outside the domestic children and duplicated IDs are rejected atomically.
    const latest = list("landing")[0];
    const stable = readStoredRow("landing", landing.id);
    assert.throws(
      () =>
        saveHomeRegions({
          revision: latest.revision,
          action: "save",
          regions,
          cards: [{ ...cards[0], id: "cat_missing" }],
        }),
      /không còn thuộc/,
    );
    assert.deepEqual(readStoredRow("landing", landing.id), stable);
    assert.throws(
      () =>
        saveHomeRegions({
          revision: latest.revision,
          action: "save",
          regions,
          cards: [cards[0], cards[0]],
        }),
      /trùng/,
    );
  } finally {
    restoreStoredRow("landing", landing.id, beforeLanding);
    restoreStoredRow("categories", category.id, beforeCategory);
  }
});

test("a Studio placeholder slug becomes readable and the old URL redirects", () => {
  const source = list("tours").find((row) => row.id === "tour_qn_py_3n2d")!;
  const draft = {
    ...source.data,
    id: "tour_slug_repair",
    slug: "noi-dung-abc12345",
    title: "Nội dung mới",
  };
  // First save while the tour is still unnamed keeps the temporary slug.
  save("tours", draft, 0, "save");
  assert.equal(
    list("tours").find((row) => row.id === "tour_slug_repair")?.data.slug,
    "noi-dung-abc12345",
  );
  // Naming it turns the placeholder into the public slug and keeps the old URL.
  save(
    "tours",
    { ...draft, title: "Tour Đảo Bình Ba 2N1Đ" },
    1,
    "publish",
  );
  const saved = list("tours").find((row) => row.id === "tour_slug_repair")!;
  assert.equal(saved.data.slug, "dao-binh-ba-2-ngay-1-dem");
  assert.ok(
    published<{ slug: string }>("tours", []).some(
      (tour) => tour.slug === "dao-binh-ba-2-ngay-1-dem",
    ),
  );
  assert.equal(
    redirectTarget("/tour/noi-dung-abc12345"),
    "/tour/dao-binh-ba-2-ngay-1-dem",
  );
  // The readable slug is now a published decision and may not change again.
  assert.throws(
    () =>
      save(
        "tours",
        { ...saved.data, slug: "dao-binh-ba-doi-ten" },
        saved.revision,
        "publish",
      ),
    /slug/,
  );
});

test("a title-derived slug that already exists gets a numeric suffix", () => {
  const source = list("articles").find((row) => row.state !== "deleted")!;
  const title = "Kinh nghiệm du lịch Quy Nhơn – Phú Yên thử slug";
  const base = slugFromTitle(title);
  assert.ok(base);
  const draft = (id: string) => ({
    ...source.data,
    id,
    slug: base,
    title,
  });
  save("articles", draft("art_slug_auto_a"), 0, "save");
  save("articles", draft("art_slug_auto_b"), 0, "save");
  const savedA = list("articles").find((row) => row.id === "art_slug_auto_a")!;
  const savedB = list("articles").find((row) => row.id === "art_slug_auto_b")!;
  assert.equal(savedA.data.slug, base);
  assert.equal(savedB.data.slug, `${base}-2`);
});

test("featured follows the chosen route and keeps every scope's list", () => {
  const before = list("landing")[0];
  const north = getAutomaticFeaturedTours(6, "vi", "cat_mien_bac").map(
    (tour) => tour.slug,
  );
  const focus = getAutomaticFeaturedTours(6, "vi").map((tour) => tour.slug);
  assert.ok(north.length > 0);
  assert.ok(focus.length >= 2);

  try {
    save(
      "landing",
      {
        ...before.data,
        featured: {
          categoryId: "cat_mien_bac",
          mode: "auto",
          tourIds: [north[0]],
          scopes: {
            cat_quy_nhon_phu_yen: {
              mode: "manual",
              tourIds: [focus[1], focus[0]],
            },
            cat_mien_bac: { mode: "auto", tourIds: [north[0]] },
          },
        },
      },
      before.revision,
      "publish",
    );

    // Automatic mode stays inside the selected region and ignores stale pins.
    const automatic = getFeaturedTours(6, "vi");
    assert.ok(automatic.length > 0);
    assert.ok(
      automatic.every((tour) => tour.categoryIds.includes("cat_mien_bac")),
    );

    // Heading is derived from the route when the owner leaves it empty.
    const section = getFeaturedHome("vi");
    assert.equal(section.categoryId, "cat_mien_bac");
    assert.equal(section.scope.mode, "auto");
    const copy = featuredCopy(section, "vi", {
      eyebrow: "Tuyến trọng tâm",
      title: "Tour nổi bật",
      description: "Mặc định",
    });
    assert.equal(copy.title, "Tour Miền Bắc nổi bật");
    assert.equal(copy.eyebrow, "Vùng miền");
    const copyEn = featuredCopy(section, "en", {
      eyebrow: "Focus route",
      title: "Featured tours",
      description: "Fallback",
    });
    assert.equal(copyEn.title.toLowerCase(), "featured northern vietnam tours");
    assert.equal(copyEn.eyebrow, "Regions");

    // The other route's pins were saved untouched.
    const stored = list("landing")[0].data.featured as {
      scopes: Record<string, { tourIds: string[] }>;
    };
    assert.deepEqual(stored.scopes.cat_quy_nhon_phu_yen.tourIds, [
      focus[1],
      focus[0],
    ]);

    // Switching the live route back restores that manual order.
    const current = list("landing")[0];
    const featured = current.data.featured as Record<string, unknown>;
    save(
      "landing",
      {
        ...current.data,
        featured: {
          ...featured,
          categoryId: "cat_quy_nhon_phu_yen",
          mode: "manual",
          tourIds: [focus[1], focus[0]],
        },
      },
      current.revision,
      "publish",
    );
    assert.deepEqual(
      getFeaturedTours(6, "vi").map((tour) => tour.slug),
      [focus[1], focus[0]],
    );
  } finally {
    const current = list("landing")[0];
    save("landing", before.data, current.revision, "publish");
  }
});

test("the slug migration renames placeholders and follows references", () => {
  const insert = db().prepare(
    "INSERT INTO records(collection,id,data,published,state,revision,updated_at) VALUES(?,?,?,?,?,?,?)",
  );
  const now = new Date().toISOString();
  const tour = {
    id: "tour_migrate_slug",
    slug: "noi-dung-deadbeef",
    title: "Tour Hà Giang 3N2Đ",
  };
  const article = {
    id: "art_migrate_slug",
    slug: "bai-viet-migrate",
    title: "Bài viết kiểm thử migration",
    relatedTourSlugs: ["noi-dung-deadbeef"],
  };
  insert.run(
    "tours",
    tour.id,
    JSON.stringify(tour),
    JSON.stringify(tour),
    "published",
    1,
    now,
  );
  insert.run(
    "articles",
    article.id,
    JSON.stringify(article),
    JSON.stringify(article),
    "published",
    1,
    now,
  );
  const landing = list("landing")[0];
  const beforeLanding = JSON.parse(
    (
      db()
        .prepare("SELECT data FROM records WHERE collection='landing' AND id=?")
        .get(landing.id) as { data: string }
    ).data,
  ) as Record<string, unknown>;
  const featured = {
    ...(beforeLanding.featured as Record<string, unknown>),
    tourIds: ["noi-dung-deadbeef"],
  };
  db()
    .prepare(
      "UPDATE records SET data=?, published=? WHERE collection='landing' AND id=?",
    )
    .run(
      JSON.stringify({ ...beforeLanding, featured }),
      JSON.stringify({ ...beforeLanding, featured }),
      landing.id,
    );

  const repaired = repairPlaceholderSlugs();
  assert.ok(repaired >= 1);
  assert.equal(
    list("tours").find((row) => row.id === tour.id)?.data.slug,
    "ha-giang-3-ngay-2-dem",
  );
  assert.equal(
    published<{ id: string; slug: string }>("tours", []).find(
      (row) => row.id === tour.id,
    )?.slug,
    "ha-giang-3-ngay-2-dem",
  );
  const migratedArticle = list("articles").find(
    (row) => row.id === article.id,
  )!;
  assert.deepEqual(migratedArticle.data.relatedTourSlugs, [
    "ha-giang-3-ngay-2-dem",
  ]);
  assert.deepEqual(
    (
      published<{ id: string; relatedTourSlugs: string[] }>("articles", []).find(
        (row) => row.id === article.id,
      ) as { relatedTourSlugs: string[] }
    ).relatedTourSlugs,
    ["ha-giang-3-ngay-2-dem"],
  );
  assert.equal(
    redirectTarget("/tour/noi-dung-deadbeef"),
    "/tour/ha-giang-3-ngay-2-dem",
  );
  const liveLanding = list("landing")[0];
  assert.deepEqual(
    (liveLanding.data.featured as Record<string, unknown>).tourIds,
    ["ha-giang-3-ngay-2-dem"],
  );
});

test("customer videos only accept safe YouTube URLs", () => {
  const row = list("landing")[0];
  const base = row.data as Record<string, unknown>;
  const invalid = {
    ...base,
    customers: {
      enabled: true,
      videos: [
        {
          id: "video_bad",
          title: "Video kiểm thử",
          youtubeUrl: "javascript:alert(1)",
        },
      ],
    },
  };
  assert.throws(
    () => save("landing", invalid, row.revision, "save"),
    /YouTube/,
  );
  const iframe = {
    ...base,
    customers: {
      enabled: true,
      videos: [
        {
          id: "video_bad",
          title: "Video kiểm thử",
          youtubeUrl:
            "<iframe src=\"https://www.youtube.com/embed/dQw4w9WgXcQ\"></iframe>",
        },
      ],
    },
  };
  assert.throws(
    () => save("landing", iframe, row.revision, "save"),
    /YouTube/,
  );
});

test("translated settings and tour fields survive save and reload", () => {
  const settingsRow = list("settings")[0];
  const settingsData = settingsRow.data as Record<string, unknown>;
  const contact = settingsData.contact as Record<string, unknown>;
  const seo = settingsData.seo as Record<string, unknown>;
  save(
    "settings",
    {
      ...settingsData,
      contact: { ...contact, workingHoursEn: "Mon–Sun, 8:00–18:00" },
      seo: { ...seo, homeTitleEn: "Saved English home title" },
    },
    settingsRow.revision,
    "save",
  );
  const reloadedSettings = list("settings")[0].data as Record<string, unknown>;
  assert.equal(
    (reloadedSettings.contact as Record<string, unknown>).workingHoursEn,
    "Mon–Sun, 8:00–18:00",
  );
  assert.equal(
    (reloadedSettings.seo as Record<string, unknown>).homeTitleEn,
    "Saved English home title",
  );

  const tourRow = list("tours").find(
    (row) =>
      row.state === "published" &&
      typeof row.data.summary === "string" &&
      Array.isArray(row.data.categoryIds) &&
      Boolean(row.data.duration) &&
      typeof row.data.updatedAt === "string",
  );
  assert.ok(tourRow, "expected a complete published tour");
  const tourData = tourRow.data as Record<string, unknown>;
  const candidate = {
    ...tourData,
    _en: {
      ...((tourData._en as Record<string, unknown> | undefined) ?? {}),
      title: "Saved English tour title",
    },
  };
  const checked = schemas.tours.safeParse(candidate);
  assert.ok(
    checked.success,
    checked.success ? "" : JSON.stringify(checked.error.issues),
  );
  save("tours", candidate, tourRow.revision, "save");
  const reloadedTour = list("tours").find((row) => row.id === tourRow.id);
  const reloadedEn = reloadedTour?.data._en as Record<string, unknown> | undefined;
  assert.equal(reloadedEn?.title, "Saved English tour title");
  assert.equal(
    (reloadedTour?.data.slug as string) ?? "",
    String(tourData.slug ?? ""),
    "translation never changes the slug",
  );
});

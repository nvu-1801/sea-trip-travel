import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { spawnSync } from "node:child_process";
import { contentVersion, transaction } from "../src/server/cms/db";
import { versionResponse } from "../src/server/cms/version-response";
import { defaultHero, heroSchema } from "../src/domain/home-hero";
import { defaultLanding, landingSchema } from "../src/domain/landing";
import { homeHero } from "../src/server/cms/store";
import { searchKey } from "../src/lib/search";
import {
  resolveArticle,
  articleTranslationStatus,
} from "../src/lib/data/localize";
import type { TravelArticle } from "../src/domain/article";
import { defaultSettings } from "../src/server/cms/settings";
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
} from "../src/server/cms/store";
import {
  hashPassword,
  verifyPassword,
  sameOrigin,
} from "../src/server/cms/auth";
import { db } from "../src/server/cms/db";
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

test("section batch rolls back every document and version when a later revision conflicts", async () => {
  const { saveBatch } = await import("../src/server/cms/store");
  const home = list("landing")[0],
    copy = list("messages").find((row) => row.id === "vi")!;
  const beforePublic = contentVersion("public"),
    beforeAdmin = contentVersion("admin");
  assert.throws(
    () =>
      saveBatch([
        {
          collection: "landing",
          data: {
            ...home.data,
            story: {
              ...(home.data.story as object),
              titleA: "Should roll back",
            },
          },
          revision: home.revision,
          action: "publish",
        },
        {
          collection: "messages",
          data: copy.data,
          revision: copy.revision - 1,
          action: "publish",
        },
      ]),
    /Nội dung đã thay đổi/,
  );
  assert.equal(list("landing")[0].revision, home.revision);
  assert.deepEqual(list("landing")[0].data, home.data);
  assert.equal(contentVersion("public"), beforePublic);
  assert.equal(contentVersion("admin"), beforeAdmin);
  const result = saveBatch([
    {
      collection: "landing",
      data: home.data,
      revision: home.revision,
      action: "save",
    },
    {
      collection: "messages",
      data: copy.data,
      revision: copy.revision,
      action: "save",
    },
  ]);
  assert.equal(result.length, 2);
  assert.equal(contentVersion("public"), beforePublic);
});
test("old landing and catalog records gain defaults without replacing edits or revisions", async () => {
  const old = list("landing")[0];
  const input = structuredClone(old.data);
  delete input.display;
  delete input.sectionOrder;
  const story = input.story as Record<string, unknown>;
  delete story.photoSrc;
  delete story.titleA;
  db()
    .prepare("UPDATE records SET data=? WHERE collection='landing' AND id=?")
    .run(JSON.stringify(input), old.id);
  const normalized = list("landing")[0];
  assert.equal(normalized.revision, old.revision);
  assert.equal(
    (normalized.data.story as Record<string, unknown>).photoSrc,
    "/images/hero/coastal-sunset.webp",
  );
  assert.deepEqual(
    (normalized.data.story as Record<string, unknown>).trips,
    story.trips,
  );
  const message = list("messages").find((row) => row.id === "vi")!;
  const legacy = structuredClone(message.data) as Record<string, unknown>;
  const legacyHome = legacy.home as Record<string, unknown>;
  delete legacyHome.finder;
  (legacyHome.featured as Record<string, unknown>).title =
    "Giữ nội dung đã sửa";
  db()
    .prepare(
      "UPDATE records SET data=? WHERE collection='messages' AND id='vi'",
    )
    .run(JSON.stringify(legacy));
  const restored = list("messages").find((row) => row.id === "vi")!;
  const restoredHome = restored.data.home as Record<string, unknown>;
  assert.ok(restoredHome.finder);
  assert.equal(
    (restoredHome.featured as Record<string, unknown>).title,
    "Giữ nội dung đã sửa",
  );
});
test("custom pages stay private until publish, support hide/trash/restore and reject unsafe paths", async () => {
  const { contentPageSchema } = await import("../src/domain/page");
  const input = contentPageSchema.parse({
    id: "page_studio_test",
    slug: "studio-test",
    title: "Trang thử nghiệm",
    body: [{ type: "paragraph", text: "Nội dung an toàn" }],
  });
  const exists = () =>
    published("pages", []).some(
      (page: unknown) => (page as { id: string }).id === input.id,
    );
  save("pages", input, 0, "save");
  assert.equal(exists(), false);
  save("pages", input, 1, "publish");
  assert.equal(exists(), true);
  assert.throws(
    () =>
      save(
        "pages",
        { ...input, cover: { src: "//evil.example/a.jpg", alt: "Ảnh" } },
        2,
        "publish",
      ),
    /Đường dẫn không an toàn/,
  );
  assert.throws(
    () => save("pages", { ...input, slug: "chinh-sach-bao-mat" }, 2, "publish"),
    /dành riêng/,
  );
  save("pages", input, 2, "unpublish");
  assert.equal(exists(), false);
  save("pages", input, 3, "delete");
  assert.equal(
    list("pages").find((page) => page.id === input.id)?.state,
    "deleted",
  );
  save("pages", input, 4, "restore");
  assert.equal(exists(), false);
});
test("home selection validates references and blocks deletion while a tour is pinned", () => {
  const tour = list("tours").find((row) => row.state !== "deleted")!;
  const home = list("landing")[0];
  assert.throws(
    () =>
      save(
        "landing",
        { ...home.data, featured: { tourIds: ["tour_missing"] } },
        home.revision,
        "save",
      ),
    /không tồn tại/,
  );
  save(
    "landing",
    { ...home.data, featured: { tourIds: [tour.id] } },
    home.revision,
    "publish",
  );
  assert.throws(
    () => save("tours", tour.data, tour.revision, "delete"),
    /trang chủ|tham chiếu/,
  );
  const latest = list("landing")[0];
  save(
    "landing",
    { ...latest.data, featured: { tourIds: [] } },
    latest.revision,
    "publish",
  );
  assert.throws(
    () =>
      landingSchema.parse({
        ...latest.data,
        sectionOrder: Array(11).fill("hero"),
      }),
    /một lần/,
  );
});

test("publishing one home section keeps other saved section drafts private", async () => {
  const { saveBatch } = await import("../src/server/cms/store");
  const home = list("landing")[0];
  const before = landingSchema.parse(published("landing", [defaultLanding])[0]);
  const draft = landingSchema.parse({
    ...home.data,
    story: {
      ...(home.data.story as object),
      titleA: "Unrelated private story draft",
    },
  });
  save("landing", draft, home.revision, "save");
  const latest = list("landing")[0];
  const edited = landingSchema.parse({
    ...latest.data,
    planning: {
      ...(latest.data.planning as object),
      titleA: "Only publish FAQ heading",
    },
  });
  saveBatch([
    {
      collection: "landing",
      data: edited,
      revision: latest.revision,
      action: "publish",
      paths: [["planning"]],
    },
  ]);
  const result = landingSchema.parse(published("landing", [defaultLanding])[0]);
  assert.equal(result.planning.titleA, "Only publish FAQ heading");
  assert.equal(result.story.titleA, before.story.titleA);
  assert.equal(
    (list("landing")[0].data.story as Record<string, unknown>).titleA,
    "Unrelated private story draft",
  );
  assert.equal(list("landing")[0].state, "draft");
  assert.throws(
    () =>
      saveBatch([
        {
          collection: "landing",
          data: edited,
          revision: list("landing")[0].revision,
          action: "publish",
          paths: [["__proto__", "polluted"]],
        },
      ]),
    /không hợp lệ/,
  );
});

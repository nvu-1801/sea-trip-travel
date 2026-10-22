import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import { activeSlide, assertNoPlaybackToggle } from "./lib/hero-contract.mjs";
const folder = mkdtempSync(path.join(tmpdir(), "seatrip-browser-")),
  port = Number(process.env.CMS_VERIFY_PORT ?? 3193),
  base = `http://127.0.0.1:${port}`;
const password = randomBytes(18).toString("hex");
const env = {
  ...process.env,
  CMS_ENABLED: "1",
  CMS_DB_PATH: path.join(folder, "cms.sqlite"),
  CMS_UPLOAD_DIR: path.join(folder, "uploads"),
  ADMIN_PASSWORD: password,
  ADMIN_USERNAME: "qa-owner",
  ADMIN_COOKIE_SECURE: "false",
  LEAD_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  NEXT_PUBLIC_SITE_URL: base,
  SITE_URL: base,
  MAIL_TRANSPORT: "smtp",
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: "1",
  LEAD_RATE_LIMIT_STORE: "memory",
  NODE_ENV: "production",
};
const setup = spawnSync(process.execPath, ["scripts/admin.mjs", "bootstrap"], {
  env,
  encoding: "utf8",
});
assert.equal(setup.status, 0, setup.stderr);
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  { env, stdio: ["ignore", "pipe", "pipe"] },
);
let browser;
let checks = 0;
const check = (name, ok) => {
  assert.ok(ok, name);
  checks++;
  console.log(`PASS ${name}`);
};
let stderr = "";
server.stderr.on("data", (chunk) => {
  stderr += chunk;
});
try {
  let ready = false;
  for (let i = 0; i < 200; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.ok(ready, stderr);
  browser = await chromium.launch(
    process.env.CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
      : { channel: "chrome" },
  );
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const unauth = await context.request.get(`${base}/api/admin/content/tours`);
  check("unauthorized content is denied", unauth.status() === 401);
  check(
    "private live version requires authentication",
    (await context.request.get(`${base}/api/admin/changes`)).status() === 401,
  );
  await page.goto(`${base}/admin`);
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("qa-owner");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Vào SEA TRIP Studio" }).click();
  await page.getByRole("navigation", { name: "Quản trị" })
    .getByRole("button", { name: /Tour du lịch/ }).click();
  await page
    .getByRole("heading", { name: "Tour du lịch", exact: true })
    .waitFor();
  await page.getByRole("button", { name: /Chỉnh sửa/ }).first().waitFor();
  check("admin login works with no default password", true);
  const auth = await (
    await context.request.get(`${base}/api/admin/auth`)
  ).json();
  const headers = { origin: base, "x-csrf-token": auth.csrf };
  const badOrigin = await context.request.post(
    `${base}/api/admin/content/settings`,
    {
      headers: { origin: "https://evil.test", "x-csrf-token": auth.csrf },
      data: {},
    },
  );
  check("cross-origin mutations rejected", badOrigin.status() === 403);
  const noCsrf = await context.request.post(
    `${base}/api/admin/content/settings`,
    { headers: { origin: base }, data: {} },
  );
  check("missing CSRF rejected", noCsrf.status() === 403);
  const api = async (kind) => {
    const response = await context.request.get(
      `${base}/api/admin/content/${kind}`,
    );
    assert.equal(response.status(), 200);
    return response.json();
  };
  const mutate = async (kind, row, action, data = row.data) => {
    const response = await context.request.post(
      `${base}/api/admin/content/${kind}`,
      { headers, data: { data, revision: row.revision, action } },
    );
    return response;
  };
  // Separate already-open browsers must update without page.goto()/reload().
  const visitor = await browser.newContext();
  const livePage = await visitor.newPage();
  const observer = await context.newPage();
  const pollUntil = async (read, message) => {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (await read()) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(message);
  };
  await livePage.goto(base);
  await observer.goto(`${base}/admin`);
  await observer.getByRole("navigation", { name: "Quản trị" })
    .getByRole("button", { name: /Tour du lịch/ }).click();
  await observer.getByRole("button", { name: /Chỉnh sửa/ }).first().waitFor();
  check(
    "live pages start visible",
    (await livePage.evaluate(() => !document.hidden)) &&
      (await observer.evaluate(() => !document.hidden)),
  );
  const liveSettings = (await api("settings"))[0];
  const liveConfig = {
    ...liveSettings.data,
    footerLinks: [{ label: "Footer đồng bộ trực tiếp", href: "/lien-he" }],
  };
  const publicVersion = await (
    await visitor.request.get(`${base}/api/content-version`)
  ).json();
  await livePage
    .locator('input[name="fullName"]')
    .fill("Tên đang điền được giữ lại");
  assert.equal(
    (await mutate("settings", liveSettings, "save", liveConfig)).status(),
    200,
  );
  check(
    "draft saves do not disclose a public change",
    (await (await visitor.request.get(`${base}/api/content-version`)).json())
      .version === publicVersion.version,
  );
  assert.equal(
    (
      await mutate(
        "settings",
        { revision: liveSettings.revision + 1 },
        "publish",
        liveConfig,
      )
    ).status(),
    200,
  );
  await livePage
    .getByRole("link", { name: "Footer đồng bộ trực tiếp", exact: true })
    .waitFor({ timeout: 20000 });
  check("already-open landing updates footer without reload", true);
  check(
    "live refresh preserves visitor form input",
    (await livePage.locator('input[name="fullName"]').inputValue()) ===
      "Tên đang điền được giữ lại",
  );
  const sourceLive = (await api("tours")).find(
    (row) => row.state !== "deleted",
  );
  const liveTour = {
    ...sourceLive.data,
    id: "tour_live_sync",
    slug: "live-sync-tour",
    title: "Tour đồng bộ trực tiếp",
  };
  assert.equal(
    (await mutate("tours", { revision: 0 }, "save", liveTour)).status(),
    200,
  );
  await observer
    .getByText(liveTour.title, { exact: true })
    .waitFor({ timeout: 20000 });
  check("second admin sees newly created draft without reload", true);
  await observer.getByRole("button", { name: /Chỉnh sửa/ }).first().click();
  await observer
    .getByLabel(/^Tiêu đề/)
    .first()
    .fill("Nội dung chưa lưu phải được giữ");
  assert.equal(
    (
      await mutate("tours", { revision: 1 }, "save", {
        ...liveTour,
        title: "Tour được cập nhật ở phiên khác",
      })
    ).status(),
    200,
  );
  await observer
    .getByRole("button", { name: "Tải cập nhật", exact: true })
    .waitFor({ timeout: 20000 });
  check(
    "remote updates preserve a dirty editor",
    (await observer
      .getByLabel(/^Tiêu đề/)
      .first()
      .inputValue()) === "Nội dung chưa lưu phải được giữ",
  );
  await observer
    .getByRole("button", { name: "Tải cập nhật", exact: true })
    .click();
  await observer.getByRole("alertdialog")
    .getByRole("button", { name: "Tải cập nhật", exact: true }).click();
  await observer
    .getByText("Tour được cập nhật ở phiên khác", { exact: true })
    .waitFor();
  check("explicit update loads the new snapshot after confirmation", true);
  await observer.getByLabel("Trạng thái nội dung").click();
  await observer.getByRole("option", { name: /Thùng rác/ }).click();
  assert.equal(
    (await mutate("tours", { revision: 2 }, "delete", liveTour)).status(),
    200,
  );
  await observer
    .getByText(liveTour.title, { exact: true })
    .waitFor({ timeout: 20000 });
  check("trash synchronizes across admins while retaining its filter", true);
  assert.equal(
    (await mutate("tours", { revision: 3 }, "restore", liveTour)).status(),
    200,
  );
  await pollUntil(
    async () =>
      (await observer.getByText(liveTour.title, { exact: true }).count()) === 0,
    "Restored tour remained in trash",
  );
  check("restore removes the item from another open trash view", true);

  assert.equal(
    (await mutate("tours", { revision: 4 }, "publish", liveTour)).status(),
    200,
  );
  const detailPage = await visitor.newPage();
  await detailPage.goto(`${base}/tour/${liveTour.slug}`);
  await detailPage
    .getByRole("heading", { name: liveTour.title, exact: true })
    .waitFor();
  assert.equal(
    (await mutate("tours", { revision: 5 }, "delete", liveTour)).status(),
    200,
  );
  await pollUntil(
    async () =>
      (await detailPage
        .getByRole("heading", { name: liveTour.title, exact: true })
        .count()) === 0,
    "Deleted tour stayed visible in an already-open detail page",
  );
  check("already-open tour detail removes deleted public content", true);
  await detailPage.close();

  await observer
    .getByRole("button", { name: "Yêu cầu tư vấn", exact: false })
    .click();
  await observer.getByLabel("Tìm khách hàng").waitFor();
  const liveLeadResponse = await context.request.post(`${base}/api/leads`, {
    data: {
      fullName: "Khách đồng bộ trực tiếp",
      phone: "0901234568",
      consent: true,
      locale: "vi",
      submissionId: randomBytes(16).toString("hex"),
    },
  });
  assert.equal(liveLeadResponse.status(), 200);
  await observer
    .getByRole("heading", { name: "Khách đồng bộ trực tiếp", exact: true })
    .waitFor({ timeout: 20000 });
  check("new lead appears in an already-open admin inbox", true);
  const liveLead = (
    await (await context.request.get(`${base}/api/admin/leads`)).json()
  ).find((row) => row.data.phone === "0901234568");
  const liveNote = observer
    .locator(".adm-lead-card")
    .filter({
      has: observer.getByRole("heading", {
        name: "Khách đồng bộ trực tiếp",
        exact: true,
      }),
    })
    .locator("textarea");
  await liveNote.fill("Ghi chú chưa lưu của chủ quản trị");
  assert.equal(
    (
      await context.request.patch(`${base}/api/admin/leads`, {
        headers,
        data: {
          id: liveLead.id,
          status: "qualified",
          note: "Cập nhật từ phiên khác",
        },
      })
    ).status(),
    200,
  );
  await observer
    .getByRole("button", { name: "Tải cập nhật", exact: true })
    .waitFor({ timeout: 20000 });
  check(
    "live inbox does not overwrite unsaved customer notes",
    (await liveNote.inputValue()) === "Ghi chú chưa lưu của chủ quản trị",
  );

  // Deterministically exercise visibility and offline events without depending
  // on whether the headless window manager marks background tabs as hidden.
  await livePage.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  let hiddenPolls = 0;
  const recordPoll = (request) => {
    if (request.url().endsWith("/api/content-version")) hiddenPolls++;
  };
  livePage.on("request", recordPoll);
  await new Promise((resolve) => setTimeout(resolve, 6000));
  check("hidden landing stops periodic version requests", hiddenPolls === 0);
  livePage.off("request", recordPoll);
  const visibilitySettings = (await api("settings"))[0];
  const hiddenConfig = {
    ...visibilitySettings.data,
    footerLinks: [{ label: "Cập nhật trong lúc tab ẩn", href: "/lien-he" }],
  };
  assert.equal(
    (
      await mutate("settings", visibilitySettings, "publish", hiddenConfig)
    ).status(),
    200,
  );
  await livePage.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await livePage
    .getByRole("link", { name: "Cập nhật trong lúc tab ẩn", exact: true })
    .waitFor({ timeout: 20000 });
  check("returning to a visible tab catches up immediately", true);
  await visitor.setOffline(true);
  const offlineSettings = (await api("settings"))[0];
  assert.equal(
    (await mutate("settings", offlineSettings, "publish", liveConfig)).status(),
    200,
  );
  await visitor.setOffline(false);
  await livePage.evaluate(() => window.dispatchEvent(new Event("online")));
  await livePage
    .getByRole("link", { name: "Footer đồng bộ trực tiếp", exact: true })
    .waitFor({ timeout: 20000 });
  check("reconnection catches up without a full page reload", true);
  const latestSettings = (await api("settings"))[0];
  assert.equal(
    (
      await mutate("settings", latestSettings, "publish", liveSettings.data)
    ).status(),
    200,
  );
  await visitor.close();
  await observer.close();
  const settings = (await api("settings"))[0];
  const config = {
    ...settings.data,
    name: "SEA TRIP QA",
    contact: {
      ...settings.data.contact,
      hotline: "0909 888 777",
      hotlineHref: "tel:+84909888777",
    },
    footerLinks: [{ label: "Liên kết CMS kiểm thử", href: "/lien-he" }],
  };
  assert.equal(
    (await mutate("settings", settings, "publish", config)).status(),
    200,
  );
  await page.goto(base);
  check(
    "footer edits visible without rebuild",
    (await page
      .getByRole("link", { name: "Liên kết CMS kiểm thử" })
      .count()) === 1,
  );
  check(
    "contact updates across server and client UI",
    (await page.content()).includes("0909 888 777"),
  );
  check(
    "brand identity updates in header and footer",
    (await page.getByText("SEA TRIP QA", { exact: true }).count()) >= 2,
  );
  const tours = await api("tours"),
    source = tours.find((row) => row.data.duration.days === 1);
  const draft = {
    ...source.data,
    id: "tour_browser_new",
    slug: "browser-new-tour",
    title: "Hành trình CMS kiểm thử",
    _en: {
      title: "CMS English journey",
      summary: "An English journey created in Studio",
    },
    _enReviewed: false,
  };
  assert.equal(
    (await mutate("tours", { revision: 0 }, "save", draft)).status(),
    200,
  );
  check(
    "draft tour not public",
    (await context.request.get(`${base}/tour/browser-new-tour`)).status() ===
      404,
  );
  assert.equal(
    (await mutate("tours", { revision: 1 }, "publish", draft)).status(),
    200,
  );
  check(
    "new tour is available without rebuild",
    (await context.request.get(`${base}/tour/browser-new-tour`)).status() ===
      200,
  );
  check(
    "stale writes rejected",
    (await mutate("tours", { revision: 1 }, "publish", draft)).status() === 400,
  );
  check(
    "English editorial content updates without rebuild",
    (
      await (
        await context.request.get(`${base}/en/tour/browser-new-tour`)
      ).text()
    ).includes("CMS English journey"),
  );
  const category = (await api("categories"))[0];
  const newCategory = {
    ...category.data,
    id: "cat_browser_new",
    slug: "browser-category",
    path: "/danh-muc/browser-category",
    parentId: null,
    name: "Danh mục CMS kiểm thử",
  };
  assert.equal(
    (
      await mutate("categories", { revision: 0 }, "publish", newCategory)
    ).status(),
    200,
  );
  check(
    "new category route works without rebuild",
    (
      await context.request.get(`${base}/danh-muc/browser-category`)
    ).status() === 200,
  );
  assert.equal(
    (await mutate("tours", { revision: 2 }, "delete", draft)).status(),
    200,
  );
  check(
    "deleted tour not public",
    (await context.request.get(`${base}/tour/browser-new-tour`)).status() ===
      404,
  );
  check(
    "deleted tour absent from sitemap",
    !(await (await context.request.get(`${base}/sitemap.xml`)).text()).includes(
      "browser-new-tour",
    ),
  );
  const messages = (await api("messages")).find((row) => row.id === "vi");
  const copy = structuredClone(messages.data);
  copy.home.hero.badge = "Nội dung mới từ Studio";
  assert.equal(
    (await mutate("messages", messages, "publish", copy)).status(),
    200,
  );
  await page.goto(base);
  check(
    "home copy updates live",
    (await page
      .getByText("Nội dung mới từ Studio", { exact: true })
      .count()) === 1,
  );
  const sharp = (await import("sharp")).default;
  const image = await sharp({
    create: { width: 40, height: 30, channels: 3, background: "#009988" },
  })
    .png()
    .toBuffer();
  const upload = await context.request.post(`${base}/api/admin/media`, {
    headers: {
      ...headers,
      "content-type": "image/png",
      "x-image-alt": "QA image",
    },
    data: image,
  });
  assert.equal(upload.status(), 201, await upload.text());
  const asset = await upload.json();
  const library = await (
    await context.request.get(`${base}/api/admin/media`)
  ).json();
  const expectedPhotos = new Set(
    tours.flatMap((row) => row.data.images.map((photo) => photo.src)).filter(Boolean),
  );
  const originalPhotos = new Set(
    library.filter((item) => item.original && !item.id.startsWith("hero:"))
      .map((item) => item.src),
  );
  check(
    "all supplied tour photos retained in media library",
    expectedPhotos.size > 0 && originalPhotos.size === expectedPhotos.size &&
      [...expectedPhotos].every((src) => originalPhotos.has(src)),
  );
  const linked = {
    ...source.data,
    images: [{ src: asset.src, alt: "Ảnh CMS kiểm thử" }],
  };
  assert.equal(
    (await mutate("tours", source, "publish", linked)).status(),
    200,
  );
  check(
    "referenced image cannot be deleted",
    (
      await context.request.delete(`${base}/api/admin/media`, {
        headers,
        data: { id: asset.id },
      })
    ).status() === 409,
  );
  check(
    "uploaded image serves safely",
    (await context.request.get(`${base}${asset.src}`)).headers()[
      "content-type"
    ] === "image/webp",
  );
  const invalid = await context.request.post(`${base}/api/admin/media`, {
    headers: { ...headers, "content-type": "image/png" },
    data: Buffer.from('<svg onload="alert(1)"></svg>'),
  });
  check("disguised active content rejected", invalid.status() >= 400);
  const leadResponse = await context.request.post(`${base}/api/leads`, {
    data: {
      fullName: "Khách QA",
      phone: "0901234567",
      consent: true,
      locale: "vi",
      submissionId: randomBytes(16).toString("hex"),
    },
  });
  check(
    "lead accepted even when email unavailable",
    leadResponse.status() === 200,
  );
  const leads = await (
    await context.request.get(`${base}/api/admin/leads`)
  ).json();
  check(
    "lead stored before email failure",
    leads.some((lead) => lead.data.phone === "0901234567"),
  );
  const lead = leads.find((lead) => lead.data.phone === "0901234567");
  assert.equal(
    (
      await context.request.patch(`${base}/api/admin/leads`, {
        headers,
        data: {
          id: lead.id,
          status: "contacted",
          note: "Đã liên hệ khách kiểm thử",
        },
      })
    ).status(),
    200,
  );
  check(
    "sales status and encrypted notes can be updated",
    (await (await context.request.get(`${base}/api/admin/leads`)).json()).some(
      (item) =>
        item.id === lead.id &&
        item.status === "contacted" &&
        item.note === "Đã liên hệ khách kiểm thử",
    ),
  );
  await page.goto(`${base}/tim-tour?q=quy+nhon&days=1`);
  check(
    "accent-insensitive search finds real tours",
    (await page.locator(".stt-tour-card").count()) > 0,
  );
  await page.goto(base);
  await page.locator('[data-hero-mode="carousel"][data-motion-blocked="false"]').waitFor();
  await assertNoPlaybackToggle(page);
  check("hero has no pause/play toggle", true);
  const initialSlide = await activeSlide(page).getAttribute("aria-label");
  await page.waitForFunction((initial) =>
    document.querySelector('.stt-cinema-dots button[aria-current="true"]')
      ?.getAttribute("aria-label") !== initial, initialSlide);
  check("carousel autoplays with real browser timers", true);
  await page.getByRole("button", { name: /^Ảnh 1:/ }).click();
  mkdirSync("verify-screenshots", { recursive: true });
  await page.screenshot({ path: "verify-screenshots/studio-home-desktop.png" });
  await page.locator("#tim-hanh-trinh").scrollIntoViewIfNeeded();
  await page.screenshot({ path: "verify-screenshots/studio-discovery.png" });
  await page.goto(`${base}/admin`);
  await page.getByRole("navigation", { name: "Quản trị" })
    .getByRole("button", { name: /Tour du lịch/ }).click();
  await page.getByRole("button", { name: /Chỉnh sửa/ }).first().waitFor();
  await page.screenshot({ path: "verify-screenshots/studio-desktop.png" });
  await page.getByRole("button", { name: /Chỉnh sửa/ }).first().click();
  await page
    .getByLabel(/^Tiêu đề/)
    .first()
    .fill("Chỉnh sửa bằng form kiểm thử");
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(250);
    const layout = await page.evaluate(() => {
      const doc = document.documentElement;
      const widest = [];
      for (const element of document.querySelectorAll("body *")) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.right <= innerWidth + 1) continue;
        widest.push({
          el: `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 48)}`,
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
      widest.sort((a, b) => b.right - a.right);
      return {
        scrollWidth: doc.scrollWidth,
        innerWidth,
        widest: widest.slice(0, 6),
      };
    });
    check(
      `tour form ${width}px has no horizontal overflow`,
      layout.scrollWidth <= layout.innerWidth + 1,
      JSON.stringify(layout),
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Đã lưu thay đổi" })
    .waitFor();
  check("structured editor saves draft via browser", true);
  await page
    .getByRole("navigation", { name: "Quản trị" })
    .getByRole("button", { name: /Trang chủ/ })
    .click();
  await page
    .getByRole("heading", {
      name: "Các khối trang chủ theo đúng thứ tự hiển thị",
    })
    .waitFor();
  await page.getByRole("button", { name: /Sửa tour nổi bật/ }).click();
  const featuredHomeDialog = page.getByRole("dialog", {
    name: "Tour nổi bật",
  });
  await featuredHomeDialog.waitFor();
  check(
    "home featured editor offers a tour picker",
    (await featuredHomeDialog
      .getByText("Chọn tour hiển thị trong khối", { exact: false })
      .count()) > 0,
  );
  check(
    "home featured editor points to the tour form for photos and prices",
    (await featuredHomeDialog
      .getByText("Sửa tour", { exact: false })
      .count()) > 0,
  );
  await featuredHomeDialog
    .getByRole("button", { name: "Đóng (Esc)", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Quản trị" })
    .getByRole("button", { name: /Điểm đến/ })
    .click();
  await page
    .getByRole("heading", { name: "Điểm đến", exact: true })
    .waitFor();
  check(
    "destination tab explains where a destination appears",
    (await page
      .getByText("Điểm đến là địa danh", { exact: false })
      .count()) > 0,
  );
  // Rows load asynchronously after the heading paints; wait for the first
  // destination card so the status count reads finished content.
  await page.getByRole("button", { name: /Xem trước thẻ/ }).first().waitFor();
  check(
    "destination list exposes the home status",
    (await page
      .getByText("Đang hiện ở Khám phá trang chủ", { exact: false })
      .count()) >= 3,
  );
  await page.getByRole("button", { name: /Xem trước thẻ/ }).first().click();
  const destinationPreview = page.getByRole("dialog", {
    name: "Xem trước thẻ Khám phá",
  });
  await destinationPreview.waitFor();
  check("destination card preview opens", await destinationPreview.isVisible());
  check(
    "destination preview states publication clearly",
    (await destinationPreview
      .getByText(/Đang xuất bản trên website|Bản nháp — chưa lên website/)
      .count()) > 0,
  );
  check(
    "destination preview offers a direct edit action",
    (await destinationPreview
      .getByRole("button", { name: "Sửa điểm đến", exact: true })
      .count()) > 0,
  );
  const previewFont = await destinationPreview
    .locator(".adm-home-preview-copy h3")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  check(
    "destination preview title uses a Vietnamese font",
    /Be Vietnam Pro|Fraunces/.test(previewFont),
    previewFont,
  );
  await destinationPreview
    .getByRole("button", { name: "Đóng", exact: true })
    .click();
  await page.getByRole("button", { name: /Chỉnh sửa/ }).first().click();
  await page
    .getByRole("heading", { name: "Thông tin địa danh", exact: true })
    .waitFor();
  check(
    "destination form groups the fields and names the region",
    (await page.getByText("Vùng miền & thứ tự", { exact: true }).count()) >
      0 &&
      (await page.getByText("Quy Nhơn – Phú Yên", { exact: false }).count()) >
        0,
  );
  check(
    "destination image has replace and remove actions",
    (await page.getByRole("button", { name: "Gỡ ảnh", exact: true }).count()) >
      0,
  );
  check(
    "destination form shows the live home card preview",
    (await page.getByText("Thẻ sẽ xuất hiện", { exact: false }).count()) > 0,
  );
  const destinationStatus = page.locator(".adm-home-status");
  check(
    "destination form separates website publication from home visibility",
    (await destinationStatus.getByText("Website", { exact: true }).count()) >
      0 &&
      (await destinationStatus.getByText("Khám phá", { exact: true }).count()) >
        0,
  );
  const actionsBeforeForm = await page.evaluate(() => {
    const actions = document.querySelector(".adm-edit-actions");
    const form = document.querySelector(".adm-tour-form");
    if (!actions || !form) return false;
    const position = getComputedStyle(actions).position;
    return (
      position === "sticky" &&
      Boolean(
        actions.compareDocumentPosition(form) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      )
    );
  });
  check(
    "editor actions sit above the form and stay sticky",
    actionsBeforeForm,
  );
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(250);
    check(
      `destination form ${width}px has no horizontal overflow`,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("navigation", { name: "Quản trị" })
    .getByRole("button", { name: /Trang chủ/ })
    .click();
  await page
    .getByRole("heading", { name: "Trang chủ", exact: true })
    .waitFor();
  const editSectionButtons = page.getByRole("button", { name: /^Sửa / });
  await editSectionButtons.first().waitFor();
  const sectionCount = await editSectionButtons.count();
  check("home lists every landing section", sectionCount >= 8);
  for (let index = 0; index < sectionCount; index += 1) {
    await editSectionButtons.nth(index).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.locator('button[aria-label="Đóng (Esc)"]').click();
    await dialog.waitFor({ state: "hidden" });
  }
  check("every home section editor opens without crashing", true);
  await page
    .getByRole("navigation", { name: "Quản trị" })
    .getByRole("button", { name: /Cẩm nang/ })
    .click();
  await page.getByRole("button", { name: /Chỉnh sửa/ }).first().click();
  await page
    .locator("summary")
    .filter({ hasText: /^Nội dung$/ })
    .click();
  await page.getByLabel("Loại khối nội dung").first().selectOption("heading");
  await page
    .getByLabel("Nội dung chữ", { exact: true })
    .first()
    .fill("Tiêu đề từ trình biên tập khối");
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Đã lưu thay đổi" })
    .waitFor();
  check("article block editor supports headings without JSON", true);
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${base}/admin`);
    await page.getByRole("navigation", { name: "Quản trị" })
      .getByRole("button", { name: /Tour du lịch/ }).click();
    await page.getByRole("button", { name: /Chỉnh sửa/ }).first().waitFor();
    check(
      `admin ${width}px no horizontal overflow`,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.screenshot({
      path: `verify-screenshots/studio-admin-${width}.png`,
    });
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.screenshot({ path: "verify-screenshots/studio-mobile.png" });

  // Header quick search: shortcut, accent-free query, opens the matching form.
  await page.getByRole("button", { name: "Tìm kiếm nhanh trong Studio" }).click();
  const quick = page.getByRole("dialog", {
    name: "Tìm kiếm nhanh trong Studio",
  });
  await quick.waitFor();
  check("header quick search opens", await quick.isVisible());
  check(
    "quick search fits a 390px viewport",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await quick.getByRole("combobox").fill("sapa");
  await quick.getByRole("option", { name: /Sa Pa – Fansipan/ }).waitFor();
  await page.keyboard.press("Enter");
  await page.getByLabel(/^Tiêu đề/).first().waitFor();
  check(
    "quick search opens the matching tour form without diacritics",
    (await page.getByLabel(/^Tiêu đề/).first().inputValue()).includes("Sa Pa"),
  );

  await page.keyboard.press("Control+k");
  const quickAgain = page.getByRole("dialog", {
    name: "Tìm kiếm nhanh trong Studio",
  });
  await quickAgain.getByRole("combobox").fill("thu vien anh");
  await quickAgain.getByRole("option", { name: /Thư viện ảnh/ }).click();
  await page
    .getByRole("heading", { name: "Thư viện ảnh", exact: true })
    .waitFor();
  check("quick search switches admin tabs", true);
  await page.keyboard.press("Control+k");
  await quickAgain.waitFor();
  await page.keyboard.press("Escape");
  await quickAgain.waitFor({ state: "hidden" });
  check("Escape closes quick search", true);

  await page.getByRole("button", { name: "Bảo mật", exact: false }).click();
  await page.getByLabel("Mật khẩu hiện tại").fill(password);
  await page.getByLabel("Mật khẩu mới").fill(password + "-new");
  await page.getByRole("button", { name: "Cập nhật mật khẩu" }).click();
  await page.getByRole("heading", { name: "Chào mừng bạn trở lại." }).waitFor();
  check(
    "password change revokes existing sessions",
    (await context.request.get(`${base}/api/admin/auth`)).status() === 401,
  );
  check("no browser JavaScript errors", errors.length === 0);
  console.log(
    `CMS verification: ${checks}/${checks} checks passed. Temporary DB: ${folder}`,
  );
} finally {
  await browser?.close();
  server.kill();
}

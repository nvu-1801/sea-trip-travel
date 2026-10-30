import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
const folder = mkdtempSync(path.join(tmpdir(), "seatrip-browser-")),
  port = Number(process.env.TOUR_EDITOR_VERIFY_PORT ?? 3196),
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
  await page.goto(`${base}/admin`);
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("qa-owner");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  const signIn = page.getByRole("button", { name: "Vào SEA TRIP Studio" });
  await signIn.click();
  const adminNav = page.getByRole("navigation", { name: "Quản trị" });
  try {
    await adminNav.waitFor({ timeout: 12000 });
  } catch (error) {
    if (!(await signIn.isVisible().catch(() => false))) throw error;
    await signIn.click();
    await adminNav.waitFor({ timeout: 20000 });
  }
  const tours = await (
    await context.request.get(`${base}/api/admin/content/tours`)
  ).json();
  const editedTour =
    tours.find((row) => row.data.slug === "ha-noi-ha-long-4-ngay-3-dem") ??
    tours[0];
  const samples = [
    tours.find((r) => r.data.duration.days === 1),
    tours.find((r) => r.data.duration.days > 1),
    tours.find((r) => r.data.duration.days > 3),
  ].filter(Boolean);
  const visitor = await context.newPage();
  for (const tour of samples) {
    for (const width of [1440, 390]) {
      await visitor.setViewportSize({ width, height: 1000 });
      await visitor.goto(`${base}/tour/${tour.data.slug}`);
      const stage = visitor.locator("#tour-gallery-panel > div").first();
      await stage.waitFor();
      const box = await stage.boundingBox();
      const expectedRatio = width >= 640 ? 16 / 10 : 4 / 3;
      const measuredRatio = box ? box.width / box.height : 0;
      check(
        `public ${tour.data.slug} ${width}px keeps a photo card at most 500px with the editorial ratio`,
        Boolean(box) &&
          box.width <= 500.5 &&
          Math.abs(measuredRatio - expectedRatio) < 0.04,
      );
    }
  }
  await page.goto(`${base}/admin/tours?edit=${editedTour.data.slug}`);
  const title = page.locator("#tour-field-title");
  await title.waitFor();
  const originalTitle = await title.inputValue();
  check(
    "editor masthead shows the opened tour name",
    (await page.locator(".adm-masthead h1").innerText()).trim() ===
      originalTitle,
  );
  check(
    "editor masthead names the section and edit mode",
    (await page.locator(".adm-masthead-label").innerText()).includes(
      "Tour du lịch / Sửa tour",
    ),
  );
  check(
    "editor topbar also shows the opened tour name",
    (await page.locator(".adm-topbar-section").innerText()).trim() ===
      originalTitle,
  );
  const draftTitle = "Tour đang sửa xem trước chưa lưu";
  await title.fill(draftTitle);
  await page.waitForFunction(
    (expected) =>
      document.querySelector(".adm-masthead h1")?.textContent?.trim() ===
      expected,
    draftTitle,
  );
  check(
    "editor masthead follows a title being typed",
    (await page.locator(".adm-masthead h1").innerText()).trim() === draftTitle,
  );
  await page
    .getByRole("button", { name: "Xem trước đang sửa", exact: true })
    .click();
  const preview = page.getByRole("article", {
    name: "Bản xem trước nội dung đang sửa",
  });
  await preview
    .getByRole("heading", { name: draftTitle, exact: true })
    .waitFor();
  const stored = await (
    await context.request.get(`${base}/api/admin/content/tours`)
  ).json();
  check(
    "preview uses unsaved content without writing a revision",
    stored.find((r) => r.id === editedTour.id).revision ===
      editedTour.revision &&
      stored.find((r) => r.id === editedTour.id).data.title === originalTitle,
  );
  await page.locator("#tour-section-media").evaluate((el) => (el.open = true));
  const frame = page.locator(".adm-tour-image-row .adm-dropzone").first();
  if (await frame.count()) {
    await frame.scrollIntoViewIfNeeded();
    let box = await frame.boundingBox();
    check(
      "admin tour image stage is square and at most 500px",
      box && box.width <= 500.5 && Math.abs(box.width - box.height) < 2,
    );
    const sharp = (await import("sharp")).default;
    const image = await sharp({
      create: { width: 120, height: 240, channels: 3, background: "#e0005a" },
    })
      .png()
      .toBuffer();
    let releaseUpload;
    const uploadGate = new Promise((resolve) => {
      releaseUpload = resolve;
    });
    await page.route("**/api/admin/media", async (route) => {
      if (route.request().method() === "POST") await uploadGate;
      await route.continue();
    });
    await page
      .locator(".adm-tour-image-row input[type=file]")
      .first()
      .setInputFiles({
        name: "preview.png",
        mimeType: "image/png",
        buffer: image,
      });
    await frame.locator('img[src^="blob:"]').waitFor();
    check("selected file previews immediately while upload is pending", true);
    check(
      "save and cancel wait for pending uploads",
      (await page
        .getByRole("button", { name: "Lưu bản nháp", exact: true })
        .isDisabled()) &&
        (await page
          .getByRole("button", { name: "Hủy các thay đổi", exact: true })
          .isDisabled()),
    );
    const duringUpload = "Nội dung nhập khi ảnh đang tải phải được giữ";
    await title.fill(duringUpload);
    releaseUpload();
    await frame.locator('img[src^="/api/media/"]').waitFor();
    await page
      .getByRole("button", { name: "Xem trước đang sửa", exact: true })
      .click();
    await preview.locator('.adm-draft-photo img[src^="/api/media/"]').waitFor();
    check("uploaded photo is reflected in the unsaved content preview", true);
    check(
      "upload completion preserves edits made while uploading",
      (await title.inputValue()) === duringUpload,
    );
  }
  for (const width of [1440, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      window.scrollTo({
        top: document.body.scrollHeight / 2,
        behavior: "instant",
      });
    });
    // Resizing can reflow the wrapped toolbar. Wait for ResizeObserver and
    // browser layout to settle instead of assuming a fixed 300ms is enough.
    await page
      .waitForFunction(
        () => {
          const bar = document
            .querySelector(".adm-edit-actions")
            .getBoundingClientRect();
          const toolbar = document
            .querySelector(".adm-topbar")
            .getBoundingClientRect();
          return (
            bar.top >= toolbar.bottom &&
            bar.bottom <= innerHeight &&
            bar.left >= 0 &&
            bar.right <= innerWidth &&
            document.documentElement.scrollWidth <= innerWidth + 1
          );
        },
        null,
        { timeout: 10000 },
      )
      .catch(async (error) => {
        console.error(
          "Unsettled editor layout",
          await page.evaluate(() => ({
            bar: document
              .querySelector(".adm-edit-actions")
              .getBoundingClientRect()
              .toJSON(),
            toolbar: document
              .querySelector(".adm-topbar")
              .getBoundingClientRect()
              .toJSON(),
            scrollWidth: document.documentElement.scrollWidth,
            width: innerWidth,
          })),
        );
        throw error;
      });
    const geometry = await page.evaluate(() => {
      const bar = document.querySelector(".adm-edit-actions");
      const toolbar = document.querySelector(".adm-topbar");
      const a = bar.getBoundingClientRect(),
        t = toolbar.getBoundingClientRect();
      return {
        bar: a.toJSON(),
        toolbar: t.toJSON(),
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        position: getComputedStyle(bar).position,
      };
    });
    console.log(`Editor geometry ${width}px: ${JSON.stringify(geometry)}`);
    check(
      `save/cancel remain visible below toolbar after scroll at ${width}px`,
      geometry.bar.top >= geometry.toolbar.bottom &&
        geometry.bar.bottom <= geometry.height &&
        geometry.bar.left >= 0 &&
        geometry.bar.right <= geometry.width &&
        geometry.position === "sticky" &&
        geometry.scrollWidth <= geometry.width + 1,
    );
  }
  mkdirSync("verify-screenshots", { recursive: true });
  await page.screenshot({ path: "verify-screenshots/tour-editor-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Hủy các thay đổi", exact: true })
    .click();
  const dialog = page.getByRole("alertdialog");
  await dialog
    .getByRole("button", { name: "Hủy các thay đổi", exact: true })
    .click();
  await page.waitForFunction(
    (expected) =>
      document.querySelector("#tour-field-title")?.value === expected,
    originalTitle,
  );
  check(
    "cancel restores saved content and keeps editor open",
    (await title.inputValue()) === originalTitle,
  );
  check(
    "editor masthead follows the restored title",
    (await page.locator(".adm-masthead h1").innerText()).trim() ===
      originalTitle,
  );
  await title.fill("Tour thử lưu nháp từ thanh bám cuộn");
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: /Đã lưu .+/ })
    .waitFor();
  check(
    "saving keeps the editor open and names the updated tour",
    (await page.locator(".adm-masthead h1").innerText()).trim() ===
      "Tour thử lưu nháp từ thanh bám cuộn",
  );
  const saved = await (
    await context.request.get(`${base}/api/admin/content/tours`)
  ).json();
  check(
    "sticky save persists only a draft and preserves public snapshot",
    saved.find((r) => r.id === editedTour.id).data.title ===
      "Tour thử lưu nháp từ thanh bám cuộn",
  );
  await page.getByRole("button", { name: /Danh sách/ }).click();
  await page
    .getByRole("button", { name: /Chỉnh sửa/ })
    .first()
    .waitFor();
  await page.locator(".adm-tour-card").first().waitFor();
  check(
    "returning to the list restores the masthead to Tour du lịch",
    (await page.locator(".adm-masthead h1").innerText()).trim() ===
      "Tour du lịch",
  );
  await visitor.goto(`${base}/tour/${editedTour.data.slug}`);
  await visitor
    .getByRole("heading", { level: 1, name: originalTitle, exact: true })
    .waitFor();
  check("public tour retains the published title after draft save", true);
  await page.goto(`${base}/admin/articles`);
  await page
    .getByRole("button", { name: /Chỉnh sửa/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Xem trước đang sửa", exact: true })
    .click();
  await page
    .getByRole("article", { name: "Bản xem trước nội dung đang sửa" })
    .waitFor();
  check("article editor also provides local content preview", true);
  check("no browser JavaScript errors", errors.length === 0);
  console.log(`Tour editor verification: ${checks}/${checks} checks passed.`);
} finally {
  await browser?.close();
  server.kill();
}

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";

const folder = mkdtempSync(path.join(tmpdir(), "seatrip-hero-"));
const base = "http://127.0.0.1:3194";
const password = randomBytes(18).toString("hex");
const env = {
  ...process.env,
  CMS_ENABLED: "1",
  CMS_DB_PATH: path.join(folder, "hero.sqlite"),
  CMS_UPLOAD_DIR: path.join(folder, "uploads"),
  LEAD_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  SITE_URL: base,
  NEXT_PUBLIC_SITE_URL: base,
  ADMIN_COOKIE_SECURE: "false",
  ADMIN_USERNAME: "hero-owner",
  ADMIN_PASSWORD: password,
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
    "3194",
  ],
  { env, stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "",
  browser,
  checks = 0;
server.stderr.on("data", (chunk) => {
  logs += chunk;
});
const check = (name, condition) => {
  assert.ok(condition, name);
  checks++;
  console.log(`PASS ${name}`);
};
try {
  let ready = false;
  for (let attempt = 0; attempt < 200; attempt++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, logs);
  browser = await chromium.launch(
    process.env.CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
      : { channel: "chrome" },
  );
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const admin = await context.newPage();
  const errors = [];
  context.on("page", (page) =>
    page.on("pageerror", (error) => errors.push(error.message)),
  );
  admin.on("pageerror", (error) => errors.push(error.message));
  await admin.goto(`${base}/admin`);
  await admin.getByLabel("Tên đăng nhập", { exact: true }).fill("hero-owner");
  await admin.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await admin.getByRole("button", { name: "Vào SEA TRIP Studio" }).click();
  await admin
    .getByRole("navigation", { name: "Quản trị" })
    .getByRole("button", { name: /Trang chủ/ })
    .click();
  await admin.getByRole("button", { name: /Sửa ảnh đầu trang/ }).click();
  await admin.getByLabel("Carousel ảnh lớn", { exact: false }).waitFor();
  const auth = await (
    await context.request.get(`${base}/api/admin/auth`)
  ).json();
  const headers = { origin: base, "x-csrf-token": auth.csrf };
  const current = async () =>
    (
      await (await context.request.get(`${base}/api/admin/content/hero`)).json()
    )[0];
  const publish = async (data) => {
    const row = await current();
    const response = await context.request.post(
      `${base}/api/admin/content/hero`,
      { headers, data: { data, revision: row.revision, action: "publish" } },
    );
    assert.equal(response.status(), 200, await response.text());
  };
  const original = (await current()).data;
  mkdirSync("verify-screenshots", { recursive: true });
  await admin.screenshot({ path: "verify-screenshots/hero-admin-desktop.png" });
  await admin
    .getByRole("button", { name: "Đưa slide 1 xuống", exact: true })
    .click();
  const firstSlideImage = admin.getByRole("group", {
    name: "Ảnh slide 1",
    exact: true,
  });
  await firstSlideImage
    .getByLabel("Ảnh từ thư viện", { exact: true })
    .click();
  await firstSlideImage.getByLabel("Tìm trong Ảnh từ thư viện")
    .fill("/images/hero/blue-bay.webp");
  await firstSlideImage.getByRole("option", { name: /\/images\/hero\/blue-bay\.webp/ })
    .click();
  await firstSlideImage.getByLabel(/Vị trí ngang/).focus();
  await firstSlideImage.getByLabel(/Vị trí ngang/).press("End");
  const page = await context.newPage();
  await page.goto(base);
  await page.locator('[data-hero-mode="carousel"]').waitFor();
  check("carousel is the default hero", true);
  const photos = page.locator(".stt-cinema-image img");
  check("all five supplied photos are present", (await photos.count()) === 5);
  check("slide 2 and 5 use the replacement photos", original.slides[1].image.src === "/images/hero/ky-co-user.png" && original.slides[4].image.src === "/images/hero/ghenh-da-dia-user.png");
  check("header consultation button and decorative tagline are removed", await page.locator("header").getByRole("link", { name: "Nhận tư vấn", exact: true }).count() === 0 && await page.getByText("Chọn một nhịp đi khác", { exact: true }).count() === 0);
  check("hero covers the viewport behind a transparent header", await page.evaluate(() => {
    const stage = document.querySelector(".stt-cinema-stage").getBoundingClientRect();
    const header = document.querySelector(".stt-site-header");
    return stage.top === 0 && stage.left === 0 && stage.width === innerWidth && stage.height >= innerHeight &&
      header.dataset.overlay === "true" && getComputedStyle(header).backgroundColor === "rgba(0, 0, 0, 0)" &&
      getComputedStyle(header.querySelector("[data-logo-wordmark]")).color === "rgb(255, 255, 255)";
  }));
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: "instant" }));
  await page.waitForFunction(() => document.querySelector(".stt-site-header").dataset.overlay === "false");
  await page.waitForTimeout(350);
  check("scroll reveals a solid header that remains visible", await page.evaluate(() => {
    const header = document.querySelector(".stt-site-header");
    return header.dataset.hidden === "false" && header.getBoundingClientRect().top === 0 &&
      getComputedStyle(header).backgroundColor !== "rgba(0, 0, 0, 0)";
  }));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForFunction(() => document.querySelector(".stt-site-header").dataset.overlay === "true");
  await page
    .getByRole("button", { name: "Ảnh tiếp theo", exact: true })
    .click();
  check(
    "next arrow switches slide",
    (await page
      .getByRole("button", { name: /^Ảnh 2:/ })
      .getAttribute("aria-current")) === "true",
  );
  await page.getByRole("button", { name: "Ảnh trước", exact: true }).click();
  check(
    "previous arrow switches back",
    (await page
      .getByRole("button", { name: /^Ảnh 1:/ })
      .getAttribute("aria-current")) === "true",
  );
  const region = page.getByRole("region", {
    name: "Cảm hứng hành trình",
    exact: true,
  });
  await region.focus();
  await page.keyboard.press("ArrowRight");
  check(
    "carousel supports arrow keys",
    (await page
      .getByRole("button", { name: /^Ảnh 2:/ })
      .getAttribute("aria-current")) === "true",
  );
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    check(
      `carousel ${width}px stays within viewport`,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: /^Ảnh 1:/ }).click();
  await page
    .locator('.stt-cinema-image[data-active="true"] img')
    .evaluate((image) => image.decode());
  mkdirSync("verify-screenshots", { recursive: true });
  await page.waitForTimeout(1100);
  await page.screenshot({
    path: "verify-screenshots/hero-carousel-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.locator(".stt-menu-trigger").click();
  check("mobile menu opens over the full-screen hero", await page.locator("dialog[open]").isVisible());
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector(".stt-site-header").dataset.overlay === "true");
  await page.screenshot({
    path: "verify-screenshots/hero-carousel-mobile.png",
  });
  await admin.getByLabel("Bố cục ảnh ghép", { exact: false }).check();
  const titleField = admin.getByLabel("Tiêu đề dòng đầu", { exact: true });
  await titleField.fill("Một hành trình mang dấu ấn của bạn");
  await admin
    .getByRole("button", { name: "Lưu bản nháp", exact: true })
    .click();
  await admin
    .getByRole("status")
    .filter({ hasText: "Đã lưu thay đổi" })
    .waitFor();
  const edited = (await current()).data;
  check(
    "admin reorders slides and selects a supplied photo",
    edited.slides[0].id === original.slides[1].id &&
      edited.slides[0].image.src === "/images/hero/blue-bay.webp",
  );
  check(
    "admin focal-point control saves its value",
    edited.slides[0].image.positionX === 100,
  );
  const snapshot = await context.request.get(base);
  check(
    "saving draft keeps the published carousel",
    (await snapshot.text()).includes('data-hero-mode="carousel"'),
  );
  await admin.getByRole("button", { name: /Sửa ảnh đầu trang/ }).click();
  await admin
    .getByRole("button", { name: "Xuất bản thay đổi", exact: false })
    .click();
  await page.locator('[data-hero-mode="collage"]').waitFor({ timeout: 20000 });
  await page
    .getByRole("heading", { name: /Một hành trình mang dấu ấn của bạn/ })
    .waitFor();
  check("publishing mode and content updates the open landing", true);
  check(
    "collage uses the newly selected supplied photos",
    await page
      .locator('[data-hero-mode="collage"] img')
      .first()
      .getAttribute("src")
      .then((value) => value.includes("island-panorama")),
  );
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    check(
      `collage ${width}px stays within viewport`,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  await page.screenshot({
    path: "verify-screenshots/hero-collage-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.screenshot({ path: "verify-screenshots/hero-collage-mobile.png" });
  await publish({ ...original, autoplay: true, intervalSeconds: 6 });
  await page.locator('[data-hero-mode="carousel"]').waitFor({ timeout: 20000 });
  await page.locator(".stt-cinema-stage").hover();
  await page
    .getByRole("button", { name: /^Ảnh 2:/ })
    .waitFor({ state: "attached" });
  await page.waitForFunction(
    () =>
      document
        .querySelector('.stt-cinema-dots button[aria-current="true"]')
        ?.getAttribute("aria-label")
        ?.startsWith("Ảnh 2:"),
    undefined,
    { timeout: 15000 },
  );
  check("autoplay advances even while hovered", true);
  await page.getByRole("button", { name: "Ảnh tiếp theo", exact: true }).click();
  check(
    "pointer navigation keeps autoplay running",
    await page.getByRole("button", { name: "Dừng trình chiếu", exact: true }).getAttribute("aria-pressed") === "true",
  );
  check(
    "manual slide changes retain the crossfade",
    await page.locator(".stt-cinema-image").first().evaluate(
      (node) => parseFloat(getComputedStyle(node).transitionDuration) > 0,
    ),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("button", { name: "Dừng trình chiếu", exact: true })
    .waitFor({ state: "hidden" });
  check(
    "reduced motion disables automatic playback",
    await page
      .getByRole("button", { name: "Phát trình chiếu", exact: true })
      .isDisabled(),
  );
  await page
    .getByRole("button", { name: "Ảnh tiếp theo", exact: true })
    .click();
  check("manual navigation still works with reduced motion", true);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await publish({ ...original, slides: [original.slides[0]] });
  await page
    .getByRole("button", { name: "Ảnh tiếp theo", exact: true })
    .waitFor({ state: "hidden", timeout: 20000 });
  check("single-slide configuration hides redundant controls", true);
  const latest = await current();
  const invalid = await context.request.post(`${base}/api/admin/content/hero`, {
    headers,
    data: {
      data: { ...latest.data, slides: [] },
      revision: latest.revision,
      action: "publish",
    },
  });
  check("cannot publish an empty slideshow", invalid.status() === 400);
  const eightSlides = Array.from({ length: 8 }, (_, index) => ({
    ...original.slides[index % original.slides.length],
    id: `eight_${index}`,
  }));
  await publish({ ...original, autoplay: true, slides: eightSlides });
  await page
    .getByRole("button", { name: /^Ảnh 8:/ })
    .waitFor({ timeout: 20000 });
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    check(
      `eight slides with playback controls fit ${width}px`,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  await publish(original);
  await page.goto(`${base}/en`);
  check(
    "English carousel labels and localized CTA work",
    (await page
      .getByRole("button", { name: "Next photo", exact: true })
      .count()) === 1 &&
      (
        await page.locator(".stt-cinema-primary").getAttribute("href")
      ).startsWith("/en/"),
  );
  check("no browser JavaScript errors", errors.length === 0);
  console.log(`Hero verification: ${checks}/${checks} checks passed.`);
} finally {
  await browser?.close();
  server.kill();
}

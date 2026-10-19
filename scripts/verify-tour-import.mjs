/** Production browser checks for customer programmes. Start `next start -p 3101` first. */
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const base = process.env.VERIFY_BASE_URL ?? "http://127.0.0.1:3101";
const manifest = JSON.parse(
  readFileSync(
    new URL("../docs/tour-source-manifest.json", import.meta.url),
    "utf8",
  ),
);
const server = process.env.VERIFY_BASE_URL
  ? undefined
  : spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3101",
      ],
      { stdio: "ignore", env: { ...process.env, CMS_ENABLED: "0" } },
    );
if (server) {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await fetch(base, { redirect: "manual" });
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (!ready) {
    server.kill();
    throw new Error("Production server did not start");
  }
}
const browser = await chromium.launch(
  process.env.CHROMIUM_EXECUTABLE_PATH
    ? {
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      }
    : { channel: "chrome" },
);
let checks = 0;
const errors = [];
mkdirSync("verify-screenshots", { recursive: true });
try {
  const page = await browser.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const locale of ["vi", "en"]) {
      for (const tour of manifest.programs) {
        const response = await page.goto(
          `${base}${locale === "en" ? "/en" : ""}/tour/${tour.slug}`,
          { waitUntil: "load" },
        );
        assert.equal(response.status(), 200, tour.slug);
        const metrics = await page.evaluate(() => ({
          width: document.documentElement.clientWidth,
          scroll: Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth,
          ),
        }));
        assert.ok(
          metrics.scroll <= metrics.width + 1,
          `${width}px ${locale}/${tour.slug}: horizontal overflow ${JSON.stringify(metrics)}`,
        );
        const brokenAnchors = await page
          .locator('nav[aria-label] a[href^="#"]')
          .evaluateAll((links) =>
            links
              .filter((a) => !document.getElementById(a.hash.slice(1)))
              .map((a) => a.hash),
          );
        assert.deepEqual(brokenAnchors, [], tour.slug);
        const image = page.locator("#tour-gallery-panel img");
        if (await image.count()) {
          await image.waitFor();
          await image.evaluate((img) =>
            img.complete
              ? null
              : new Promise((resolve) => {
                  img.onload = resolve;
                  img.onerror = resolve;
                }),
          );
          assert.ok(
            await image.evaluate((img) => img.naturalWidth > 0),
            `broken photo ${tour.slug}`,
          );
        } else {
          assert.equal(
            await page.locator('#tour-gallery-panel [role="img"]').count(),
            1,
            `missing image fallback ${tour.slug}`,
          );
        }
        assert.equal(await page.locator("h1").count(), 1);
        const breadcrumbs = await page
          .locator("#ld-breadcrumb")
          .evaluate((element) =>
            JSON.parse(element.textContent).itemListElement.map(
              (item) => new URL(item.item).pathname,
            ),
          );
        assert.ok(
          breadcrumbs.every((path) => !path.startsWith("/en/en")),
          `duplicate locale in breadcrumb ${tour.slug}`,
        );
        if (locale === "en")
          assert.ok(
            breadcrumbs.every(
              (path) => path === "/en" || path.startsWith("/en/"),
            ),
          );
        if (locale === "en")
          assert.match(
            await page.locator('meta[name="robots"]').getAttribute("content"),
            /noindex/,
          );
        checks++;
      }
    }
  }
  for (const path of [
    "/tour-quy-nhon-phu-yen",
    "/tour-quy-nhon-phu-yen/tour-quy-nhon-1-ngay",
  ]) {
    await page.goto(`${base}/en${path}`);
    const breadcrumbs = await page
      .locator("#ld-breadcrumb")
      .evaluate((element) =>
        JSON.parse(element.textContent).itemListElement.map(
          (item) => new URL(item.item).pathname,
        ),
      );
    assert.ok(
      breadcrumbs.every(
        (url) =>
          url === "/en" ||
          (url.startsWith("/en/") && !url.startsWith("/en/en")),
      ),
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/tour/quy-nhon-phu-yen-4-ngay-3-dem`);
  assert.equal(await page.locator("#bang-gia tbody tr").count(), 4);
  assert.match(await page.locator("#bang-gia").innerText(), /3\.090\.000/);
  const days = page.locator("#lich-trinh details");
  assert.equal(await days.count(), 4);
  assert.equal(await days.nth(1).getAttribute("open"), null);
  await days.nth(1).locator("summary").focus();
  await page.keyboard.press("Enter");
  assert.notEqual(await days.nth(1).getAttribute("open"), null);
  await page.locator('[role="tab"]').first().focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.locator('[role="tab"]').nth(1).getAttribute("aria-selected"),
    "true",
  );
  assert.match(
    await page.locator('input[name="interest"]').first().inputValue(),
    /Quy Nhơn – Phú Yên 4 ngày 3 đêm/,
  );
  let submitted;
  await page.route("**/api/leads", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: {
          code: "MAIL_DELIVERY_FAILED",
          message: "Test delivery failure",
        },
      }),
    });
  });
  await page.locator('input[name="fullName"]').fill("Kiểm tra tour");
  await page.locator('input[name="phone"]').fill("0901234567");
  await page.locator('input[name="consent"]').check();
  await Promise.all([
    page.waitForResponse("**/api/leads"),
    page.locator('button[type="submit"]').first().click(),
  ]);
  assert.equal(submitted.tourSlug, "quy-nhon-phu-yen-4-ngay-3-dem");
  await page.screenshot({
    path: "verify-screenshots/import-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${base}/tour/quy-nhon-phu-yen-4-ngay-3-dem`);
  await page.screenshot({
    path: "verify-screenshots/import-desktop.png",
    fullPage: true,
  });
  await page.goto(base);
  await page.screenshot({
    path: "verify-screenshots/import-home.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    `PASS: ${checks} route/viewport/locale combinations; photos, anchors, package table, keyboard accordion, gallery and form context; no page errors.`,
  );
} finally {
  await browser.close();
  server?.kill();
}

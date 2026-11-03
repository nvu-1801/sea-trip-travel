/**
 * Browser verification for the hotel module.
 *
 * Boots the production build against a throwaway database, seeds demo rows with
 * `scripts/lib/hotels-fixture.ts`, then checks the public flow, the admin flow
 * and the feature-flag boundary. Screenshots land in `verify-screenshots/hotels`
 * (gitignored) for manual review.
 *
 *   npm run build && npm run verify:hotels
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const PORT = Number(process.env.VERIFY_HOTELS_PORT ?? 3131);
const BASE = `http://127.0.0.1:${PORT}`;
const SHOT_DIR = path.resolve("verify-screenshots/hotels");
const ADMIN_PASSWORD = "hotel-verify-password-2026";

const results = [];
let failures = 0;

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failures += 1;
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` - ${detail}` : ""}`);
}

function isoOffset(offset) {
  const today = new Date();
  const date = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + offset,
  );
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

async function waitForServer(timeoutMs = 60_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function seed(dbPath, mode) {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--conditions=react-server",
      "scripts/lib/hotels-fixture.ts",
      dbPath,
      mode,
    ],
    {
      env: {
        ...process.env,
        HOTELS_FIXTURE_OK: "1",
        CMS_ENABLED: "1",
        NODE_OPTIONS: "",
      },
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr);
    throw new Error(`Fixture failed (${mode})`);
  }
}

async function overflowOf(page) {
  return page.evaluate(
    () =>
      Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ) - document.documentElement.clientWidth,
  );
}

async function main() {
  if (!existsSync(".next/BUILD_ID")) {
    console.error("No production build found. Run `npm run build` first.");
    process.exit(1);
  }

  const directory = mkdtempSync(path.join(tmpdir(), "seatrip-verify-hotels-"));
  const dbPath = path.join(directory, "hotels.sqlite");
  const uploadDir = path.join(directory, "uploads");
  mkdirSync(uploadDir, { recursive: true });
  mkdirSync(SHOT_DIR, { recursive: true });

  seed(dbPath, "on");

  const server = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(PORT),
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: BASE,
        SITE_URL: BASE,
        CMS_ENABLED: "1",
        CMS_DB_PATH: dbPath,
        CMS_UPLOAD_DIR: uploadDir,
        LEAD_ENCRYPTION_KEY: "ab".repeat(32),
        ADMIN_USERNAME: "verify-admin",
        ADMIN_PASSWORD,
        ADMIN_COOKIE_SECURE: "false",
        MAIL_TRANSPORT: "log",
        SALES_RECIPIENTS: "sales@example.com",
        LEAD_HASH_SALT: "hotel-verify-salt",
        LEAD_RATE_LIMIT_STORE: "memory",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", () => {});
  server.stderr.on("data", (chunk) => {
    const text = String(chunk);
    if (/error/i.test(text)) process.stderr.write(`  [server] ${text.trim()}\n`);
  });

  let browser;
  try {
    if (!(await waitForServer()))
      throw new Error(`next start did not become ready on ${BASE}`);
    console.log(`Hotel verification server ready on ${BASE}\n`);

    browser = await chromium.launch(
      process.env.CHROMIUM_EXECUTABLE_PATH
        ? {
            executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
            args: ["--no-sandbox", "--disable-dev-shm-usage"],
          }
        : { channel: "chrome" },
    );

    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "vi-VN",
    });
    const page = await desktop.newPage();

    /* ---------------------------------------------------------------- public */
    console.log("1. Public catalogue");
    const listResponse = await page.goto(`${BASE}/khach-san`, {
      waitUntil: "load",
    });
    check("list page returns 200", listResponse?.status() === 200);
    const cards = await page.locator(".stt-hotel-card").count();
    check("published hotel is listed", cards >= 1, `${cards} card(s)`);
    const priceText = (await page.locator(".stt-hotel-card-price").first().innerText()).trim();
    check("card shows a reference price", /₫/.test(priceText), priceText);
    await page.screenshot({
      path: path.join(SHOT_DIR, "list-1440.png"),
      fullPage: true,
    });

    await page.goto(`${BASE}/khach-san?q=khong-co-khach-san-nao`, {
      waitUntil: "load",
    });
    check(
      "empty search shows guidance, not an error",
      (await page.locator(".stt-hotel-empty").count()) === 1,
    );

    await page.goto(`${BASE}/khach-san?star=5`, { waitUntil: "load" });
    check(
      "filter that matches nothing is distinguishable from a load error",
      (await page.locator(".stt-hotel-empty h2").innerText()).includes("Chưa có"),
    );

    await page.goto(`${BASE}/khach-san?star=4`, { waitUntil: "load" });
    await page.locator(".stt-hotel-card-title a").first().click();
    await page.waitForURL(/\/khach-san\/.+/, { timeout: 20_000 });
    await page.goBack({ waitUntil: "load" });
    check(
      "Back restores the filtered list from the URL",
      page.url().includes("star=4") &&
        (await page.locator(".stt-hotel-card").count()) >= 1,
      page.url(),
    );

    const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
    check(
      "sitemap lists the catalogue and the published hotel",
      sitemap.includes("/khach-san</loc>") &&
        sitemap.includes("/khach-san/demo-quy-nhon-resort</loc>"),
    );

    console.log("2. Detail, rooms and availability");
    const checkIn = isoOffset(30);
    const checkOut = isoOffset(32);
    const detailResponse = await page.goto(
      `${BASE}/khach-san/demo-quy-nhon-resort?checkIn=${checkIn}&checkOut=${checkOut}`,
      { waitUntil: "load" },
    );
    check("detail page returns 200", detailResponse?.status() === 200);
    check(
      "detail shows the room list",
      (await page.locator(".stt-hotel-room").count()) >= 2,
    );
    const availability = await page
      .locator(".stt-hotel-room .stt-hotel-muted")
      .allInnerTexts();
    check(
      "nightly availability uses the tightest night (2)",
      availability.some((text) => text.includes("2 phòng")),
      availability.join(" | "),
    );
    await page.screenshot({
      path: path.join(SHOT_DIR, "detail-1440.png"),
      fullPage: true,
    });

    const quoteResponse = await fetch(
      `${BASE}/api/hotels/quote?hotel=hotel_demo_quynhon&rooms=room_demo_deluxe:2&checkIn=${checkIn}&checkOut=${checkOut}`,
    );
    const quote = await quoteResponse.json();
    check("quote API returns 200", quoteResponse.status === 200);
    check(
      "quote is server-computed from stored rules",
      typeof quote?.quote?.lodgingTotal === "number" ||
        quote?.quote?.status === "needs_quote",
      JSON.stringify(quote?.quote?.status ?? null),
    );

    console.log("2b. Consultation form");
    await page.locator(".stt-hotel-qty select").first().selectOption("1");
    await page
      .getByLabel("Tour quan tâm (tuỳ chọn)")
      .selectOption("quy-nhon-phu-yen-3-ngay-2-dem");
    await page.locator(".stt-hotel-estimate-toggle").waitFor({ timeout: 20_000 });
    await page.waitForFunction(
      () =>
        document
          .querySelector(".stt-hotel-estimate-line")
          ?.textContent?.includes("Quy Nhơn") ?? false,
      { timeout: 20_000 },
    );
    await page.locator(".stt-hotel-estimate-toggle").click();
    await page.locator(".stt-hotel-estimate-detail").waitFor();
    const tourLine = await page
      .locator(".stt-hotel-estimate-line")
      .first()
      .innerText();
    check(
      "estimate shows the selected tour subtotal",
      tourLine.includes("Quy Nhơn") && /₫/.test(tourLine),
      tourLine.replace(/\s+/g, " ").slice(0, 90),
    );
    const totalText = await page
      .locator(".stt-hotel-estimate-total strong")
      .innerText();
    check("estimate shows a combined total", /₫/.test(totalText), totalText);
    await page.screenshot({
      path: path.join(SHOT_DIR, "estimate-1440.png"),
      fullPage: true,
    });
    await page.getByLabel("Họ tên").fill("Khách Kiểm Thử");
    await page.locator('.stt-hotel-form input[autocomplete="tel"]').fill("0987 654 321");
    await page.locator(".stt-hotel-check input[type=checkbox][required]").check();
    await page.locator("button.stt-hotel-submit").click();
    await page
      .getByRole("heading", { name: /đã nhận yêu cầu/i })
      .waitFor({ timeout: 20_000 });
    const submitted = await page.locator(".stt-hotel-panel h2").first().innerText();
    check(
      "hotel request confirms receipt without promising a booking",
      submitted.includes("đã nhận yêu cầu") && !submitted.includes("Đặt thành công"),
      submitted,
    );

    const enResponse = await page.goto(`${BASE}/en/khach-san`, {
      waitUntil: "load",
    });
    check("English catalogue returns 200", enResponse?.status() === 200);
    check(
      "English page uses English copy",
      (await page.locator("h1").first().innerText()).toLowerCase().includes("hotel"),
    );

    await page.goto(`${BASE}/`, { waitUntil: "load" });
    check(
      "home shows the hotel section when enabled",
      (await page.locator(".stt-hotel-home").count()) === 1,
    );

    console.log("3. Mobile layout");
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      locale: "vi-VN",
    });
    const mobilePage = await mobile.newPage();
    await mobilePage.goto(`${BASE}/khach-san`, { waitUntil: "load" });
    const listOverflow = await overflowOf(mobilePage);
    check("mobile list has no horizontal scroll", listOverflow <= 0, `${listOverflow}px`);
    await mobilePage.screenshot({
      path: path.join(SHOT_DIR, "list-390.png"),
      fullPage: true,
    });
    await mobilePage.goto(
      `${BASE}/khach-san/demo-quy-nhon-resort?checkIn=${checkIn}&checkOut=${checkOut}`,
      { waitUntil: "load" },
    );
    const detailOverflow = await overflowOf(mobilePage);
    check("mobile detail has no horizontal scroll", detailOverflow <= 0, `${detailOverflow}px`);
    await mobilePage.screenshot({
      path: path.join(SHOT_DIR, "detail-390.png"),
      fullPage: true,
    });
    await mobile.close();

    /* ----------------------------------------------------------------- admin */
    console.log("4. Studio");
    await page.goto(`${BASE}/admin/login`, { waitUntil: "load" });
    await page.fill('input[name="username"]', "verify-admin");
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await Promise.all([
      page.waitForURL(/\/admin(\?|$)/, { timeout: 20_000 }),
      page.click('form button[type="submit"], form .adm-primary'),
    ]);
    await page.goto(`${BASE}/admin/hotels`, { waitUntil: "load" });
    await page.waitForSelector(".stt-hotel-table tbody tr", { timeout: 20_000 });
    check(
      "Studio lists the hotel",
      (await page.locator(".stt-hotel-table tbody tr").count()) >= 1,
    );
    await page.screenshot({
      path: path.join(SHOT_DIR, "admin-hotels-1440.png"),
      fullPage: true,
    });

    await page.locator(".stt-hotel-table button", { hasText: "Sửa" }).first().click();
    await page.waitForSelector(".stt-hotel-tabs", { timeout: 20_000 });
    check("editor opens with five tabs", (await page.locator(".stt-hotel-tab").count()) === 5);

    const preview = await desktop.newPage();
    await preview.goto(`${BASE}/admin/preview/hotels/hotel_demo_quynhon`, {
      waitUntil: "load",
    });
    check(
      "preview renders the saved hotel for the owner",
      (await preview.locator("h1").innerText()).includes("Demo Quy Nhơn"),
    );
    await preview.close();
    await page.locator(".stt-hotel-tab", { hasText: "Giá & tình trạng" }).click();
    await page.waitForSelector(".stt-hotel-grid", { timeout: 20_000 });
    check(
      "price calendar renders a day grid",
      (await page.locator(".stt-hotel-day").count()) >= 28,
    );
    await page.locator(".stt-hotel-calendar button.adm-primary").first().click();
    await page.getByText("Đã lưu giá").waitFor({ timeout: 20_000 });
    check(
      "saving prices reports success in the editor",
      (await page.locator(".adm-notice").first().innerText()).includes("Đã lưu giá"),
    );
    await page.screenshot({
      path: path.join(SHOT_DIR, "admin-rates-1440.png"),
      fullPage: true,
    });

    console.log("4b. Sales flow");
    await page.goto(`${BASE}/admin/leads`, { waitUntil: "load" });
    await page.locator(".adm-chip-btn", { hasText: "Khách sạn" }).first().click();
    await page.waitForSelector(".stt-hotel-lead", { timeout: 20_000 });
    check(
      "hotel request appears in the existing inbox",
      (await page.locator(".stt-hotel-lead").count()) >= 1,
    );
    await page
      .locator(".stt-hotel-lead button", { hasText: "Chi tiết lưu trú" })
      .first()
      .click();
    await page.getByLabel("Báo giá cuối cùng (VND)").fill("4200000");
    await page.getByLabel("Nội dung báo giá / điều kiện").fill("Đã kiểm tra còn phòng (demo)");
    await page
      .locator(".stt-hotel-lead-plan button", { hasText: "Lưu báo giá" })
      .click();
    await page.waitForSelector(".stt-hotel-lead-plan .adm-field-success", {
      timeout: 20_000,
    });
    check(
      "sales can save a quote on the hotel request",
      (await page.locator(".stt-hotel-lead-plan .adm-field-success").innerText()).includes(
        "Đã lưu",
      ),
    );

    /* ------------------------------------------------------------ flag off */
    console.log("5. Feature flag boundary");
    seed(dbPath, "off");
    const offList = await page.goto(`${BASE}/khach-san`, { waitUntil: "load" });
    check("catalogue returns 404 while the module is off", offList?.status() === 404);
    const offQuote = await fetch(
      `${BASE}/api/hotels/quote?hotel=hotel_demo_quynhon&rooms=room_demo_deluxe:1&checkIn=${checkIn}&checkOut=${checkOut}`,
    );
    check("quote API is closed while the module is off", offQuote.status === 404);
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    check(
      "home section disappears with the module",
      (await page.locator(".stt-hotel-home").count()) === 0,
    );
    const offSitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
    check(
      "sitemap drops hotel URLs while the module is off",
      !offSitemap.includes("/khach-san"),
    );
    await page.goto(`${BASE}/admin/hotels`, { waitUntil: "load" });
    await page.waitForSelector(".stt-hotel-table tbody tr", { timeout: 20_000 });
    check(
      "admin keeps the data while the module is off",
      (await page.locator(".stt-hotel-table tbody tr").count()) >= 1,
    );

    seed(dbPath, "on");
    await desktop.close();
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
    await new Promise((resolve) => setTimeout(resolve, 500));
    rmSync(directory, { recursive: true, force: true });
  }

  console.log(
    `\nHotel verification: ${results.length - failures}/${results.length} checks passed.`,
  );
  console.log(`Screenshots: ${SHOT_DIR}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

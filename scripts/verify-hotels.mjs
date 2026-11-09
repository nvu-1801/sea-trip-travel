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
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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
    check(
      "rooms without photos show a dedicated placeholder",
      (await page.locator(".stt-room-photo-empty").count()) >= 1,
    );
    const mapsHref = await page.getByRole("link", { name: "Mở trong Maps", exact: true }).getAttribute("href");
    check("hotel location links to Maps even without an admin URL",
      mapsHref?.startsWith("https://www.google.com/maps/search/?api=1&query="));
    const galleryTile = page.locator(".stt-photo-gallery .stt-photo-tile").first();
    await galleryTile.click();
    const gallery = page.locator("dialog.stt-hotel-lightbox[open]");
    await gallery.waitFor();
    check("the hotel photo opens in a modal", await gallery.isVisible());
    await page.keyboard.press("Escape");
    await gallery.waitFor({ state: "hidden" });
    check(
      "closing the gallery restores focus to the photo",
      await galleryTile.evaluate((tile) => tile === document.activeElement),
    );
    await galleryTile.click();
    await gallery.waitFor();
    await gallery.locator(".stt-hotel-lightbox-row > img").click();
    check("clicking the photo keeps the gallery open", await gallery.isVisible());
    await page.mouse.click(5, 5);
    await gallery.waitFor({ state: "hidden" });
    check("clicking the backdrop closes the gallery", !(await gallery.isVisible()));

    const dateTrigger = page.locator(".stt-room-filter-date button[aria-haspopup]").first();
    await dateTrigger.click();
    const calendar = page.locator(".stt-room-filter-date [role=dialog]");
    check("room filter opens the themed calendar", await calendar.isVisible());
    await page.keyboard.press("Escape");
    await calendar.waitFor({ state: "hidden" });

    const availability = await page
      .locator(".stt-hotel-room-state")
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

    console.log("2b. Room prices and the merged consultation form");
    check(
      "hotel page lists room prices instead of a contact form",
      (await page.locator(".stt-hotel-form").count()) === 0 &&
        (await page.locator(".stt-hotel-request-room").count()) >= 2,
    );
    await page.locator(".stt-hotel-request-room").first().click();
    const assignDialog = page.getByRole("dialog");
    await assignDialog.waitFor({ timeout: 20_000 });
    check(
      "choosing a room confirms it was added to the contact form",
      (await assignDialog.innerText()).includes("Đã gán vào form liên hệ"),
    );
    await page.screenshot({
      path: path.join(SHOT_DIR, "assign-dialog-1440.png"),
    });
    await assignDialog.getByRole("link", { name: "Tới form liên hệ" }).click();
    await page.waitForURL(/\/lien-he/, { timeout: 20_000 });
    check(
      "the dialog lands on the contact page",
      new URL(page.url()).pathname === "/lien-he",
    );
    await page.locator("[data-hotel-chip]").first().waitFor();
    check(
      "the contact form shows only the chosen hotel",
      (await page.locator("[data-hotel-chip]").count()) === 1 &&
        (await page.locator("[data-hotel-chip]").innerText()).includes(
          "Demo Quy Nhơn",
        ),
    );
    await page.locator('input[name="fullName"]').first().fill("Khách Kiểm Thử");
    await page.locator('input[name="phone"]').first().fill("0987 654 321");
    await page.locator('input[name="consent"]').check();
    await page.getByRole("button", { name: "Gửi yêu cầu tư vấn" }).click();
    await page
      .getByRole("heading", { name: /Cảm ơn bạn đã chọn SEA TRIP/ })
      .waitFor({ timeout: 20_000 });
    check(
      "the merged form submits the hotel enquiry without promising a booking",
      (await page.getByText("Mã yêu cầu:").count()) === 1,
    );
    await page.screenshot({
      path: path.join(SHOT_DIR, "contact-success-1440.png"),
    });

    await page.goto(`${BASE}/lien-he`, { waitUntil: "load" });
    await page.locator("[data-hotel-chip]").first().waitFor();
    await page.getByRole("button", { name: "Bỏ khách sạn" }).click();
    await page.waitForFunction(() => !document.querySelector("[data-hotel-chip]"), {
      timeout: 10_000,
    });
    check(
      "the attached hotel can be removed from the form",
      (await page.locator("[data-hotel-chip]").count()) === 0,
    );
    await page.getByRole("button", { name: "Gửi yêu cầu tư vấn" }).click();
    const needOne = page
      .getByText(/Chọn một tour\/điểm đến hoặc một khách sạn/)
      .first();
    await needOne.waitFor({ timeout: 10_000 });
    check(
      "the form refuses a request with neither tour nor hotel",
      await needOne.isVisible(),
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
    const mobileCatalogDates = mobilePage.locator(".stt-hotel-filters-head button[aria-haspopup=dialog]");
    for (const trigger of await mobileCatalogDates.all()) {
      await trigger.tap();
      const calendar = mobilePage.locator(".stt-hotel-filters-head [role=dialog]");
      const bounds = await calendar.boundingBox();
      check("mobile catalogue calendar fits within the viewport",
        Boolean(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 390));
      await mobilePage.keyboard.press("Escape");
      await calendar.waitFor({ state: "hidden" });
    }
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
    const mobileCheckIn = mobilePage.locator(".stt-room-filter-date button[aria-haspopup]").first();
    await mobileCheckIn.tap();
    const mobileCalendar = mobilePage.locator(".stt-room-filter-date [role=dialog]");
    await mobileCalendar.getByRole("button", { name: "Hôm nay", exact: true }).tap();
    const selectedCheckIn = await mobilePage.locator('input[name="checkIn"]').inputValue();
    check("mobile check-in calendar accepts a tap", /^\d{4}-\d{2}-\d{2}$/.test(selectedCheckIn) && selectedCheckIn !== checkIn);
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
    const highlights = page.getByLabel("Điểm nổi bật");
    await highlights.fill("Gần biển");
    await highlights.press("End");
    await highlights.press("Enter");
    await highlights.pressSequentially("Có hồ bơi");
    check("hotel highlights preserve a second line while typing",
      (await highlights.inputValue()) === "Gần biển\nCó hồ bơi");

    await page.locator(".stt-hotel-tab", { hasText: "Hạng phòng" }).click();
    await page.getByRole("button", { name: "Sửa hạng phòng", exact: true }).first().click();
    check("Studio previews the room facts shown below its photos",
      (await page.locator(".stt-hotel-room-facts-preview").innerText()).includes("người lớn"));
    const dropzone = page.getByRole("button", { name: /kéo thả.*thêm ảnh hạng phòng/i });
    check("room uploader shows the recommended dimensions",
      await page.getByText(/1600 × 1200 px \(4:3\)/).first().isVisible());
    const imageBytes = Array.from(readFileSync("public/images/hotels/st-apartment-flc-seatower/2-9494d5a4.webp"));
    await dropzone.evaluate((target, bytes) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(bytes)], "room.webp", { type: "image/webp" }));
      target.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true, cancelable: true }));
    }, imageBytes);
    const savedPreview = page.locator(".stt-hotel-gallery-row .adm-dropzone img").first();
    await savedPreview.waitFor();
    check("dropping a room photo adds a preview", await savedPreview.isVisible());

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

    await page.getByRole("button", { name: "Về danh sách", exact: true }).click();
    await page.locator(".stt-hotel-table").waitFor();
    check("return to list closes the hotel editor", !(await page.locator(".stt-hotel-tabs").isVisible()));

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

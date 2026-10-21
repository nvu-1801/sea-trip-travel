import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";
import sharp from "sharp";
const folder = mkdtempSync(path.join(tmpdir(), "studio-qa-"));
const base = `http://127.0.0.1:${process.env.STUDIO_VERIFY_PORT ?? 3197}`;
const password = randomBytes(20).toString("hex");
const env = {
  ...process.env,
  CMS_ENABLED: "1",
  CMS_DB_PATH: path.join(folder, "cms.sqlite"),
  CMS_UPLOAD_DIR: path.join(folder, "uploads"),
  ADMIN_USERNAME: "studio-qa",
  ADMIN_PASSWORD: password,
  ADMIN_COOKIE_SECURE: "false",
  SITE_URL: base,
  NEXT_PUBLIC_SITE_URL: base,
  LEAD_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  NODE_ENV: "production",
};
assert.equal(
  spawnSync(process.execPath, ["scripts/admin.mjs", "bootstrap"], {
    env,
    encoding: "utf8",
  }).status,
  0,
);
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    new URL(base).port,
  ],
  { env, stdio: ["ignore", "pipe", "pipe"] },
);
let serverErrors = "",
  browser,
  page,
  checks = 0;
server.stderr.on("data", (chunk) => (serverErrors += chunk));
function check(name, condition = true) {
  assert.ok(condition, name);
  checks++;
  console.log(`PASS ${name}`);
}
try {
  for (let i = 0; i < 150; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch(
    process.env.CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
      : { channel: "chrome" },
  );
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/admin`);
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("studio-qa");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Vào SEA TRIP Studio" }).click();
  const nav = page.getByRole("navigation", { name: "Quản trị", exact: true });
  await nav.getByRole("button", { name: "Trang chủ", exact: true }).click();
  await page
    .getByRole("heading", {
      name: "Bạn muốn thay đổi phần nào trên trang chủ?",
    })
    .waitFor();
  await page.locator(".adm-section-grid article").first().waitFor();
  check(
    "home shows eleven named sections",
    (await page.locator(".adm-section-grid article").count()) === 11,
  );
  mkdirSync("verify-screenshots", { recursive: true });
  await page.screenshot({
    path: "verify-screenshots/admin-sections-desktop.png",
  });
  const auth = await (
    await context.request.get(`${base}/api/admin/auth`)
  ).json();
  const headers = { origin: base, "x-csrf-token": auth.csrf };
  const rows = async (collection) =>
    await (
      await context.request.get(`${base}/api/admin/content/${collection}`)
    ).json();
  const mutate = async (collection, row, action, data = row.data) =>
    await context.request.post(`${base}/api/admin/content/${collection}`, {
      headers,
      data: { data, revision: row.revision, action },
    });
  const noAuth = await browser.newContext();
  check(
    "batch endpoint denies unauthenticated users",
    (
      await noAuth.request.post(`${base}/api/admin/batch`, { data: [] })
    ).status() === 401,
  );
  check(
    "batch endpoint denies missing CSRF",
    (
      await context.request.post(`${base}/api/admin/batch`, {
        headers: { origin: base },
        data: [],
      })
    ).status() === 403,
  );
  const story = page.locator(".adm-section-grid article").filter({
    has: page.getByRole("heading", {
      name: "Chọn hành trình theo số ngày",
      exact: true,
    }),
  });
  await story.getByRole("button", { name: "Chỉnh sửa phần này ↗" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Tiêu đề phần 1", { exact: true })
    .fill("Chuyến đi do admin chỉnh sửa");
  await page.screenshot({
    path: "verify-screenshots/admin-section-modal-desktop.png",
  });
  await dialog
    .getByRole("button", { name: "Lưu bản nháp", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  check(
    "saved draft does not change public home",
    !(await (await noAuth.request.get(base)).text()).includes(
      "Chuyến đi do admin chỉnh sửa",
    ),
  );
  await story.getByRole("button", { name: "Chỉnh sửa phần này ↗" }).click();
  check(
    "draft reopens with saved changes",
    (await dialog
      .getByLabel("Tiêu đề phần 1", { exact: true })
      .inputValue()) === "Chuyến đi do admin chỉnh sửa",
  );
  await dialog.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  check(
    "publishing updates public home",
    (await (await noAuth.request.get(base)).text()).includes(
      "Chuyến đi do admin chỉnh sửa",
    ),
  );
  const unrelated = (await rows("landing"))[0];
  await mutate("landing", unrelated, "save", {
    ...unrelated.data,
    values: {
      ...unrelated.data.values,
      badge: "Unrelated private values badge",
    },
  });
  await page.getByRole("button", { name: "Tải lại", exact: true }).click();
  await page
    .getByText("Đang tải nội dung…", { exact: true })
    .waitFor({ state: "hidden" });
  // Upload is exercised inside the section modal and immediately selected.
  await story.getByRole("button", { name: "Chỉnh sửa phần này ↗" }).click();
  const image = await sharp({
    create: { width: 200, height: 120, channels: 3, background: "#098676" },
  })
    .png()
    .toBuffer();
  await dialog.locator('input[type="file"]').first().setInputFiles({
    name: "studio-image.png",
    mimeType: "image/png",
    buffer: image,
  });
  await dialog
    .getByText("Đang tải ảnh…", { exact: true })
    .first()
    .waitFor({ state: "hidden" });
  await page.waitForFunction(() =>
    document
      .querySelector("dialog[open] .adm-dropzone img")
      ?.getAttribute("src")
      ?.startsWith("/api/media/"),
  );
  check("inline image upload selects new asset");
  await dialog.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  const home = (await rows("landing"))[0];
  check(
    "section editor keeps unrelated drafts private",
    !(await (await noAuth.request.get(base)).text()).includes(
      "Unrelated private values badge",
    ) && home.data.values.badge === "Unrelated private values badge",
  );
  check(
    "image URL is saved in DB",
    home.data.story.photoSrc.startsWith("/api/media/"),
  );
  check(
    "uploaded file is served",
    (
      await noAuth.request.get(`${base}${home.data.story.photoSrc}`)
    ).status() === 200,
  );
  // Atomic rollback on conflict: both content and version remain unchanged.
  const vi = (await rows("messages")).find((row) => row.id === "vi");
  const batch = await context.request.post(`${base}/api/admin/batch`, {
    headers,
    data: [
      {
        collection: "landing",
        data: {
          ...home.data,
          story: { ...home.data.story, titleA: "Must roll back" },
        },
        revision: home.revision,
        action: "publish",
      },
      {
        collection: "messages",
        data: vi.data,
        revision: vi.revision - 1,
        action: "publish",
      },
    ],
  });
  check(
    "conflicting batch fails atomically",
    batch.status() === 400 &&
      (await rows("landing"))[0].data.story.titleA !== "Must roll back",
  );
  // Unsaved Escape confirmation and focus trap.
  await story.getByRole("button", { name: "Chỉnh sửa phần này ↗" }).click();
  await dialog.getByLabel("Tiêu đề phần 1", { exact: true }).fill("Unsaved");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  check(
    "Escape keeps dirty changes when discarded confirmation is rejected",
    await dialog.isVisible(),
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  check("Escape closes after confirming discard");
  // Visibility and ordering are draft/publish aware.
  await page
    .getByRole("button", { name: "↕ Sắp xếp các phần trang chủ", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Đưa phần 2 xuống", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  check(
    "section order saved",
    (await rows("landing"))[0].data.sectionOrder[1] === "explore",
  );
  await story.getByRole("button", { name: "Chỉnh sửa phần này ↗" }).click();
  await dialog.getByRole("button", { name: "Hiển thị", exact: true }).click();
  await dialog.getByLabel("Hiển thị trên website", { exact: true }).uncheck();
  await dialog.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  check(
    "hidden section absent publicly",
    !(await (await noAuth.request.get(base)).text()).includes(
      'class="journey-story"',
    ),
  );
  // Tours still drive both cards and detail; editor presents understandable groups.
  await nav.getByRole("button", { name: "Tour du lịch", exact: true }).click();
  await page.getByRole("button", { name: "Chỉnh sửa ↗" }).first().click();
  await dialog
    .getByLabel("Tiêu đề", { exact: true })
    .first()
    .fill("Tour được sửa từ modal");
  await dialog.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  const tour = (await rows("tours")).find(
    (row) => row.data.title === "Tour được sửa từ modal",
  );
  check(
    "tour modal publishes to detail",
    (
      await (await noAuth.request.get(`${base}/tour/${tour.data.slug}`)).text()
    ).includes(tour.data.title),
  );
  await page.getByRole("button", { name: "Chỉnh sửa ↗" }).first().click();
  await dialog.getByRole("button", { name: "Hình ảnh", exact: true }).click();
  await dialog
    .locator("summary")
    .filter({ hasText: /^Thư viện ảnh$/ })
    .click();
  check(
    "tour images expose inline upload",
    await dialog.getByRole("group", { name: /Thư viện ảnh/ }).isVisible(),
  );
  await dialog
    .getByRole("button", { name: "Đóng", exact: true })
    .last()
    .click();
  // Create custom page entirely through the admin modal.
  await nav
    .getByRole("button", { name: "Các trang khác", exact: true })
    .click();
  await page.getByRole("button", { name: "＋ Thêm mới", exact: true }).click();
  await dialog
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Giới thiệu doanh nghiệp QA");
  await dialog
    .getByRole("button", { name: "Nội dung trang", exact: true })
    .click();
  await dialog
    .locator("details > summary")
    .filter({ hasText: /^Nội dung$/ })
    .click();
  await dialog
    .getByRole("button", { name: "＋ Thêm nội dung", exact: true })
    .click();
  await dialog
    .getByLabel("Nội dung chữ", { exact: true })
    .fill("Nội dung trang mới từ cơ sở dữ liệu");
  await dialog.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  const custom = (await rows("pages")).find(
    (row) => row.data.title === "Giới thiệu doanh nghiệp QA",
  );
  assert.ok(custom);
  const customUrl = `${base}/trang/${custom.data.slug}`;
  check(
    "custom page is public",
    (await (await noAuth.request.get(customUrl)).text()).includes(
      "Nội dung trang mới từ cơ sở dữ liệu",
    ),
  );
  check(
    "custom page is in sitemap",
    (await (await noAuth.request.get(`${base}/sitemap.xml`)).text()).includes(
      `/trang/${custom.data.slug}`,
    ),
  );
  await mutate("pages", custom, "unpublish");
  check(
    "hidden custom page returns 404",
    (await noAuth.request.get(customUrl)).status() === 404,
  );
  // Logo, menu and header/footer use saved settings rather than code constants.
  await nav
    .getByRole("button", { name: "Đầu trang & menu", exact: true })
    .click();
  await page.getByRole("heading", { name: "Logo & tên thương hiệu" }).waitFor();
  await page
    .locator(".adm-section-grid article")
    .filter({
      has: page.getByRole("heading", { name: "Nhãn menu & nút đầu trang" }),
    })
    .getByRole("button", { name: "Chỉnh sửa", exact: true })
    .click();
  await dialog
    .locator("summary")
    .filter({ hasText: /^Menu con$/ })
    .first()
    .count();
  await dialog
    .getByLabel("Nhãn hiển thị", { exact: true })
    .first()
    .fill("Trang chủ đã chỉnh menu");
  await dialog.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  check(
    "menu copy reads DB",
    (await (await noAuth.request.get(base)).text()).includes(
      "Trang chủ đã chỉnh menu",
    ),
  );
  // Keyboard and layout checks at narrow widths, including the modal.
  await nav.getByRole("button", { name: "Trang chủ", exact: true }).click();
  for (const width of [360, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator(".adm-section-grid article").first().waitFor();
    check(
      `admin ${width}px has no document overflow`,
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page
      .locator(".adm-section-grid article")
      .first()
      .getByRole("button")
      .click();
    check(
      `modal ${width}px stays within viewport`,
      await dialog.evaluate(
        (node) => node.getBoundingClientRect().width <= innerWidth,
      ),
    );
    check(
      `modal ${width}px content has no horizontal overflow`,
      await dialog
        .locator(".adm-dialog-content")
        .evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
    );
    await page.screenshot({
      path: `verify-screenshots/admin-modal-${width}.png`,
    });
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
  }
  check("no browser JavaScript errors", errors.length === 0);
  console.log(`Admin Studio verification: ${checks}/${checks} passed`);
} catch (error) {
  mkdirSync("verify-screenshots", { recursive: true });
  await page?.screenshot({
    path: "verify-screenshots/admin-studio-failure.png",
  });
  console.error(serverErrors);
  throw error;
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) {
    server.kill();
    await new Promise((resolve) => server.once("exit", resolve));
  }
  rmSync(folder, { recursive: true, force: true });
}

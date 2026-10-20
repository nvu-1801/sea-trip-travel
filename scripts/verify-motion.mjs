import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";

// Bổ sung cho verify-hero: entrance một lần, form, tab nền, reduced-motion.
const folder = mkdtempSync(path.join(tmpdir(), "seatrip-motion-"));
const base = "http://127.0.0.1:3196";
const password = randomBytes(18).toString("hex");
const env = {
  ...process.env,
  CMS_ENABLED: "1",
  CMS_DB_PATH: path.join(folder, "motion.sqlite"),
  CMS_UPLOAD_DIR: path.join(folder, "uploads"),
  LEAD_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  SITE_URL: base,
  NEXT_PUBLIC_SITE_URL: base,
  ADMIN_COOKIE_SECURE: "false",
  ADMIN_USERNAME: "motion-owner",
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
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3196"],
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
const COUNT_ANIMATE = `(() => {
  if (window.__revealCalls) return;
  window.__revealCalls = [];
  window.__revealSeq = 0;
  const original = Element.prototype.animate;
  Element.prototype.animate = function (keyframes, options) {
    if (this.hasAttribute && this.hasAttribute("data-reveal-once")) {
      if (this.__revealIdx === undefined) this.__revealIdx = window.__revealSeq++;
      window.__revealCalls.push(this.__revealIdx + ":" + this.getAttribute("data-reveal-once"));
    }
    return original.call(this, keyframes, options);
  };
})();`;
const revealStats = (calls) => ({
  total: calls.length,
  unique: new Set(calls).size,
});
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
  const errors = [];

  // --- 1. Entrance một lần + không chạy lại khi cuộn ngược ---
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    context.on("page", (page) => page.on("pageerror", (e) => errors.push(e.message)));
    await context.addInitScript({ content: COUNT_ANIMATE });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator('[data-hero-mode="carousel"]').waitFor();
    await page.waitForTimeout(1200);
    const total = await page.locator("[data-reveal-once]").count();
    assert.ok(total > 10, `expected many reveals, got ${total}`);
    // Cuộn từng chặng xuống cuối để mọi reveal vào viewport.
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.scrollBy({ top: 900, behavior: "instant" }));
      await page.waitForTimeout(350);
    }
    await page.waitForTimeout(1200);
    const callsDown = await page.evaluate(() => window.__revealCalls);
    const statsDown = revealStats(callsDown);
    check(`entrance chạy khi vào viewport (${statsDown.unique} reveal / ${total} reveal)`, statsDown.unique >= total);
    check("mỗi reveal chỉ animate đúng 1 lần", statsDown.unique === statsDown.total);
    // Cuộn ngược lên đầu: không chạy lại.
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.scrollBy({ top: -900, behavior: "instant" }));
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(1000);
    const callsBack = await page.evaluate(() => window.__revealCalls);
    check(
      "cuộn ngược không chạy lại reveal",
      callsBack.length === callsDown.length,
    );
    check(
      "không tràn ngang sau khi animate",
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    );
    await context.close();
  }

  // --- 2. Form không mất focus / mất chữ khi reveal chạy ---
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator('[data-hero-mode="carousel"]').waitFor();
    const name = page.getByLabel(/Họ tên/);
    await name.scrollIntoViewIfNeeded();
    await name.click();
    await name.fill("Nguyễn Văn A");
    // Kích hoạt reveal khác trong lúc đang nhập: cuộn lên xuống.
    await page.evaluate(() => window.scrollBy({ top: -600, behavior: "instant" }));
    await page.waitForTimeout(800);
    await name.scrollIntoViewIfNeeded();
    await page.keyboard.type(" B");
    check("đang nhập không mất chữ", (await name.inputValue()) === "Nguyễn Văn A B");
    check("đang nhập không mất focus", await name.evaluate((el) => document.activeElement === el));
    await page.screenshot({ path: "verify-screenshots/motion-consult-desktop.png" });
    await context.close();
  }

  // --- 3. Tab nền dừng autoplay, quay lại chạy tiếp ---
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator('[data-hero-mode="carousel"]').waitFor();
    const first = await page
      .locator('.stt-cinema-dots button[aria-current="true"]')
      .getAttribute("aria-label");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(6500);
    const duringHidden = await page
      .locator('.stt-cinema-dots button[aria-current="true"]')
      .getAttribute("aria-label");
    check("tab nền không chuyển slide", duringHidden === first);
    check(
      "tab nền hiện nút phát",
      (await page.getByRole("button", { name: "Phát trình chiếu", exact: true }).count()) === 1,
    );
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForFunction(
      (started) =>
        document
          .querySelector('.stt-cinema-dots button[aria-current="true"]')
          ?.getAttribute("aria-label") !== started,
      first,
      { timeout: 12000 },
    );
    check("quay lại tab chạy tiếp autoplay", true);
    await context.close();
  }

  // --- 4. Reduced motion: không animate reveal, nội dung vẫn đọc được ---
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await context.addInitScript({ content: COUNT_ANIMATE });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator('[data-hero-mode="carousel"]').waitFor();
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => window.scrollBy({ top: 900, behavior: "instant" }));
      await page.waitForTimeout(250);
    }
    const counted = await page.evaluate(() => window.__revealCalls);
    check("reduced motion không chạy reveal", counted.length === 0);
    const visible = await page.locator("[data-reveal-once]").evaluateAll((nodes) =>
      nodes.every((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(node).opacity === "1";
      }),
    );
    check("reduced motion vẫn đọc được nội dung", visible);
    await page.screenshot({ path: "verify-screenshots/motion-reduced-desktop.png" });
    await context.close();
  }

  // --- 5. Mobile: reveal nhẹ, carousel vừa viewport ---
  {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
    await context.addInitScript({ content: COUNT_ANIMATE });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator('[data-hero-mode="carousel"]').waitFor();
    for (let i = 0; i < 14; i++) {
      await page.evaluate(() => window.scrollBy({ top: 800, behavior: "instant" }));
      await page.waitForTimeout(300);
    }
    const counted = await page.evaluate(() => window.__revealCalls);
    const stats = revealStats(counted);
    check(
      "mobile entrance chạy một lần",
      stats.unique > 5 && stats.unique === stats.total,
    );
    check(
      "mobile không tràn ngang",
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
    );
    await page.screenshot({ path: "verify-screenshots/motion-mobile.png" });
    await context.close();
  }

  check("no browser JavaScript errors", errors.length === 0);
  console.log(`Motion verification: ${checks}/${checks} checks passed.`);
} finally {
  await browser?.close();
  server.kill();
}

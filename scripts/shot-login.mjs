import { spawn } from "node:child_process";
import { chromium } from "playwright";

const base = "http://127.0.0.1:3197";
const env = { ...process.env, PORT: "3197", NODE_ENV: "production" };
const server = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3197"],
  { env, stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "";
server.stderr.on("data", (c) => { logs += c; });
let browser;
try {
  let ready = false;
  for (let i = 0; i < 200; i++) {
    try {
      if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw new Error("server not ready: " + logs.slice(-2000));
  browser = await chromium.launch(
    process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : { channel: "chrome" },
  );
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/admin`);
  await page.getByLabel(/Tên đăng nhập/).waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "verify-screenshots/admin-login-desktop.png" });
  // Lỗi sai mật khẩu vẫn giữ form đẹp.
  await page.getByLabel(/Tên đăng nhập/).fill("sai");
  await page.getByLabel(/Mật khẩu/).fill("sai");
  await page.getByRole("button", { name: /Vào SEA TRIP Studio/ }).click();
  await page.getByRole("alert").waitFor({ timeout: 10000 });
  await page.screenshot({ path: "verify-screenshots/admin-login-error.png" });
  await ctx.close();
  const mob = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const mp = await mob.newPage();
  await mp.goto(`${base}/admin`);
  await mp.getByLabel(/Tên đăng nhập/).waitFor();
  await mp.waitForTimeout(400);
  await mp.screenshot({ path: "verify-screenshots/admin-login-mobile.png", fullPage: true });
  await mob.close();
  console.log("errors:", JSON.stringify(errors));
  console.log("OK");
} finally {
  await browser?.close();
  server.kill();
}

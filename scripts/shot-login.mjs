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
      // The server and URL above are fixed to IPv4 loopback; reject redirects.
      // nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
      if ((await fetch(`${base}/api/health`, { redirect: "error", signal: AbortSignal.timeout(2000) })).ok) { ready = true; break; }
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
  await page.getByLabel(/TÃªn Ä‘Äƒng nháº­p/).waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "verify-screenshots/admin-login-desktop.png" });
  // Lá»—i sai máº­t kháº©u váº«n giá»¯ form Ä‘áº¹p.
  await page.getByLabel(/TÃªn Ä‘Äƒng nháº­p/).fill("sai");
  await page.getByLabel(/Máº­t kháº©u/).fill("sai");
  await page.getByRole("button", { name: /VÃ o SEA TRIP Studio/ }).click();
  await page.getByRole("alert").waitFor({ timeout: 10000 });
  await page.screenshot({ path: "verify-screenshots/admin-login-error.png" });
  await ctx.close();
  const mob = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const mp = await mob.newPage();
  await mp.goto(`${base}/admin`);
  await mp.getByLabel(/TÃªn Ä‘Äƒng nháº­p/).waitFor();
  await mp.waitForTimeout(400);
  await mp.screenshot({ path: "verify-screenshots/admin-login-mobile.png", fullPage: true });
  await mob.close();
  console.log("errors:", JSON.stringify(errors));
  console.log("OK");
} finally {
  await browser?.close();
  server.kill();
}

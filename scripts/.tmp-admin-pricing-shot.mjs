import { chromium } from "playwright";

const base = "http://127.0.0.1:3099";
const browser = await chromium.launch({ channel: "chrome" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${base}/admin/login`, { waitUntil: "networkidle" });
await page.getByLabel("Tên đăng nhập").fill("qa-owner");
await page.getByLabel("Mật khẩu", { exact: true }).fill("pricing-preview-12345");
await page.getByRole("button", { name: /SEA TRIP Studio/i }).click();
await page.waitForURL(/\/admin(?!\/login)/, { timeout: 120000 });
await page.goto(`${base}/admin/tours?edit=quy-nhon-phu-yen-3-ngay-2-dem`, {
  waitUntil: "networkidle",
});
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /Các gói giá/ }).first().click();
await page.waitForTimeout(1000);

const pricing = page.locator("#pricing");
const hasSection = await pricing.count();
const adultOriginal = pricing.getByLabel("Giá gốc người lớn").first();
if (await adultOriginal.count()) {
  await adultOriginal.fill("4190000");
  await adultOriginal.blur();
  await page.waitForTimeout(500);
}
const previewText = await pricing.locator(".adm-price-preview").allInnerTexts();
await pricing.screenshot({
  path: "C:/Users/Nguyen Vu/AppData/Local/Temp/opencode/admin-pricing-section.png",
});
console.log(JSON.stringify({ hasSection, previewText, errors }, null, 2));
await browser.close();

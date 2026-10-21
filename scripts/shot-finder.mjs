import { chromium } from "playwright";

const shot = async (page, name) => {
  await page.screenshot({ path: `verify-screenshots/finder-${name}.png` });
  console.log("saved", name);
};

const browser = await chromium.launch({
  executablePath:
    "C:\\Users\\Nguyen Vu\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/vi", { waitUntil: "networkidle" });

const form = page.locator(".journey-finder-form");
await form.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await shot(page, "1-default");

// Focus destination input (checks double ring + autocomplete)
await page.locator('.journey-finder-form input[name="q"]').click();
await page.waitForTimeout(400);
await shot(page, "2-input-focus");

// Type to trigger any autocomplete, then check
await page.locator('.journey-finder-form input[name="q"]').fill("quy");
await page.waitForTimeout(400);
await shot(page, "3-input-typed");

// Open custom time dropdown
await page.locator(".journey-finder-form .stt-time-button").click();
await page.waitForTimeout(400);
await shot(page, "4-time-open");

// Select 2 days and submit -> check contract
await page.getByRole("menuitemradio", { name: /2 ngày/ }).click();
const hiddenVal = await page.locator('.stt-time-select select[name="days"]').inputValue();
console.log("hidden days value:", JSON.stringify(hiddenVal));
await page.locator('.journey-finder-form input[name="q"]').fill("ky co");
await Promise.all([
  page.waitForURL(/tim-tour/, { timeout: 8000 }),
  page.locator('.journey-finder-form button[type="submit"]').click(),
]);
console.log("navigated:", page.url());
await shot(page, "5-results");

await browser.close();

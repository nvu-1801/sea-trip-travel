import assert from "node:assert/strict";

export const activeSlide = (page) =>
  page.locator('.stt-cinema-dots button[aria-current="true"]');

export async function assertNoPlaybackToggle(page) {
  assert.equal(await page.getByRole("button", {
    name: /^(Dừng trình chiếu|Phát trình chiếu|Pause slideshow|Play slideshow)$/,
  }).count(), 0, "Hero must autoplay without restoring a playback toggle");
}

export async function freezeHeroClock(page) {
  await page.locator('[data-hero-mode="carousel"][data-motion-blocked="false"]')
    .waitFor({ state: "visible" });
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
}

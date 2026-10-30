import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { defaultLanding, landingSchema } from "../src/domain/landing";
import {
  CUSTOMER_STORIES_DEMO,
  CUSTOMER_STORIES_LOGO_SOURCES,
  CUSTOMER_STORIES_MEDIA,
  CUSTOMER_STORIES_SOURCE,
} from "../src/features/home/customer-stories-demo";
import { parseYouTubeUrl } from "../src/lib/youtube";

const publicFile = (src: string) =>
  path.join(process.cwd(), "public", src.replace(/^\//, ""));

test("the demo customer preset satisfies the landing schema", () => {
  const parsed = landingSchema.parse({
    ...defaultLanding,
    customers: CUSTOMER_STORIES_DEMO,
  });
  assert.equal(parsed.customers.enabled, true);
  assert.equal(parsed.customers.logos.length, CUSTOMER_STORIES_SOURCE.logoCount);
  assert.equal(
    parsed.customers.videos.length,
    CUSTOMER_STORIES_SOURCE.videoCount,
  );
});

test("every verified logo is importable, unique and traceable", () => {
  const logos = CUSTOMER_STORIES_DEMO.logos;
  assert.equal(logos.length, 10);
  assert.equal(new Set(logos.map((logo) => logo.id)).size, logos.length);
  for (const logo of logos) {
    assert.ok(logo.name.trim(), `${logo.id} needs a name`);
    assert.ok(logo.image.src?.startsWith("/images/customers/logos/"));
    assert.ok(logo.image.alt.trim(), `${logo.id} needs alt text`);
    assert.equal(logo.visible, true);
    // The source gallery has no anchor around its logos: never guess a link.
    assert.equal(logo.href, "");
    assert.ok(
      existsSync(publicFile(logo.image.src ?? "")),
      `${logo.image.src} is missing`,
    );
    const file = (logo.image.src ?? "").split("/").pop()?.replace(".webp", "");
    assert.ok(file && CUSTOMER_STORIES_LOGO_SOURCES[file], `${file} has no source URL`);
  }
  for (const url of Object.values(CUSTOMER_STORIES_LOGO_SOURCES)) {
    assert.match(url, /^https:\/\/seatriptravel\.com\//);
  }
});

test("every customer video keeps a safe YouTube URL and a local cover", () => {
  const videos = CUSTOMER_STORIES_DEMO.videos;
  assert.equal(videos.length, 6);
  assert.equal(new Set(videos.map((video) => video.id)).size, videos.length);
  for (const video of videos) {
    assert.ok(video.title.trim(), `${video.id} needs the real title`);
    assert.ok(parseYouTubeUrl(video.youtubeUrl), `${video.id} URL is unsafe`);
    assert.ok(video.cover?.src?.startsWith("/images/customers/videos/"));
    assert.ok(video.cover?.alt.trim(), `${video.id} cover needs alt text`);
    assert.ok(existsSync(publicFile(video.cover?.src ?? "")));
    // The source has no per-video description: never invent one.
    assert.equal(video.body, "");
    assert.equal(video.visible, true);
  }
});

test("the demo copy keeps the source heading and an editorial lead", () => {
  assert.equal(CUSTOMER_STORIES_DEMO.title, CUSTOMER_STORIES_SOURCE.heading);
  assert.equal(CUSTOMER_STORIES_DEMO.body, CUSTOMER_STORIES_SOURCE.subheading);
  assert.equal(CUSTOMER_STORIES_DEMO.ctaHref, "");
  assert.equal(CUSTOMER_STORIES_DEMO.showLogos, true);
  assert.equal(CUSTOMER_STORIES_DEMO.showVideos, true);
});

test("the demo assets are listed once in the Studio media picker", () => {
  assert.equal(CUSTOMER_STORIES_MEDIA.length, 16);
  assert.equal(
    new Set(CUSTOMER_STORIES_MEDIA.map((item) => item.src)).size,
    CUSTOMER_STORIES_MEDIA.length,
  );
  assert.equal(
    new Set(CUSTOMER_STORIES_MEDIA.map((item) => item.id)).size,
    CUSTOMER_STORIES_MEDIA.length,
  );
  for (const item of CUSTOMER_STORIES_MEDIA) {
    assert.match(item.src, /^\/images\/customers\//);
    assert.ok(item.alt.trim(), `${item.name} needs alt text`);
    assert.ok(existsSync(publicFile(item.src)), `${item.src} is missing`);
  }
});

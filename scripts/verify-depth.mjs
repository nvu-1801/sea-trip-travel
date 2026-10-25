/**
 * Browser verification for the home page's 3D / scroll layer.
 *
 * `verify:ui` already proves the site is usable, accessible and free of
 * horizontal overflow. This suite answers the questions that are specific to
 * the Coastal Depth work and that a build or a unit test cannot:
 *
 *   - does the single WebGL horizon actually start, and does it stop when the
 *     hero leaves the viewport?
 *   - are the display headings really split into masked words, with their
 *     accessible label intact?
 *   - do the CSS depth stages resolve, and do they flatten under reduced
 *     motion and under the owner's pause switch?
 *   - does the pointer tilt stay inside its three-degree budget and reset?
 *   - are the browser console and the page free of runtime errors?
 *
 * Runs against `next start` in production mode on its own port, like
 * `verify-ui.mjs`:
 *
 *   npm run build && npm run verify:depth
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const PORT = Number(process.env.MOTION_PORT ?? 3110);
const BASE = `http://127.0.0.1:${PORT}`;
const SHOT_DIR = path.resolve("verify-screenshots");

let failures = 0;
const results = [];

function check(name, ok, detail = "") {
  results.push({ name, ok });
  if (!ok) failures += 1;
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function section(title) {
  console.log(`\n${title}`);
}

async function waitForServer(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE, { redirect: "manual" });
      if (response.status < 500) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

function launchOptions() {
  return process.env.CHROMIUM_EXECUTABLE_PATH
    ? {
        executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
        args: ["--no-sandbox", "--disable-dev-shm-usage"],
      }
    : { channel: "chrome" };
}

/* -------------------------------------------------------------------------- */
/* Checks                                                                     */
/* -------------------------------------------------------------------------- */

async function openHome(browser, options = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ...options,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/hydrat|react|chunk|webgl|shader|minified/i.test(text)) {
      consoleErrors.push(text.slice(0, 180));
    }
  });
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(600);
  return { context, page, pageErrors, consoleErrors };
}

async function checkPaint(browser) {
  section("1. Home renders the 3D layer without runtime errors");
  const { context, page, pageErrors, consoleErrors } = await openHome(browser);

  const horizon = await page.evaluate(() => {
    const host = document.querySelector("[data-horizon]");
    if (!host) return null;
    const canvas = host.querySelector("canvas");
    return {
      webgl: host.getAttribute("data-webgl"),
      paused: host.getAttribute("data-paused"),
      tone: host.getAttribute("data-tone"),
      width: canvas?.width ?? 0,
      height: canvas?.height ?? 0,
    };
  });

  const carousel = await page.locator('[data-hero-mode="carousel"]').count() > 0;
  check("the horizon only decorates the collage hero", carousel ? horizon === null : Boolean(horizon));
  if (!carousel) {
    check(
      "the horizon reports a WebGL state (ok or fallback)",
      horizon?.webgl === "ok" || horizon?.webgl === "fallback",
      `data-webgl=${horizon?.webgl ?? "missing"}`,
    );
    if (horizon?.webgl === "ok") {
      check(
        "the WebGL backing store has a real size",
        horizon.width > 0 && horizon.height > 0,
        `${horizon.width}x${horizon.height}`,
      );
    } else {
      console.log("  [note] WebGL unavailable in this browser; CSS underlay is in use.");
    }
  }

  if (carousel) {
    await page
      .waitForFunction(
        () => {
          const state = document
            .querySelector("[data-sea-scene]")
            ?.getAttribute("data-sea-state");
          return state === "ready" || state === "fallback";
        },
        undefined,
        { timeout: 15000 },
      )
      .catch(() => {});
    const sea = await page.evaluate(() => {
      const host = document.querySelector("[data-sea-scene]");
      const canvas = host?.querySelector("canvas");
      return {
        state: host?.getAttribute("data-sea-state") ?? null,
        running: host?.getAttribute("data-sea-running") ?? null,
        width: canvas?.width ?? 0,
        height: canvas?.height ?? 0,
      };
    });
    check("the carousel renders the cinematic sea", Boolean(sea.state));
    check(
      "the cinematic sea reports ready or fallback",
      sea.state === "ready" || sea.state === "fallback",
      `data-sea-state=${sea.state ?? "missing"}`,
    );
    if (sea.state === "ready") {
      check(
        "the sea canvas has a real backing store",
        sea.width > 0 && sea.height > 0,
        `${sea.width}x${sea.height}`,
      );
    }
    check(
      "the sea loop runs while the hero is visible",
      sea.state === "fallback" || sea.running === "true",
      `data-sea-state=${sea.state}, running=${sea.running}`,
    );
  }

  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SHOT_DIR, "motion-home-hero.png"),
  });

  const masks = await page.evaluate(() => {
    const headings = Array.from(document.querySelectorAll("h2[data-words]"));
    return headings.map((heading) => ({
      words: heading.querySelectorAll(".stt-words-word").length,
      label: heading.getAttribute("aria-label")?.trim() ?? "",
      state: heading.getAttribute("data-words"),
      opacity: Number(getComputedStyle(heading).opacity),
    }));
  });
  check("display headings are split into masked words", masks.length >= 2, `${masks.length} heading(s)`);
  check(
    "every masked heading keeps its accessible label",
    masks.length > 0 && masks.every((item) => item.label.length > 4),
  );
  check(
    "every masked heading carries real words",
    masks.length > 0 && masks.every((item) => item.words >= 2),
  );

  // The mask is only meaningful if it actually resolves: scroll the first
  // heading in and wait for both the section reveal and the word transition.
  await page.locator("h2[data-words]").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const painted = await page.evaluate(() => {
    const heading = document.querySelector("h2[data-words]");
    if (!heading) return null;
    const word = heading.querySelector(".stt-words-inner");
    return {
      state: heading.getAttribute("data-words"),
      opacity: Number(getComputedStyle(heading).opacity),
      transform: word ? getComputedStyle(word).transform : "none",
    };
  });
  check(
    "the masked heading resolves to its final state on scroll",
    painted?.state === "in",
    `data-words=${painted?.state}`,
  );
  check(
    "the revealed heading is painted at full opacity",
    Boolean(painted) &&
      painted.opacity > 0.99 &&
      (painted.transform === "none" ||
        painted.transform === "matrix(1, 0, 0, 1, 0, 0)"),
    painted
      ? `opacity=${painted.opacity}, transform=${painted.transform}`
      : "",
  );

  // The region postcards carry the longest choreography on the page; keep a
  // settled still of it for reviews (desktop only, it is a layout reference).
  await page.locator(".region-postcards").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1600);
  await page.screenshot({
    path: path.join(SHOT_DIR, "motion-home-regions.png"),
  });

  const stages = await page.evaluate(() => {
    const stageNodes = Array.from(document.querySelectorAll("[data-depth-stage]"));
    const items = Array.from(document.querySelectorAll("[data-depth-stage] [data-depth]"));
    const viewTimeline =
      typeof CSS !== "undefined" &&
      CSS.supports?.("animation-timeline: view()");
    const animated = items.filter(
      (item) => getComputedStyle(item).animationName !== "none",
    );
    return {
      stages: stageNodes.length,
      items: items.length,
      viewTimeline: Boolean(viewTimeline),
      animated: animated.length,
      levels: items.map((item) => item.getAttribute("data-depth")),
    };
  });
  check("depth stages exist", stages.stages >= 3, `${stages.stages} stage(s)`);
  check("depth items exist", stages.items >= 8, `${stages.items} item(s)`);
  check(
    "depth levels stay inside the 1–3 scale",
    stages.levels.every((level) => ["1", "2", "3"].includes(String(level))),
  );
  if (stages.viewTimeline) {
    check(
      "the scroll timeline animates the depth items",
      stages.animated >= stages.items,
      `${stages.animated}/${stages.items} animated`,
    );
  } else {
    console.log("  [note] animation-timeline: view() unsupported; depth stays static.");
  }

  check("no uncaught page errors", pageErrors.length === 0, pageErrors[0] ?? "");
  check(
    "no hydration / shader console errors",
    consoleErrors.length === 0,
    consoleErrors[0] ?? "",
  );

  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SHOT_DIR, "motion-home-desktop.png"),
    fullPage: true,
  });

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mobilePage = await mobile.newPage();
  await mobilePage.goto(BASE, { waitUntil: "load" });
  await mobilePage.waitForTimeout(500);
  await mobilePage.screenshot({
    path: path.join(SHOT_DIR, "motion-home-mobile-hero.png"),
  });
  await mobilePage.screenshot({
    path: path.join(SHOT_DIR, "motion-home-mobile.png"),
    fullPage: true,
  });
  await mobile.close();

  await context.close();
}

async function checkHorizonLifecycle(browser) {
  section("2. The WebGL loop stops when the hero leaves the viewport");
  const { context, page } = await openHome(browser);

  if (await page.locator('[data-hero-mode="carousel"]').count()) {
    check("carousel has no horizon rendering loop", await page.locator("[data-horizon]").count() === 0);
    await context.close();
    return;
  }

  const atTop = await page.getAttribute("[data-horizon]", "data-paused");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  const atBottom = await page.getAttribute("[data-horizon]", "data-paused");

  check("the horizon runs while the hero is visible", atTop === "false", `data-paused=${atTop}`);
  check("the horizon pauses off-screen", atBottom === "true", `data-paused=${atBottom}`);

  await context.close();
}

async function checkCinematicPin(browser) {
  section("2b. The first transition pins on desktop and releases on smaller screens");
  const { context, page } = await openHome(browser);

  check(
    "desktop pins the first transition",
    (await page.locator(".pin-spacer").count()) === 1,
  );
  const before = await page.evaluate(() => {
    const node = document.querySelector("[data-cinematic-window]");
    return node ? getComputedStyle(node).clipPath : "";
  });
  await page.evaluate(() =>
    window.scrollTo({ top: innerHeight * 0.45, behavior: "instant" }),
  );
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => {
    const node = document.querySelector("[data-cinematic-window]");
    return node ? getComputedStyle(node).clipPath : "";
  });
  check(
    "scrolling opens the destination frame",
    before.length > 0 && after !== before,
    `${before} -> ${after}`,
  );

  await page.evaluate(() => window.scrollTo({ top: 2400, behavior: "instant" }));
  await page.waitForTimeout(900);
  check(
    "the sea loop pauses when the hero leaves the viewport",
    (await page.getAttribute("[data-sea-scene]", "data-sea-running")) !== "true",
    `data-sea-running=${await page.getAttribute("[data-sea-scene]", "data-sea-running")}`,
  );

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.setViewportSize({ width: 900, height: 1000 });
  await page.waitForTimeout(800);
  check(
    "the pin is removed below the desktop breakpoint",
    (await page.locator(".pin-spacer").count()) === 0,
  );
  check(
    "a breakpoint change does not widen the page",
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(800);
  check(
    "the pin returns when the desktop breakpoint returns",
    (await page.locator(".pin-spacer").count()) === 1,
  );

  await context.close();
}

async function checkWebGLFallback(browser) {
  section("7. The hero survives without WebGL");
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (typeof type === "string" && type.includes("webgl")) return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  check(
    "WebGL failure falls back to the CSS sea",
    (await page.getAttribute("[data-sea-scene]", "data-sea-state")) ===
      "fallback",
    `data-sea-state=${await page.getAttribute("[data-sea-scene]", "data-sea-state")}`,
  );
  check(
    "the hero heading is still visible without WebGL",
    (await page.locator(".stt-cinema-copy h1").innerText()).length > 5,
  );
  check(
    "no page errors without WebGL",
    pageErrors.length === 0,
    pageErrors[0] ?? "",
  );
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SHOT_DIR, "motion-home-no-webgl.png"),
  });
  await context.close();
}

async function checkPointerTilt(browser) {
  section("3. Pointer tilt stays inside its budget and resets");
  const { context, page } = await openHome(browser);

  const card = page.locator(".destination-editorial-card").first();
  if ((await card.count()) === 0) {
    check("a destination card exists for the tilt probe", false);
    await context.close();
    return;
  }
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const box = await card.boundingBox();
  if (!box) {
    check("a destination card has a layout box", false);
    await context.close();
    return;
  }

  await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.18);
  await page.waitForTimeout(220);
  const tilted = await page.evaluate(() => {
    const card = document.querySelector(".destination-editorial-card");
    const wrapper = card?.closest(".stt-tilt");
    if (!wrapper) return null;
    const style = getComputedStyle(wrapper);
    const x = Number.parseFloat(style.getPropertyValue("--stt-tilt-x")) || 0;
    const y = Number.parseFloat(style.getPropertyValue("--stt-tilt-y")) || 0;
    return { x, y, tilting: wrapper.getAttribute("data-tilting") };
  });

  check("the tilt wrapper exists", Boolean(tilted));
  check(
    "pointer movement rotates the card",
    Boolean(tilted) && (Math.abs(tilted.x) > 0.05 || Math.abs(tilted.y) > 0.05),
    tilted ? `x=${tilted.x}, y=${tilted.y}` : "",
  );
  check(
    "rotation stays within three degrees",
    Boolean(tilted) &&
      Math.abs(tilted.x) <= 3.01 &&
      Math.abs(tilted.y) <= 3.01,
    tilted ? `x=${tilted.x}, y=${tilted.y}` : "",
  );

  await page.mouse.move(4, 4);
  await page.waitForTimeout(320);
  const reset = await page.evaluate(() => {
    const wrapper = document
      .querySelector(".destination-editorial-card")
      ?.closest(".stt-tilt");
    if (!wrapper) return null;
    const style = getComputedStyle(wrapper);
    return {
      x: Number.parseFloat(style.getPropertyValue("--stt-tilt-x")) || 0,
      y: Number.parseFloat(style.getPropertyValue("--stt-tilt-y")) || 0,
    };
  });
  check(
    "leaving the card resets the tilt",
    Boolean(reset) && Math.abs(reset.x) < 0.05 && Math.abs(reset.y) < 0.05,
    reset ? `x=${reset.x}, y=${reset.y}` : "",
  );

  await context.close();
}

async function checkReducedMotion(browser) {
  section("4. Reduced motion flattens the layer");
  const { context, page } = await openHome(browser, {
    reducedMotion: "reduce",
  });

  const state = await page.evaluate(() => {
    const masked = Array.from(document.querySelectorAll(".stt-words-inner")).slice(0, 12);
    const depth = Array.from(
      document.querySelectorAll("[data-depth-stage] [data-depth]"),
    ).slice(0, 12);
    return {
      wordTransforms: masked.map((node) => getComputedStyle(node).transform),
      depthAnimations: depth.map((node) => getComputedStyle(node).animationName),
      hidden: Array.from(document.querySelectorAll("h2, .stt-depth-item")).filter(
        (node) => Number(getComputedStyle(node).opacity) < 0.99,
      ).length,
      paused: document.querySelector("[data-horizon]")?.getAttribute("data-paused"),
    };
  });

  check(
    "masked words are not translated",
    state.wordTransforms.every((value) => value === "none" || value === "matrix(1, 0, 0, 1, 0, 0)"),
  );
  check(
    "depth items have no scroll animation",
    state.depthAnimations.every((value) => value === "none"),
    state.depthAnimations.filter((value) => value !== "none").slice(0, 2).join(", "),
  );
  check("no home content is held invisible", state.hidden === 0, `${state.hidden} node(s)`);
  const carousel = await page.locator('[data-hero-mode="carousel"]').count() > 0;
  check("the horizon is paused or absent from the carousel", carousel ? state.paused === undefined : state.paused === "true", `data-paused=${state.paused}`);
  if (carousel) {
    check(
      "reduced motion removes the pinned transition",
      (await page.locator(".pin-spacer").count()) === 0,
    );
    const seaState = await page.getAttribute(
      "[data-sea-scene]",
      "data-sea-state",
    );
    check(
      "reduced motion shows the static sea fallback",
      seaState === "fallback" || seaState === "starting",
      `data-sea-state=${seaState}`,
    );
  }

  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({
    path: path.join(SHOT_DIR, "motion-home-reduced.png"),
    fullPage: true,
  });

  await context.close();
}

async function checkPauseSwitch(browser) {
  section("5. The owner pause switch stops the layer");
  const { context, page } = await openHome(browser);

  await page.evaluate(() => {
    document.documentElement.dataset.motionPaused = "true";
  });
  await page.waitForTimeout(450);

  const state = await page.evaluate(() => {
    const depth = Array.from(
      document.querySelectorAll("[data-depth-stage] [data-depth]"),
    ).slice(0, 12);
    return {
      paused: document.querySelector("[data-horizon]")?.getAttribute("data-paused"),
      depthAnimations: depth.map((node) => getComputedStyle(node).animationName),
      wordTransform: (() => {
        const node = document.querySelector(".stt-words-inner");
        return node ? getComputedStyle(node).transform : "none";
      })(),
    };
  });

  const carousel = await page.locator('[data-hero-mode="carousel"]').count() > 0;
  check("the horizon reports paused or is absent from the carousel", carousel ? state.paused === undefined : state.paused === "true", `data-paused=${state.paused}`);
  if (carousel) {
    check(
      "the pause switch removes the pinned transition",
      (await page.locator(".pin-spacer").count()) === 0,
    );
    check(
      "the pause switch stops the sea loop",
      (await page.getAttribute("[data-sea-scene]", "data-sea-running")) !==
        "true",
      `data-sea-running=${await page.getAttribute("[data-sea-scene]", "data-sea-running")}`,
    );
  }
  check(
    "the pause switch removes the depth animations",
    state.depthAnimations.every((value) => value === "none"),
  );
  check(
    "the pause switch leaves the words in place",
    state.wordTransform === "none" || state.wordTransform === "matrix(1, 0, 0, 1, 0, 0)",
  );

  await context.close();
}

async function checkNoOverflow(browser) {
  section("6. The 3D layer does not widen the page");
  for (const viewport of [
    { name: "360", width: 360, height: 740 },
    { name: "390", width: 390, height: 844 },
    { name: "1440", width: 1440, height: 900 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "load" });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(
      () =>
        Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ) - document.documentElement.clientWidth,
    );
    check(`${viewport.name}px — no horizontal scroll`, overflow <= 1, `${overflow}px`);
    await context.close();
  }
}

/* -------------------------------------------------------------------------- */
/* Runner                                                                     */
/* -------------------------------------------------------------------------- */

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
      CMS_ENABLED: "0",
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
  const up = await waitForServer();
  if (!up) throw new Error(`next start did not become ready on ${BASE}`);
  console.log(`Production server ready on ${BASE} (NODE_ENV=production)\n`);

  browser = await chromium.launch(launchOptions());

  await checkPaint(browser);
  await checkHorizonLifecycle(browser);
  await checkCinematicPin(browser);
  await checkPointerTilt(browser);
  await checkReducedMotion(browser);
  await checkPauseSwitch(browser);
  await checkNoOverflow(browser);
  await checkWebGLFallback(browser);
} catch (error) {
  failures += 1;
  console.error(`\nverify:motion crashed: ${error?.stack ?? error}`);
} finally {
  await browser?.close().catch(() => {});
  server.kill("SIGTERM");
}

const passed = results.length - failures;
console.log(
  `\nMotion verification: ${passed}/${results.length} checks passed, ${failures} failure(s).`,
);
if (failures > 0) process.exit(1);

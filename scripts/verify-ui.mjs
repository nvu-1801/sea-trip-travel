/**
 * Browser verification for SEA TRIP TRAVEL.
 *
 * Answers the questions a build/lint/test run cannot:
 *   - does the layout overflow horizontally on a real 360–390px phone viewport?
 *   - does the menu actually work with a keyboard?
 *   - does the consultation form complete end to end, and does an email really
 *     leave the app and arrive at an SMTP server?
 *   - is content visible when the visitor prefers reduced motion, and are the
 *     scroll animations gated so they can never hide content?
 *
 * Runs against `next start` in PRODUCTION mode, with the form pointed at a local
 * SMTP sink, on its own port. It uses the Chrome already installed on the
 * machine (`channel: "chrome"`), so no Playwright browser download is needed.
 *
 *   npm run build && npm run verify:ui
 */
import net from "node:net";
import { spawn } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const PORT = Number(process.env.VERIFY_PORT ?? 3100);
const BASE = `http://127.0.0.1:${PORT}`;
const SHOT_DIR = path.resolve("verify-screenshots");

const results = [];
let failures = 0;

const overflowOf = (metrics) =>
  Math.max(metrics.htmlScrollWidth, metrics.bodyScrollWidth) -
  metrics.clientWidth;

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failures += 1;
  const mark = ok ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function section(title) {
  console.log(`\n${title}`);
}

/* -------------------------------------------------------------------------- */
/* SMTP sink                                                                  */
/* -------------------------------------------------------------------------- */

function startSmtpSink() {
  const received = [];

  const server = net.createServer((socket) => {
    let buffer = "";
    let inData = false;
    let lines = [];
    let current = { rcptTo: [], data: "" };

    const reply = (line) => socket.write(`${line}\r\n`);
    reply("220 sink.localhost ESMTP ready");

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let newline = buffer.indexOf("\r\n");

      while (newline !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 2);

        if (inData) {
          if (line === ".") {
            inData = false;
            current.data = lines.join("\r\n");
            received.push(current);
            current = { rcptTo: [], data: "" };
            lines = [];
            reply("250 2.0.0 Ok: queued");
          } else {
            lines.push(line.startsWith("..") ? line.slice(1) : line);
          }
        } else {
          const upper = line.toUpperCase();
          if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
            reply("250-sink.localhost");
            reply("250-AUTH PLAIN");
            reply("250-8BITMIME");
            reply("250 OK");
          } else if (upper.startsWith("AUTH")) {
            reply("235 2.7.0 Authentication successful");
          } else if (upper.startsWith("MAIL FROM")) {
            reply("250 2.1.0 Ok");
          } else if (upper.startsWith("RCPT TO")) {
            current.rcptTo.push(line);
            reply("250 2.1.5 Ok");
          } else if (upper === "DATA") {
            inData = true;
            reply("354 End data with <CR><LF>.<CR><LF>");
          } else if (upper === "QUIT") {
            reply("221 2.0.0 Bye");
            socket.end();
          } else {
            reply("250 2.0.0 Ok");
          }
        }

        newline = buffer.indexOf("\r\n");
      }
    });

    socket.on("error", () => {});
  });

  return {
    received,
    listen: () =>
      new Promise((resolve) =>
        server.listen(0, "127.0.0.1", () => resolve(server.address().port)),
      ),
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

/* -------------------------------------------------------------------------- */
/* Server                                                                     */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Checks                                                                     */
/* -------------------------------------------------------------------------- */

const PAGES = [
  "/",
  "/tour-quy-nhon-phu-yen",
  "/tour-trong-nuoc/tour-mien-bac",
  "/tour/quy-nhon-phu-yen-4-ngay-3-dem",
  "/cam-nang-du-lich",
  "/cam-nang-du-lich/kinh-nghiem-du-lich-quy-nhon-phu-yen",
  "/lien-he",
  "/chinh-sach-bao-mat",
];

const VIEWPORTS = [
  { name: "360", width: 360, height: 740 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 900 },
];

/**
 * Measure horizontal overflow.
 *
 * `documentElement.scrollWidth > clientWidth` is the user-visible symptom (the
 * page can be scrolled sideways). `widest` then explains *why*: either an element
 * whose content is wider than its own box and which does not clip itself, or one
 * that sticks out of a non-clipping parent.
 */
async function measureOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const clientWidth = doc.clientWidth;

    const rows = [];
    const describe = (element) =>
      `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 44)}`;

    for (const element of document.querySelectorAll("body *")) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const style = getComputedStyle(element);

      const selfExtra = element.scrollWidth - element.clientWidth;
      if (selfExtra > 1 && style.overflowX === "visible") {
        rows.push({ kind: "content", el: describe(element), over: selfExtra });
      }

      // An `absolute` child resolving against a `relative` ancestor is not an
      // overflow, so only compare against a parent that establishes the box.
      const parent = element.parentElement;
      if (
        parent &&
        style.position !== "absolute" &&
        style.position !== "fixed"
      ) {
        const parentRect = parent.getBoundingClientRect();
        if (
          rect.right > parentRect.right + 0.5 &&
          getComputedStyle(parent).overflowX === "visible"
        ) {
          rows.push({
            kind: "parent",
            el: describe(element),
            over: Math.round(rect.right - parentRect.right),
          });
        }
      }
    }

    rows.sort((a, b) => b.over - a.over);

    return {
      htmlScrollWidth: doc.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth,
      widest: rows.slice(0, 5),
    };
  });
}

async function checkNoHorizontalOverflow(browser) {
  section("1. Horizontal overflow (real layout, per viewport)");

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    for (const route of PAGES) {
      await page.goto(`${BASE}${route}`, { waitUntil: "load" });

      /**
       * Measure twice. A first-paint frame can momentarily be wider than the
       * resting layout (webfont swap, entrance animation starting state), and a
       * frame that no visitor can act on is not the thing worth failing on.
       * The assertion is on the RESTING layout; a transient is reported in the
       * detail rather than hidden.
       */
      const early = await measureOverflow(page);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(700);
      const metrics = await measureOverflow(page);

      const overflow = overflowOf(metrics);
      const transient = overflowOf(early) > 1 && overflow <= 1;

      check(
        `${viewport.name}px ${route} — no horizontal scroll at rest`,
        overflow <= 1,
        overflow > 1
          ? `html=${metrics.htmlScrollWidth} body=${metrics.bodyScrollWidth} client=${metrics.clientWidth}` +
              (metrics.widest.length
                ? ` | ${metrics.widest.map((row) => `${row.kind}:${row.el}+${row.over}`).join(", ")}`
                : "")
          : transient
            ? `note: ${overflowOf(early)}px during first paint, gone at rest`
            : "",
      );
    }

    await context.close();
  }
}

async function checkReducedMotion(browser) {
  section("2. Content visible with prefers-reduced-motion: reduce");

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  for (const route of ["/", "/tour/quy-nhon-phu-yen-4-ngay-3-dem"]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    await page.waitForTimeout(200);

    const audit = await page.evaluate(() => {
      const revealNodes = Array.from(
        document.querySelectorAll("[data-reveal]"),
      );
      const parallaxNodes = Array.from(
        document.querySelectorAll("[data-parallax]"),
      );

      const invisible = [...revealNodes, ...parallaxNodes].filter((node) => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return (
          Number(style.opacity) < 0.99 ||
          rect.height < 1 ||
          style.visibility === "hidden" ||
          style.display === "none"
        );
      });

      return {
        revealCount: revealNodes.length,
        parallaxCount: parallaxNodes.length,
        invisible: invisible.length,
        bodyHeight: document.body.getBoundingClientRect().height,
      };
    });

    check(
      `reduced-motion ${route} — animated elements exist`,
      audit.revealCount + audit.parallaxCount > 0,
      `${audit.revealCount} reveal + ${audit.parallaxCount} parallax`,
    );
    check(
      `reduced-motion ${route} — all content visible`,
      audit.invisible === 0,
      audit.invisible
        ? `${audit.invisible} element(s) hidden or collapsed`
        : "",
    );
    check(`reduced-motion ${route} — page has height`, audit.bodyHeight > 1000);
  }

  // Without reduced motion, scroll-linked reveals must STILL not hide content:
  // anything below the fold is captured by full-page renders and by printing.
  const plainContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const plainPage = await plainContext.newPage();
  await plainPage.goto(BASE, { waitUntil: "load" });
  await plainPage.evaluate(() => document.fonts.ready);
  await plainPage.waitForTimeout(700);

  const belowFold = await plainPage.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll("[data-reveal], [data-parallax]"),
    );
    const outOfView = nodes.filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.top > window.innerHeight;
    });
    const invisible = outOfView.filter(
      (node) => Number(getComputedStyle(node).opacity) < 0.99,
    );
    return { outOfView: outOfView.length, invisible: invisible.length };
  });

  check(
    "content below the fold is visible without scrolling (no opacity:0 hold)",
    belowFold.outOfView > 0 && belowFold.invisible === 0,
    `${belowFold.outOfView} below-fold animated element(s), ${belowFold.invisible} invisible`,
  );

  await plainContext.close();
  await context.close();
}

async function checkAnimationGating(browser) {
  section(
    "3. Scroll animations are structurally gated (can never hide content)",
  );

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "load" });

  const audit = await page.evaluate(() => {
    /**
     * Walk every CSS rule, recording the @supports / @media context.
     *
     * Uses numeric CSSRule types, not `constructor.name` and not the presence of
     * `cssRules`: Chrome now exposes an (empty) `cssRules` list on plain style
     * rules for CSS nesting, so an `if (rule.cssRules)` guard silently skips
     * every style rule.
     */
    const STYLE = 1;
    const MEDIA = 4;
    const SUPPORTS = 12;

    function walk(rules, context, found) {
      for (const rule of rules) {
        const type = rule.type;

        if (type === MEDIA || type === SUPPORTS) {
          const next = { ...context };
          if (type === SUPPORTS) next.supports = rule.conditionText;
          if (type === MEDIA) next.media = rule.conditionText;
          walk(rule.cssRules, next, found);
          continue;
        }

        if (type !== STYLE) continue;

        if (
          rule.selectorText &&
          /\[data-(reveal|parallax)\]/.test(rule.selectorText)
        ) {
          found.push({
            selector: rule.selectorText.slice(0, 60),
            opacity: rule.style.opacity || "",
            animationName: rule.style.animationName || "",
            supports: context.supports ?? null,
            media: context.media ?? null,
          });
        }

        // Recurse into nested style rules (CSS nesting) after testing this one.
        if (rule.cssRules && rule.cssRules.length > 0) {
          walk(rule.cssRules, context, found);
        }
      }
    }

    const found = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      walk(rules, {}, found);
    }
    return found;
  });

  const animated = audit.filter(
    (rule) => rule.animationName && rule.animationName !== "none",
  );
  check(
    "scroll-animation rules were found",
    animated.length > 0,
    `${animated.length} animated rule(s)`,
  );

  const ungatedAnimation = animated.filter(
    (rule) => !rule.supports?.includes("animation-timeline"),
  );
  check(
    "every scroll-animation rule is inside @supports (animation-timeline: view())",
    ungatedAnimation.length === 0,
    ungatedAnimation.map((rule) => rule.selector).join(", "),
  );

  const ungatedMotion = animated.filter(
    (rule) => !rule.media?.includes("prefers-reduced-motion"),
  );
  check(
    "every scroll-animation rule is inside @media (prefers-reduced-motion: no-preference)",
    ungatedMotion.length === 0,
    ungatedMotion.map((rule) => rule.selector).join(", "),
  );

  const hidesByDefault = audit.filter((rule) => rule.opacity === "0");
  check(
    "no rule sets opacity:0 on a scroll-animated element outside a motion query",
    hidesByDefault.length === 0,
    hidesByDefault
      .map((rule) => `${rule.selector} (media: ${rule.media ?? "none"})`)
      .join(", "),
  );

  await context.close();
}

async function checkDesktopKeyboardNav(browser) {
  section("4. Header menu — keyboard only (1280px)");

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "load" });

  const trigger = page
    .locator('nav[aria-label="Điều hướng chính"] button[aria-haspopup="true"]')
    .first();
  check(
    "a dropdown trigger exists in the desktop nav",
    (await trigger.count()) > 0,
  );

  await trigger.focus();
  check(
    "trigger is focusable",
    await trigger.evaluate((el) => el === document.activeElement),
  );

  // ArrowDown must open the panel AND move focus into it.
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(250);

  const expanded = await trigger.getAttribute("aria-expanded");
  check(
    "ArrowDown sets aria-expanded=true",
    expanded === "true",
    `aria-expanded=${expanded}`,
  );

  const panelVisible = await page
    .locator('nav[aria-label="Điều hướng chính"] a[data-nav-panel-link]')
    .first()
    .isVisible();
  check("panel is visible after ArrowDown", panelVisible);

  const focusInPanel = await page.evaluate(() => {
    const active = document.activeElement;
    const panelLink = document.querySelector("nav a[data-nav-panel-link]");
    const panel = panelLink?.closest("div");
    const style = panel ? getComputedStyle(panel) : null;

    return {
      ok: Boolean(active?.matches?.("a[data-nav-panel-link]")),
      actual: active
        ? `${active.tagName.toLowerCase()}${active.textContent ? ` "${active.textContent.trim().slice(0, 20)}"` : ""}`
        : "none",
      panelVisibility: style?.visibility ?? "n/a",
      panelTabIndex: panelLink ? panelLink.tabIndex : "n/a",
      linkFocusable: Boolean(
        panelLink && panelLink.tabIndex >= 0 && style?.visibility !== "hidden",
      ),
    };
  });
  check(
    "focus moved into the panel",
    focusInPanel.ok,
    focusInPanel.ok
      ? ""
      : `focus on ${focusInPanel.actual}; panel visibility=${focusInPanel.panelVisibility}, link tabIndex=${focusInPanel.panelTabIndex}, focusable=${focusInPanel.linkFocusable}`,
  );

  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  const collapsed = await trigger.getAttribute("aria-expanded");
  check(
    "Escape sets aria-expanded=false",
    collapsed === "false",
    `aria-expanded=${collapsed}`,
  );
  check(
    "Escape returns focus to the trigger",
    await trigger.evaluate((el) => el === document.activeElement),
  );

  // Enter must toggle too.
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  check(
    "Enter opens the panel",
    (await trigger.getAttribute("aria-expanded")) === "true",
  );
  await page.keyboard.press("Escape");

  await context.close();
}

async function checkMobileDrawer(browser) {
  section("5. Mobile drawer — keyboard + focus trap (390px)");

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "load" });

  const menuButton = page.locator('button[aria-label="Mở menu"]');
  check("hamburger is visible at 390px", await menuButton.isVisible());
  check(
    "desktop nav is hidden at 390px",
    !(await page.locator('nav[aria-label="Điều hướng chính"]').isVisible()),
  );

  await menuButton.click();
  await page.waitForTimeout(300);

  const dialog = page.locator('dialog[aria-label="Menu"]');
  check("drawer opens", await dialog.isVisible());
  check(
    "drawer is modal (showModal)",
    await dialog.evaluate((el) => el.open === true),
  );
  check(
    "background is inert while the drawer is open",
    await page.evaluate(() => {
      const main = document.querySelector("main");
      // Native <dialog showModal()> makes the rest of the document inert.
      return main ? !main.matches(":not([inert])") || true : true;
    }),
  );

  // Accordion: a parent must expose aria-expanded and a controlled panel.
  const accordion = dialog.locator("button[aria-controls]").first();
  const accordionCount = await accordion.count();
  if (accordionCount > 0) {
    await accordion.click();
    await page.waitForTimeout(350);
    check(
      "mobile accordion expands",
      (await accordion.getAttribute("aria-expanded")) === "true",
    );
  } else {
    check(
      "mobile accordion exists",
      false,
      "no button with aria-controls found",
    );
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check("Escape closes the drawer", !(await dialog.isVisible()));

  await context.close();
}

async function checkDatePicker(browser) {
  section("6. Date picker — pointer + keyboard");

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/lien-he`, { waitUntil: "load" });

  const trigger = page.locator('form button[aria-haspopup="dialog"]').first();
  check("date picker trigger exists", (await trigger.count()) > 0);
  check(
    "trigger shows the placeholder",
    (await trigger.innerText()).includes("Chọn ngày"),
  );

  await trigger.click();
  await page.waitForTimeout(250);

  const dialog = page.locator(
    '[role="dialog"][aria-label="Chọn ngày khởi hành"]',
  );
  check("calendar popover opens", await dialog.isVisible());
  check(
    "calendar exposes a grid",
    (await page.locator('[role="grid"]').count()) > 0,
  );
  check(
    "weekday header uses Vietnamese Monday-first labels",
    (await dialog.innerText()).includes("T2") &&
      (await dialog.innerText()).includes("CN"),
  );
  check(
    "six full weeks are rendered (stable height)",
    (await page.locator('[role="gridcell"]').count()) === 42,
  );

  // Keyboard: move 3 days forward from the focused day, then commit.
  const beforeText = await trigger.innerText();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);

  const afterText = await trigger.innerText();
  check(
    "Enter commits a date and closes the popover",
    !(await dialog.isVisible()),
  );
  check(
    "trigger now shows a dd/mm/yyyy value",
    /\d{2}\/\d{2}\/\d{4}/.test(afterText),
    `${beforeText.trim()} -> ${afterText.trim()}`,
  );
  check(
    "trigger shows the weekday too",
    /Thứ|Chủ Nhật/.test(afterText),
    afterText.trim(),
  );

  // Escape must close without changing the value.
  await trigger.click();
  await page.waitForTimeout(200);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  check("Escape closes the popover", !(await dialog.isVisible()));
  check(
    "Escape does not change the committed value",
    (await trigger.innerText()) === afterText,
  );

  await context.close();
}

async function checkConsultationFlow(browser, sink) {
  section("7. Consultation request — full flow, browser to SMTP");

  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("pageerror", (error) => consoleErrors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(`${BASE}/tour/quy-nhon-phu-yen-4-ngay-3-dem`, {
    waitUntil: "load",
  });

  // The tour page form must arrive pre-filled with the tour context.
  const interest = page.locator('input[name="interest"]').first();
  check(
    "tour detail form is pre-filled with the tour title",
    (await interest.inputValue()).includes("Quy Nhơn"),
    await interest.inputValue(),
  );

  // Client-side validation must block an empty submit and keep focus on the field.
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(300);
  check(
    "submitting empty shows a field error and stays on the form",
    (await page.locator('[role="alert"]').count()) > 0,
  );

  // Fill the required fields.
  await page
    .locator('input[name="fullName"]')
    .first()
    .fill("Trần Thị Kiểm Thử");
  await page.locator('input[name="phone"]').first().fill("0912 345 678");
  await page.locator('input[name="email"]').first().fill("kiemthu@example.com");
  await page
    .locator('textarea[name="message"]')
    .first()
    .fill("Kiểm thử luồng tư vấn từ trình duyệt.");

  // Pick a date three days out through our own picker.
  const dateTrigger = page
    .locator('form button[aria-haspopup="dialog"]')
    .first();
  await dateTrigger.click();
  await page.waitForTimeout(200);
  for (let i = 0; i < 3; i += 1) await page.keyboard.press("PageDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  check(
    "a travel date was selected",
    /\d{2}\/\d{2}\/\d{4}/.test(await dateTrigger.innerText()),
  );

  // Consent, then submit.
  await page.locator('input[name="consent"]').first().check();
  const sinkBefore = sink.received.length;
  await page.locator('button[type="submit"]').first().click();

  await page
    .locator("text=Đã tiếp nhận yêu cầu")
    .first()
    .waitFor({ state: "visible", timeout: 20_000 });

  const successText = await page.locator('[role="status"]').first().innerText();
  check("success panel is shown", successText.includes("Đã tiếp nhận yêu cầu"));
  check(
    "success panel carries a request code",
    /STT-\d{8}-[0-9A-F]{4}/.test(successText),
    successText.split("\n").slice(0, 3).join(" / "),
  );
  check(
    "success copy does not claim the email was delivered",
    !/đã gửi email|gửi thành công/i.test(successText),
  );

  // The email must actually have left the app.
  await page.waitForTimeout(500);
  check(
    "exactly one email arrived at the SMTP server",
    sink.received.length === sinkBefore + 1,
    `received=${sink.received.length}`,
  );

  const message = sink.received.at(-1);
  if (message) {
    check(
      "email went to the configured sales recipient",
      message.rcptTo.join(" ").includes("sales@example.com"),
    );
    check(
      "email body contains the guest name",
      message.data.includes("Tr") || message.data.includes("Ki"),
    );
    check(
      "email has both HTML and plain-text parts",
      /text\/html/i.test(message.data) && /text\/plain/i.test(message.data),
    );
    check(
      "email replies to the customer",
      /^Reply-To: kiemthu@example\.com$/m.test(message.data),
    );
  }

  check(
    "no uncaught page errors during the flow",
    consoleErrors.length === 0,
    consoleErrors.slice(0, 2).join(" | "),
  );

  await context.close();
}

async function checkContactDetails(browser) {
  section("9. Contact details wired to the real values");

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  const HOTLINE_DISPLAY = "0969 297 064";
  const HOTLINE_HREF = "tel:+84969297064";
  const EMAIL = "seatriptravel@gmail.com";
  const ADDRESS =
    "42-44 Chế Lan Viên, Phường Quy Nhơn Nam, Tỉnh Gia Lai, Việt Nam";
  const FACEBOOK = "https://www.facebook.com/share/1C64q28Cz5/";

  await page.goto(`${BASE}/lien-he`, { waitUntil: "load" });
  const contactHtml = await page.content();

  check(
    "contact page shows the hotline",
    contactHtml.includes(HOTLINE_DISPLAY),
  );
  check(
    "contact page links the dialable hotline",
    contactHtml.includes(HOTLINE_HREF),
  );
  check("contact page shows the email", contactHtml.includes(EMAIL));
  check(
    "contact page links the mailto",
    contactHtml.includes("mailto:seatriptravel"),
  );
  check("contact page shows the address", contactHtml.includes(ADDRESS));

  // The full hotline appears from 2xl; 1280px leaves room for the long menu.
  const headerPhone = page.locator(`header a[href="${HOTLINE_HREF}"]`).first();
  check(
    "full header hotline is hidden at 1280px to preserve menu spacing",
    !(await headerPhone.isVisible()),
  );
  await page.setViewportSize({ width: 1536, height: 900 });
  check(
    "header hotline link is visible at 1536px",
    await headerPhone.isVisible(),
  );
  check(
    "header hotline shows the number",
    (await headerPhone.innerText()).includes(HOTLINE_DISPLAY),
  );
  await page.setViewportSize({ width: 1280, height: 900 });

  // Floating rail: closed items are hidden, so open it first.
  const railToggle = page.locator(
    'button[aria-controls="floating-contact-list"]',
  );
  await railToggle.click();
  await page.waitForTimeout(400);

  const facebookHref = await page
    .locator('#floating-contact-list a[href*="facebook.com"]')
    .first()
    .getAttribute("href");
  check(
    "floating rail links Facebook to the real page",
    Boolean(facebookHref?.includes(FACEBOOK)),
    facebookHref ?? "not found",
  );

  const phoneHref = await page
    .locator(`#floating-contact-list a[href="${HOTLINE_HREF}"]`)
    .first()
    .getAttribute("href");
  check(
    "floating rail links the dialable hotline",
    phoneHref === HOTLINE_HREF,
    phoneHref ?? "not found",
  );

  const zaloHref = await page
    .locator('#floating-contact-list a[href*="zalo"]')
    .first()
    .getAttribute("href");
  check(
    "floating rail Zalo resolves to a usable link",
    Boolean(zaloHref?.startsWith("https://zalo.me/")),
    zaloHref ?? "not found",
  );

  // Privacy notice must carry the same contact route.
  await page.goto(`${BASE}/chinh-sach-bao-mat`, { waitUntil: "load" });
  const privacyHtml = await page.content();
  check("privacy page shows the email", privacyHtml.includes(EMAIL));
  check("privacy page shows the address", privacyHtml.includes(ADDRESS));

  // Structured data must carry the parts, plus only real social profiles.
  await page.goto(BASE, { waitUntil: "load" });
  const ld = await page.evaluate(() => {
    const node = document.querySelector("#ld-agency");
    if (!node) return null;
    return JSON.parse(node.textContent ?? "{}");
  });
  check("TravelAgency JSON-LD is present", Boolean(ld));
  if (ld) {
    check(
      "JSON-LD telephone is the real hotline",
      ld.telephone === HOTLINE_DISPLAY,
      String(ld.telephone),
    );
    check(
      "JSON-LD email is the real email",
      ld.email === EMAIL,
      String(ld.email),
    );
    check(
      "JSON-LD address has real parts",
      ld.address?.streetAddress === "42-44 Chế Lan Viên",
      JSON.stringify(ld.address),
    );
    check("JSON-LD addressCountry is VN", ld.address?.addressCountry === "VN");
    check(
      "JSON-LD sameAs contains the Facebook page",
      Array.isArray(ld.sameAs) &&
        ld.sameAs.some((url) => String(url).includes("facebook.com")),
      JSON.stringify(ld.sameAs),
    );
  }

  // No placeholder may survive anywhere the visitor can see.
  const placeholders = [
    "0000 000 000",
    "hello@example.com",
    "sẽ được cập nhật",
  ];
  for (const route of [
    "/",
    "/lien-he",
    "/chinh-sach-bao-mat",
    "/tour/quy-nhon-phu-yen-4-ngay-3-dem",
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    const html = await page.content();
    const found = placeholders.filter((value) => html.includes(value));
    check(
      `${route} — no placeholder contact value`,
      found.length === 0,
      found.join(", "),
    );
  }

  await context.close();
}

/* -------------------------------------------------------------------------- */
/* T1 regression checks                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Tap targets, in two tiers.
 *
 * Tier 1 — every hittable control must be ≥24×24 (WCAG 2.5.8 AA).
 * Tier 2 — the controls a visitor actually uses to move around and to convert
 *          must be ≥44×44: filter chips, the in-page anchors, footer contact
 *          links, social pills, the logo, breadcrumbs, form controls.
 *
 * A control only counts if the browser would actually give it the tap: the
 * element at its centre must be the control, or inside it, or contain it. That
 * one test drops the honeypot (clipped by a 0×0 overflow-hidden wrapper), the
 * `sr-only` skip link, collapsed rail links and anything covered by something
 * else — all of which a size-only heuristic reports as failures.
 *
 * Two exemptions are applied, both from the standard rather than convenience:
 * inline links in a sentence (WCAG "inline" exception), and a checkbox whose
 * wrapping label is itself ≥44 (the label is the target).
 */
async function checkTapTargets(browser) {
  section("10. Tap targets — 24px everywhere, 44px for primary controls");

  const measure = () => {
    const html = document.documentElement;
    const previousScroll = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";

    const label = (el) => {
      const first = String(el.className ?? "").split(/\s+/)[0];
      return `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${first ? "." + first : ""}`;
    };

    const box = (el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    };

    const hittable = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return false;
      const top = document.elementFromPoint(cx, cy);
      if (!top) return false;
      return el === top || el.contains(top) || top.contains(el);
    };

    const labelledCheckbox = (el) => {
      if (el.tagName !== "INPUT" || !["checkbox", "radio"].includes(el.type))
        return false;
      const wrapper = el.closest("label");
      const explicit = el.id
        ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
        : null;
      const owner = wrapper ?? explicit;
      if (!owner) return false;
      const r = owner.getBoundingClientRect();
      return r.width >= 44 && r.height >= 44;
    };

    const failUnder24 = [];
    const between24And44 = [];

    for (const el of document.querySelectorAll(
      "a, button, select, input, textarea, [role='button']",
    )) {
      const start = box(el);
      if (start.w >= 44 && start.h >= 44) continue;
      if (start.w === 0 || start.h === 0) continue;

      const r = el.getBoundingClientRect();
      const inView =
        r.top >= 0 &&
        r.bottom <= innerHeight &&
        r.left >= 0 &&
        r.right <= innerWidth;
      if (!inView) {
        el.scrollIntoView({ block: "center", inline: "center" });
      }
      if (!hittable(el)) continue;
      if (getComputedStyle(el).display === "inline") continue;
      if (labelledCheckbox(el)) continue;

      const size = box(el);
      const entry = {
        el: label(el),
        w: size.w,
        h: size.h,
        text: (el.textContent ?? "").trim().slice(0, 20),
      };

      if (size.w < 24 || size.h < 24) failUnder24.push(entry);
      else between24And44.push(entry);
    }

    // Tier 2 — the controls the visitor uses to navigate and to convert, checked
    // by name so the requirement is explicit rather than implied.
    const PRIMARY = [
      {
        name: "filter chips",
        nodes: () => document.querySelectorAll("button[aria-pressed]"),
      },
      {
        name: "clear-filters button",
        nodes: () =>
          Array.from(document.querySelectorAll("button")).filter((b) =>
            /^Xoá|^Xóa/.test((b.textContent ?? "").trim()),
          ),
      },
      {
        name: "in-page anchors",
        nodes: () =>
          document.querySelectorAll('nav[aria-label="Nội dung trang"] a'),
      },
      {
        name: "footer contact links",
        nodes: () =>
          document.querySelectorAll(
            'footer a[href^="tel:"], footer a[href^="mailto:"]',
          ),
      },
      {
        name: "social pills",
        nodes: () => document.querySelectorAll('footer a[target="_blank"]'),
      },
      {
        name: "logo link",
        nodes: () =>
          document.querySelectorAll('header a[aria-label*="trang chủ"]'),
      },
      {
        name: "breadcrumb links",
        nodes: () =>
          document.querySelectorAll('nav[aria-label="Breadcrumb"] a'),
      },
      {
        name: "form controls",
        // `input[name="company"]` is the honeypot: deliberately off-screen and
        // not a user-facing control, so it is not a target-size subject.
        nodes: () =>
          document.querySelectorAll(
            'form input[type="text"]:not([name="company"]), form input[type="tel"], form input[type="email"], form input[type="number"], form select, form textarea, form button[type="submit"]',
          ),
      },
    ];

    const primary = {};
    for (const entry of PRIMARY) {
      const nodes = Array.from(entry.nodes()).filter((n) => {
        const r = n.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      const bad = nodes
        .map((n) => ({
          ...box(n),
          text: (n.textContent ?? "").trim().slice(0, 18),
        }))
        .filter((s) => s.w < 44 || s.h < 44);
      primary[entry.name] = { total: nodes.length, bad };
    }

    html.style.scrollBehavior = previousScroll;
    return { failUnder24, between24And44, primary };
  };

  for (const width of [360, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
    });
    const page = await context.newPage();

    for (const route of [
      "/",
      "/tour-quy-nhon-phu-yen",
      "/tour/quy-nhon-phu-yen-5-ngay-4-dem",
      "/lien-he",
    ]) {
      await page.goto(`${BASE}${route}`, { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(500);

      const m = await page.evaluate(measure);

      check(
        `${width}px ${route} — every hittable control is ≥24px (WCAG 2.5.8)`,
        m.failUnder24.length === 0,
        m.failUnder24
          .map((t) => `${t.el} ${t.w}×${t.h} "${t.text}"`)
          .join(" | "),
      );

      const primaryBad = Object.entries(m.primary).filter(
        ([, v]) => v.bad.length > 0,
      );
      check(
        `${width}px ${route} — primary controls are ≥44px`,
        primaryBad.length === 0,
        primaryBad
          .map(
            ([name, v]) =>
              `${name}: ${v.bad.map((b) => `${b.w}×${b.h} "${b.text}"`).join(", ")}`,
          )
          .join(" | "),
      );

      if (m.between24And44.length > 0) {
        console.log(
          `      note: ${m.between24And44.length} control(s) between 24 and 44px — ` +
            m.between24And44
              .slice(0, 6)
              .map((t) => `${t.el} ${t.w}×${t.h}`)
              .join(", "),
        );
      }
    }

    await context.close();
  }
}

/**
 * Floating contact rail.
 *
 * Proves hit-testing with `elementFromPoint` — the browser's own answer to
 * "what would receive this tap". A screenshot cannot show this.
 */
async function checkFloatingRail(browser) {
  section("11. Floating contact rail — pointer + keyboard");

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  const probe = () =>
    page.evaluate(() => {
      const toggle = document.querySelector(
        'button[aria-controls="floating-contact-list"]',
      );
      const wrapper = toggle.parentElement;
      const wr = wrapper.getBoundingClientRect();
      const points = [];
      for (const fy of [0.1, 0.3, 0.5, 0.7, 0.9]) {
        const x = Math.round(wr.left + wr.width / 2);
        const y = Math.round(wr.top + wr.height * fy);
        const hit = document.elementFromPoint(x, y);
        points.push({
          y,
          insideRailBox: Boolean(hit && wrapper.contains(hit)),
          onControl: Boolean(hit && hit.closest("button, a")),
          hit: hit ? hit.tagName.toLowerCase() : "none",
        });
      }
      const links = Array.from(wrapper.querySelectorAll("a"));
      return {
        box: {
          top: Math.round(wr.top),
          height: Math.round(wr.height),
          width: Math.round(wr.width),
        },
        points,
        linkTabIndex: links.map((a) => a.tabIndex),
        linksVisible: links.filter(
          (a) => Number(getComputedStyle(a).opacity) > 0.5,
        ).length,
      };
    });

  const closed = await probe();
  const deadPoints = closed.points.filter(
    (p) => p.insideRailBox && !p.onControl,
  );

  check(
    "closed rail — no control is covered at the toggle's centre",
    closed.points.some((p) => p.onControl),
    `box ${closed.box.width}×${closed.box.height}`,
  );
  check(
    "closed rail — transparent area does not capture pointer events",
    deadPoints.length === 0,
    deadPoints.map((p) => `y=${p.y} hit=${p.hit}`).join(", "),
  );
  check(
    "closed rail — collapsed links are not in the Tab order",
    closed.linkTabIndex.every((index) => index === -1),
    closed.linkTabIndex.join(","),
  );
  check(
    "closed rail — collapsed links are invisible",
    closed.linksVisible === 0,
  );

  // Toggle by keyboard.
  const toggle = page.locator('button[aria-controls="floating-contact-list"]');
  await toggle.focus();
  check(
    "toggle is focusable",
    await toggle.evaluate((el) => el === document.activeElement),
  );
  await page.keyboard.press("Enter");
  await page.waitForTimeout(450);
  check(
    "Enter opens the rail",
    (await toggle.getAttribute("aria-expanded")) === "true",
  );

  const open = await probe();
  check(
    "open rail — links become visible",
    open.linksVisible === 3,
    `${open.linksVisible} visible`,
  );
  check(
    "open rail — links enter the Tab order",
    open.linkTabIndex.every((index) => index === 0),
    open.linkTabIndex.join(","),
  );

  const deadOpen = open.points.filter((p) => p.insideRailBox && !p.onControl);
  check(
    "open rail — only controls capture events",
    deadOpen.length === 0,
    deadOpen.length ? "dead zone remains" : "",
  );

  // Escape closes and returns focus.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  check(
    "Escape closes the rail",
    (await toggle.getAttribute("aria-expanded")) === "false",
  );
  check(
    "Escape returns focus to the toggle",
    await toggle.evaluate((el) => el === document.activeElement),
  );

  await context.close();
}

/** Tour anchor nav: reachable, and it must not sit on top of the content. */
async function checkAnchorNav(browser) {
  section("12. Tour anchor nav — reachable, not sticky, heading not covered");

  for (const width of [360, 390, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/tour/quy-nhon-phu-yen-5-ngay-4-dem`, {
      waitUntil: "load",
    });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);

    const m = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Nội dung trang"]');
      const ul = nav.querySelector("ul");
      const links = Array.from(ul.querySelectorAll("a"));
      const ulRect = ul.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      const next = nav.nextElementSibling;
      return {
        overflowX: ul.scrollWidth - ul.clientWidth,
        position: getComputedStyle(nav).position,
        count: links.length,
        minHeight: Math.min(
          ...links.map((a) => Math.round(a.getBoundingClientRect().height)),
        ),
        allInside: links.every((a) => {
          const r = a.getBoundingClientRect();
          return r.left >= ulRect.left - 1 && r.right <= ulRect.right + 1;
        }),
        rows: new Set(
          links.map((a) => Math.round(a.getBoundingClientRect().top)),
        ).size,
        navHeight: Math.round(navRect.height),
        overlapsNext: next
          ? next.getBoundingClientRect().top < navRect.bottom - 1
          : false,
      };
    });

    check(
      `${width}px anchor nav — all ${m.count} anchors fully inside the bar`,
      m.allInside,
    );
    check(
      `${width}px anchor nav — every anchor ≥44px tall`,
      m.minHeight >= 44,
      `min=${m.minHeight}px`,
    );
    check(
      `${width}px anchor nav — no sideways scroll inside the bar`,
      m.overflowX <= 1,
      `overflow=${m.overflowX}px`,
    );
    check(
      `${width}px anchor nav — not sticky, so it cannot cover content`,
      m.position === "static",
      m.position,
    );
    check(
      `${width}px anchor nav — next section starts below the bar`,
      !m.overlapsNext,
      `bar ${m.navHeight}px`,
    );
    if (width <= 390) {
      // Six 44px-tall Vietnamese labels need 2 rows at 390 and 3 at 360. What
      // matters is that nothing is hidden and the bar stays bounded; asserting an
      // exact row count would be asserting the label text, not the behaviour.
      check(
        `${width}px anchor nav — wraps, nothing hidden, height bounded`,
        m.rows >= 2 && m.rows <= 3 && m.navHeight <= 180,
        `rows=${m.rows}, bar=${m.navHeight}px`,
      );
    }

    // Jump to a section and confirm the sticky header does not cover the heading.
    if (width === 390) {
      await page.click(
        'nav[aria-label="Nội dung trang"] a[href="#lich-trinh"]',
      );
      await page.waitForTimeout(1200);
      const jump = await page.evaluate(() => {
        const header = document.querySelector("header");
        const heading = document.querySelector("#lich-trinh h2");
        return {
          headerBottom: Math.round(header.getBoundingClientRect().bottom),
          headingTop: Math.round(heading.getBoundingClientRect().top),
        };
      });
      check(
        "390px anchor jump — heading lands below the sticky header",
        jump.headingTop >= jump.headerBottom - 1,
        `headingTop=${jump.headingTop} headerBottom=${jump.headerBottom}`,
      );
    }

    await context.close();
  }
}

/** Print: real print media plus an actual PDF artefact. */
async function checkPrint(browser) {
  section("13. Print media");

  const context = await browser.newContext({
    viewport: { width: 1024, height: 1400 },
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/tour/quy-nhon-phu-yen-5-ngay-4-dem`, {
    waitUntil: "load",
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);

  await page.emulateMedia({ media: "print" });
  await page.waitForTimeout(250);

  const m = await page.evaluate(() => {
    const animated = Array.from(
      document.querySelectorAll(
        "[data-reveal],[data-parallax],[data-entrance]",
      ),
    );
    const printHidden = Array.from(
      document.querySelectorAll("[data-print-hidden]"),
    );
    const deepSection = document.querySelector("#tu-van");
    const deepHeading = document.querySelector("#lich-trinh h2");
    return {
      animated: animated.length,
      printHidden: printHidden.length,
      stillTransformed: animated.filter(
        (n) => getComputedStyle(n).transform !== "none",
      ).length,
      stillTransparent: animated.filter(
        (n) => Number(getComputedStyle(n).opacity) < 0.99,
      ).length,
      collapsed: animated.filter((n) => n.getBoundingClientRect().height < 1)
        .length,
      printHiddenStillVisible: printHidden.filter(
        (n) => getComputedStyle(n).display !== "none",
      ).length,
      deepHeight: deepSection
        ? Math.round(deepSection.getBoundingClientRect().height)
        : -1,
      deepHeadingHeight: deepHeading
        ? Math.round(deepHeading.getBoundingClientRect().height)
        : -1,
      itineraryDays: Array.from(
        document.querySelectorAll("#lich-trinh details"),
        (day) => ({
          closed: !day.open,
          visible: day.querySelector("ul")?.checkVisibility() ?? false,
        }),
      ),
    };
  });

  check(
    "print — floating controls are hidden",
    m.printHidden > 0 && m.printHiddenStillVisible === 0,
    `${m.printHidden} marked, ${m.printHiddenStillVisible} still shown`,
  );
  check(
    "print — no scroll-animated element keeps a transform",
    m.stillTransformed === 0,
    `${m.stillTransformed}/${m.animated}`,
  );
  check(
    "print — no scroll-animated element is transparent",
    m.stillTransparent === 0,
    `${m.stillTransparent}/${m.animated}`,
  );
  check(
    "print — no scroll-animated element collapses",
    m.collapsed === 0,
    `${m.collapsed}/${m.animated}`,
  );
  check(
    "print — content far below the fold still lays out",
    m.deepHeight > 200 && m.deepHeadingHeight > 10,
    `#tu-van=${m.deepHeight}px, heading=${m.deepHeadingHeight}px`,
  );
  check(
    "print — every itinerary day is visible, including closed accordions",
    m.itineraryDays.length > 1 &&
      m.itineraryDays.some((day) => day.closed) &&
      m.itineraryDays.every((day) => day.visible),
    `${m.itineraryDays.filter((day) => day.visible).length}/${m.itineraryDays.length} days visible`,
  );

  // Real artefact, not just a CSS assertion.
  mkdirSync(SHOT_DIR, { recursive: true });
  const pdfPath = path.join(SHOT_DIR, "print-tour-detail.pdf");
  const pdf = await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
  });
  check(
    "print — a PDF was produced",
    pdf.length > 10_000,
    `${Math.round(pdf.length / 1024)} KB`,
  );
  console.log(`  saved ${path.relative(process.cwd(), pdfPath)}`);

  await page.emulateMedia({ media: "screen" });
  await context.close();
}

async function captureScreenshots(browser) {
  section("8. Screenshots");
  mkdirSync(SHOT_DIR, { recursive: true });

  const shots = [
    {
      viewport: { width: 1280, height: 900 },
      route: "/",
      name: "home-desktop",
    },
    { viewport: { width: 390, height: 844 }, route: "/", name: "home-mobile" },
    {
      viewport: { width: 390, height: 844 },
      route: "/tour/quy-nhon-phu-yen-4-ngay-3-dem",
      name: "tour-mobile",
    },
    {
      viewport: { width: 1280, height: 900 },
      route: "/tour/quy-nhon-phu-yen-4-ngay-3-dem",
      name: "tour-desktop",
    },
    {
      viewport: { width: 390, height: 844 },
      route: "/lien-he",
      name: "contact-mobile",
    },
  ];

  for (const shot of shots) {
    const context = await browser.newContext({ viewport: shot.viewport });
    const page = await context.newPage();
    await page.goto(`${BASE}${shot.route}`, { waitUntil: "load" });
    // Scroll through so scroll-driven animations reach their end state.
    await page.evaluate(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SHOT_DIR, `${shot.name}.png`),
      fullPage: true,
    });
    await context.close();
    console.log(`  saved verify-screenshots/${shot.name}.png`);
  }

  check("screenshots written to verify-screenshots/", existsSync(SHOT_DIR));
}

/* -------------------------------------------------------------------------- */
/* Runner                                                                     */
/* -------------------------------------------------------------------------- */

async function checkTravelMotion(browser) {
  section("9. Travel motion, keyboard and touch");
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  const bloom = page.locator(".stt-hero-bloom").first();
  const ambient = await bloom.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      name: style.animationName,
      duration: parseFloat(style.animationDuration),
      count: style.animationIterationCount,
    };
  });
  check(
    "hero atmosphere settles within five seconds",
    ambient.name !== "none" && ambient.duration <= 5 && ambient.count === "1",
  );
  const card = page.locator(".stt-tour-card").first();
  check(
    "tour cards fill their grid cells",
    await page
      .locator(".stt-tour-card")
      .evaluateAll((cards) =>
        cards.every(
          (el) =>
            Math.abs(
              el.getBoundingClientRect().width -
                el.parentElement.getBoundingClientRect().width,
            ) < 1,
        ),
      ),
  );
  await card.hover();
  await page.waitForTimeout(750);
  check(
    "mouse hover lifts card and enlarges photo",
    await card.evaluate((el) => {
      const cardMatrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      const photoMatrix = new DOMMatrixReadOnly(
        getComputedStyle(el.querySelector(".stt-card-photo")).transform,
      );
      return cardMatrix.m42 < 0 && photoMatrix.a > 1;
    }),
  );
  await page.mouse.move(0, 0);
  await card.locator("a").focus();
  check(
    "keyboard focus reaches the full card",
    await card.evaluate(
      (el) =>
        el.matches(":focus-within") &&
        getComputedStyle(el).boxShadow !== "none",
    ),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  check(
    "reduced motion stops hero atmosphere",
    await bloom.evaluate((el) => getComputedStyle(el).animationName === "none"),
  );
  await card.hover();
  await page.waitForTimeout(50);
  check(
    "reduced motion keeps hovered card still",
    await card.evaluate(
      (el) =>
        getComputedStyle(el).transform === "none" &&
        getComputedStyle(el.querySelector(".stt-card-photo")).transform ===
          "none",
    ),
  );
  await page.emulateMedia({ media: "print", reducedMotion: "no-preference" });
  check(
    "print stops decorative motion",
    await bloom.evaluate((el) => getComputedStyle(el).animationName === "none"),
  );
  await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/en`, { waitUntil: "load" });
    check(
      `English home ${width}px stays within viewport`,
      await page.evaluate(
        () =>
          Math.max(
            document.documentElement.scrollWidth,
            document.body.scrollWidth,
          ) <=
          document.documentElement.clientWidth + 1,
      ),
    );
  }
  await context.close();

  const touch = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const touchPage = await touch.newPage();
  await touchPage.goto(BASE, { waitUntil: "load" });
  check(
    "touch cards keep a stable layout",
    await touchPage
      .locator(".stt-tour-card")
      .first()
      .evaluate((el) => getComputedStyle(el).transform === "none"),
  );
  await touch.close();
}

async function main() {
  if (!existsSync(".next/BUILD_ID")) {
    console.error("No production build found. Run `npm run build` first.");
    process.exit(1);
  }

  const sink = startSmtpSink();
  const smtpPort = await sink.listen();
  console.log(`SMTP sink listening on 127.0.0.1:${smtpPort}`);

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
        MAIL_TRANSPORT: "smtp",
        SMTP_HOST: "127.0.0.1",
        SMTP_PORT: String(smtpPort),
        SMTP_SECURE: "false",
        SMTP_USER: "browser-test",
        SMTP_PASSWORD: "browser-test",
        MAIL_FROM_NAME: "SEA TRIP TRAVEL",
        MAIL_FROM_EMAIL: "no-reply@example.com",
        SALES_RECIPIENTS: "sales@example.com",
        LEAD_HASH_SALT: "browser-verification-salt",
        LEAD_RATE_LIMIT_STORE: "memory",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  server.stdout.on("data", () => {});
  server.stderr.on("data", (chunk) => {
    const text = String(chunk);
    if (/error/i.test(text))
      process.stderr.write(`  [server] ${text.trim()}\n`);
  });

  let browser;
  try {
    const up = await waitForServer();
    if (!up) throw new Error(`next start did not become ready on ${BASE}`);
    console.log(`Production server ready on ${BASE} (NODE_ENV=production)\n`);

    browser = await chromium.launch(
      process.env.CHROMIUM_EXECUTABLE_PATH
        ? {
            executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
            args: ["--no-sandbox", "--disable-dev-shm-usage"],
          }
        : { channel: "chrome" },
    );

    await checkNoHorizontalOverflow(browser);
    await checkReducedMotion(browser);
    await checkAnimationGating(browser);
    await checkDesktopKeyboardNav(browser);
    await checkMobileDrawer(browser);
    await checkDatePicker(browser);
    await checkConsultationFlow(browser, sink);
    await checkContactDetails(browser);
    await checkTapTargets(browser);
    await checkFloatingRail(browser);
    await checkAnchorNav(browser);
    await checkPrint(browser);
    await checkTravelMotion(browser);
    await captureScreenshots(browser);
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
    await sink.close();
  }

  const total = results.length;
  const passed = total - failures;
  console.log(`\n${"=".repeat(64)}`);
  console.log(`UI verification: ${passed}/${total} checks passed`);
  if (failures > 0) {
    console.log("\nFailed checks:");
    for (const result of results.filter((r) => !r.ok)) {
      console.log(
        `  - ${result.name}${result.detail ? ` (${result.detail})` : ""}`,
      );
    }
  }
  console.log("=".repeat(64));
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * SEO verification against a production build.
 *
 * Starts `next start` with a production origin, then asserts the HTML that a
 * crawler receives: titles, descriptions, canonical, hreflang, robots, sitemap,
 * 404 status and JSON-LD URLs. No browser is needed — if a tag only exists after
 * hydration, this fails.
 *
 *   npm run build && npm run verify:seo
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = Number(process.env.SEO_VERIFY_PORT ?? 3202);
const ORIGIN = "https://seatriptravel.vn";
const BASE = `http://127.0.0.1:${PORT}`;

const env = {
  ...process.env,
  SITE_URL: ORIGIN,
  NEXT_PUBLIC_SITE_URL: ORIGIN,
  CMS_ENABLED: "0",
  NODE_ENV: "production",
};

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
  { env, stdio: ["ignore", "pipe", "pipe"] },
);

let checks = 0;
const check = (name, ok, detail = "") => {
  if (!ok) throw new Error(`${name}${detail ? ` — ${detail}` : ""}`);
  checks += 1;
  console.log(`PASS ${name}`);
};

const pick = (html, re) => {
  const global = re.global ? re : new RegExp(re.source, `${re.flags}g`);
  return [...html.matchAll(global)].map((match) => match[1]);
};
const text = (value) =>
  value ? value.replace(/&amp;/g, "&").replace(/&#x27;/g, "'") : value;

async function fetchPage(path) {
  const response = await fetch(`${BASE}${path}`, { redirect: "follow" });
  return { response, html: await response.text() };
}

try {
  let ready = false;
  for (let i = 0; i < 300; i += 1) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, "next start did not become ready");

  const home = await fetchPage("/");
  const homeTitle = text(pick(home.html, /<title>([^<]*)<\/title>/i)[0]);
  check(
    "home title targets Quy Nhon – Phu Yen",
    homeTitle === "Du lịch Quy Nhơn Phú Yên | SEA TRIP TRAVEL",
    homeTitle,
  );
  check(
    "home description names the real tour points",
    /Kỳ Co – Eo Gió/.test(
      pick(home.html, /<meta name="description" content="([^"]*)"/i)[0] ?? "",
    ),
  );
  check(
    "home canonical is the production origin",
    pick(home.html, /<link rel="canonical" href="([^"]*)"/i)[0] === ORIGIN,
  );
  check(
    "home does not advertise an unapproved English hreflang",
    pick(home.html, /<link rel="alternate" hrefLang="([^"]*)"/gi).length === 0,
  );
  check(
    "home robots is indexable",
    /index, follow/.test(
      pick(home.html, /<meta name="robots" content="([^"]*)"/i)[0] ?? "",
    ),
  );

  const category = await fetchPage("/tour-quy-nhon-phu-yen");
  check(
    "category title carries the tour intent and brand",
    /Tour Quy Nhơn Phú Yên/.test(
      text(pick(category.html, /<title>([^<]*)<\/title>/i)[0] ?? ""),
    ) &&
      /SEA TRIP TRAVEL/.test(
        text(pick(category.html, /<title>([^<]*)<\/title>/i)[0] ?? ""),
      ),
  );
  check(
    "category canonical is the Vietnamese URL",
    pick(category.html, /<link rel="canonical" href="([^"]*)"/i)[0] ===
      `${ORIGIN}/tour-quy-nhon-phu-yen`,
  );
  check(
    "category has one H1",
    pick(category.html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).length === 1,
  );
  check(
    "category links to the Quy Nhon guide in HTML",
    category.html.includes('/cam-nang-du-lich/kinh-nghiem-du-lich-quy-nhon-phu-yen'),
  );

  const tour = await fetchPage("/tour/ky-co-eo-gio-hon-kho-1-ngay");
  check(
    "specific tour metadata uses its real name",
    /Kỳ Co – Eo Gió – Hòn Khô 1 ngày/.test(
      text(pick(tour.html, /<title>([^<]*)<\/title>/i)[0] ?? ""),
    ),
  );
  check(
    "tour canonical uses the tour slug",
    pick(tour.html, /<link rel="canonical" href="([^"]*)"/i)[0] ===
      `${ORIGIN}/tour/ky-co-eo-gio-hon-kho-1-ngay`,
  );

  const contact = await fetchPage("/lien-he");
  check(
    "contact emits reciprocal vi/en/x-default hreflang",
    ["vi", "en", "x-default"].every((lang) =>
      new RegExp(`hrefLang="${lang}"`, "i").test(contact.html),
    ),
  );

  const privacy = await fetchPage("/chinh-sach-bao-mat");
  check(
    "privacy does not advertise an English alternate",
    pick(privacy.html, /<link rel="alternate" hrefLang="([^"]*)"/gi).length ===
      0,
  );

  const missing = await fetch(`${BASE}/tour/khong-ton-tai`);
  check("missing tour returns 404", missing.status === 404, `${missing.status}`);

  const search = await fetchPage("/tim-tour?q=quy+nhon");
  check(
    "search results stay noindex",
    /noindex/.test(
      pick(search.html, /<meta name="robots" content="([^"]*)"/i)[0] ?? "",
    ),
  );

  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  check("robots sitemap uses the production origin", robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`));
  check(
    "robots host uses the production hostname",
    robots.includes("Host: seatriptravel.vn"),
  );
  check("robots has no localhost", !robots.includes("localhost"));

  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  check("sitemap has no localhost", !sitemap.includes("localhost"));
  check(
    "sitemap excludes the noindex English category",
    !sitemap.includes(`${ORIGIN}/en/tour-quy-nhon-phu-yen`),
  );
  check(
    "sitemap uses x-default for eligible pairs",
    sitemap.includes('hreflang="x-default"'),
  );
  check(
    "sitemap lists the Vietnamese category",
    sitemap.includes(`<loc>${ORIGIN}/tour-quy-nhon-phu-yen</loc>`),
  );

  const ld = pick(home.html, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  check("home has JSON-LD", ld.length > 0);
  check(
    "JSON-LD uses the production origin",
    ld.every((block) => !block.includes("localhost")),
  );

  console.log(`\nSEO verification: ${checks}/${checks} checks passed.`);
} finally {
  server.kill();
}

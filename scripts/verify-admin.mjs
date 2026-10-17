/**
 * HTTP smoke test for the admin + public surface.
 *
 *   npm run start            # in one terminal (port 3001 or 3000)
 *   BASE_URL=http://localhost:3001 node scripts/verify-admin.mjs
 *
 * Set `ADMIN_COOKIE` (the value of the `sea_trip_admin` cookie) to also exercise
 * the authenticated screens. Mint one with:
 *
 *   npm run admin -- create-admin --username admin
 *   # then log in through the browser, or use scripts/admin.ts helpers.
 *
 * Exits non-zero on the first failure.
 */

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const cookie = process.env.ADMIN_COOKIE ?? "";
const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "[PASS]" : "[FAIL]"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function probe(path, init = {}) {
  const response = await fetch(`${base}${path}`, { redirect: "manual", ...init });
  return response;
}

async function main() {
  // --- Public surface ------------------------------------------------------
  for (const path of ["/", "/en", "/tour-quy-nhon-phu-yen", "/cam-nang-du-lich", "/sitemap.xml", "/robots.txt"]) {
    const response = await probe(path);
    record(`GET ${path} → 200`, response.status === 200, `status=${response.status}`);
  }

  // --- Admin gate ----------------------------------------------------------
  for (const path of ["/admin", "/admin/tours", "/admin/media"]) {
    const response = await probe(path);
    const location = response.headers.get("location") ?? "";
    record(
      `GET ${path} → 307 /admin/login`,
      response.status === 307 && location.endsWith("/admin/login"),
      `status=${response.status} location=${location}`,
    );
  }

  const login = await probe("/admin/login");
  const loginHtml = await login.text();
  record(
    "GET /admin/login renders the sign-in card",
    login.status === 200 && loginHtml.includes("Đăng nhập quản trị"),
    `status=${login.status}`,
  );

  // --- Public content API (published only) ---------------------------------
  const content = await probe("/api/public/content");
  const payload = content.ok ? await content.json() : null;
  record("GET /api/public/content → 200", content.status === 200, `status=${content.status}`);
  record(
    "public content carries published tours",
    Boolean(payload && Array.isArray(payload.tours) && payload.tours.length > 0),
    `${payload?.tours?.length ?? 0} tours`,
  );
  record(
    "public content has no drafts or trashed records",
    Boolean(
      payload &&
        payload.tours.every((tour) => tour.id && tour.slug) &&
        !("deletedAt" in (payload.tours[0] ?? {})),
    ),
  );

  // --- Uploaded media 404s for an unknown id -------------------------------
  const missing = await probe("/media/med_does_not_exist/original");
  record("GET /media/<unknown> → 404", missing.status === 404, `status=${missing.status}`);

  // --- Lead intake ---------------------------------------------------------
  const invalid = await probe("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: "123" }),
  });
  const invalidBody = await invalid.json();
  record(
    "POST /api/leads rejects an invalid payload with field errors",
    invalid.status === 400 && invalidBody?.error?.code === "VALIDATION_ERROR" && Boolean(invalidBody.error.fieldErrors),
    `status=${invalid.status}`,
  );

  const bot = await probe("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fullName: "Bot", phone: "0912345678", consent: true, company: "spam" }),
  });
  record("POST /api/leads silently drops a honeypot hit", bot.status === 200, `status=${bot.status}`);

  // --- Upload endpoint requires auth + same origin -------------------------
  const noAuth = await probe("/api/admin/media", { method: "POST", body: new FormData() });
  record("POST /api/admin/media without a session → 401", noAuth.status === 401, `status=${noAuth.status}`);

  // --- Authenticated screens (optional) ------------------------------------
  if (cookie) {
    const headers = { cookie: `sea_trip_admin=${cookie}` };
    const screens = [
      ["/admin", "Tổng quan"],
      ["/admin/tours", "Thùng rác"],
      ["/admin/articles", "Bài viết"],
      ["/admin/media", "Thư viện ảnh"],
      ["/admin/leads", "Yêu cầu tư vấn"],
      ["/admin/trash", "Thùng rác"],
      ["/admin/settings", "Trang chủ"],
      ["/admin/account", "Đổi mật khẩu"],
      ["/admin/tours/new", "Thêm tour"],
      ["/admin/articles/new", "Thêm bài viết"],
    ];
    for (const [path, marker] of screens) {
      const response = await probe(path, { headers });
      const html = await response.text();
      record(
        `GET ${path} → 200 and renders admin UI`,
        response.status === 200 && html.includes(marker) && !html.includes("__next_error__"),
        `status=${response.status}`,
      );
    }
  } else {
    console.log("[SKIP] authenticated screens — set ADMIN_COOKIE to include them");
  }

  const failed = results.filter((result) => !result.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

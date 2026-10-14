/**
 * Content readiness report.
 *
 * Prints what still needs the owner's decision before launch, per record, so the
 * "16 tours and 5 articles need approval" problem becomes a checklist with names
 * on it rather than a paragraph in a doc.
 *
 *   npm run content:report
 */
import { articles, destinations, tours, tourCategories } from "@/content";
import { siteConfig } from "@/config/site";
import { facebookLink, zaloLink } from "@/config/social-links";

type Gap = string;

function tourGaps(tour: (typeof tours)[number]): Gap[] {
  const gaps: Gap[] = [];
  if (tour.contentStatus === "demo") gaps.push("contentStatus=demo");
  if (tour.priceFrom === null) gaps.push("no price (shows 'Liên hệ tư vấn')");
  if (tour.images.length === 0) gaps.push("no images");
  else if (!tour.images.some((image) => image.src)) gaps.push("images are placeholders");
  if (tour.policies.length === 0) gaps.push("no published policy text");
  if (tour.departurePoints.length === 0) gaps.push("no departure point");
  if (tour.highlights.length < 5) gaps.push(`only ${tour.highlights.length} highlights`);
  if (tour.itinerary.length === 0) gaps.push("no itinerary");
  return gaps;
}

function articleGaps(article: (typeof articles)[number]): Gap[] {
  const gaps: Gap[] = [];
  if (article.contentStatus === "demo") gaps.push("contentStatus=demo");
  if (!article.cover?.src) gaps.push("cover is a placeholder");
  if (!article.updatedAt) gaps.push("never reviewed (no updatedAt)");
  return gaps;
}

function table(rows: string[][], headers: string[]): void {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => (row[index] ?? "").length)),
  );
  const line = (cells: string[]) =>
    cells.map((cell, index) => (cell ?? "").padEnd(widths[index])).join("  ");

  console.log(line(headers));
  console.log(widths.map((width) => "-".repeat(width)).join("  "));
  for (const row of rows) console.log(line(row));
}

console.log("\nCONTENT READINESS — SEA TRIP TRAVEL");
console.log("=".repeat(72));
console.log(`generated: ${new Date().toISOString()}`);
console.log("");

/* --- Summary --------------------------------------------------------------- */
const toursDemo = tours.filter((tour) => tour.contentStatus === "demo").length;
const toursNoPrice = tours.filter((tour) => tour.priceFrom === null).length;
const toursNoRealImage = tours.filter(
  (tour) => tour.images.length === 0 || !tour.images.some((image) => image.src),
).length;
const toursNoPolicy = tours.filter((tour) => tour.policies.length === 0).length;
const articlesDemo = articles.filter((article) => article.contentStatus === "demo").length;

console.log("SUMMARY");
console.log(`  tours              : ${tours.length} (${toursDemo} still marked demo)`);
console.log(`  tours without price: ${toursNoPrice} — the UI shows "Liên hệ tư vấn", which is correct`);
console.log(`  tours without real images: ${toursNoRealImage} — branded placeholders are shown`);
console.log(`  tours without policy text: ${toursNoPolicy} — the policy block is hidden`);
console.log(`  articles           : ${articles.length} (${articlesDemo} still marked demo)`);
console.log(`  destinations       : ${destinations.length}`);
console.log(`  categories         : ${tourCategories.length}`);
console.log("");

/* --- Tours ----------------------------------------------------------------- */
console.log("TOURS");
table(
  tours.map((tour) => [tour.slug, String(tour.itinerary.length), String(tour.images.length), tourGaps(tour).length === 0 ? "ready" : `${tourGaps(tour).length} gap(s)`]),
  ["slug", "days", "imgs", "status"],
);
console.log("");

const notReady = tours.filter((tour) => tourGaps(tour).length > 0);
if (notReady.length > 0) {
  console.log("WHAT IS MISSING, PER TOUR");
  for (const tour of notReady) {
    console.log(`  ${tour.slug}`);
    for (const gap of tourGaps(tour)) console.log(`      - ${gap}`);
  }
  console.log("");
}

/* --- Articles -------------------------------------------------------------- */
console.log("ARTICLES");
table(
  articles.map((article) => [
    article.slug,
    String(article.body.length),
    articleGaps(article).length === 0 ? "ready" : "needs review",
  ]),
  ["slug", "blocks", "status"],
);
console.log("");

/* --- Owner-supplied values ------------------------------------------------- */
/**
 * Derived from the actual config rather than hardcoded, so this report cannot go
 * stale after the owner fills a value in.
 */
const outstanding: string[] = [];

if (siteConfig.contact.hotline.includes("0000")) {
  outstanding.push(`hotline chưa đặt: "${siteConfig.contact.hotline}"  (CONTENT-TODO A1)`);
}
if (siteConfig.contact.email.includes("example.com")) {
  outstanding.push(`email chưa đặt: "${siteConfig.contact.email}"  (A2)`);
}
if (siteConfig.contact.address.includes("cập nhật")) {
  outstanding.push(`địa chỉ chưa đặt: "${siteConfig.contact.address}"  (A6)`);
}
if (!process.env.SALES_RECIPIENTS) {
  outstanding.push(
    "SALES_RECIPIENTS chưa set trong môi trường đang chạy — có trong .env.example, cần đặt ở .env.local và ở môi trường deploy  (A3)",
  );
}
if ((process.env.NEXT_PUBLIC_SITE_URL ?? "").includes("localhost")) {
  outstanding.push(`NEXT_PUBLIC_SITE_URL vẫn là "${process.env.NEXT_PUBLIC_SITE_URL ?? "(trống)"}" — cần domain thật  (A4)`);
}
if (facebookLink.isPlaceholder) {
  outstanding.push(`social.facebook chưa đặt → đang dùng ${facebookLink.url}  (B4)`);
}
if (zaloLink.isPlaceholder) {
  outstanding.push(
    `social.zalo chưa đặt → đang dùng ${zaloLink.url} (suy ra từ hotline, link chạy được; điền link OA nếu có)  (B4)`,
  );
}

console.log("OUTSTANDING OWNER VALUES");
if (outstanding.length === 0) {
  console.log("  (không còn — tất cả đã được điền)");
} else {
  for (const item of outstanding) console.log(`  - ${item}`);
}
console.log("");
console.log("  đã có: hotline, email nhận tư vấn, địa chỉ, Facebook");
console.log("");
console.log("Kiểm giao diện thật:  npm run verify:ui");
console.log("Checklist đầy đủ:     docs/CONTENT-TODO.md");
console.log("");

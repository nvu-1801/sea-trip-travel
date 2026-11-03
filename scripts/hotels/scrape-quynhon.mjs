#!/usr/bin/env node
/**
 * Build demo hotel drafts for Quy Nhơn from data we may use.
 *
 * - Names/addresses/type: OpenStreetMap via Overpass (ODbL). Facts only, no
 *   copied descriptions, prices or photos from OTA/partner sites.
 * - Photos: Openverse, filtered to CC0 / public domain, re-encoded to WebP.
 *   Attribution is still written to public/images/hotels/CREDITS.md.
 * - Prices and amenities are demo ranges, marked `contentStatus: demo` by the
 *   importer. Nothing is published; review in Studio before publishing.
 *
 *   node scripts/hotels/scrape-quynhon.mjs
 *   node scripts/hotels/scrape-quynhon.mjs --limit 6 --out data/khach-san.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const UA = "SeaTripTravel/1.0 (local demo catalogue)";
const IMAGE_ROOT = "public/images/hotels";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const limit = Math.max(1, Number(flag("--limit", "8")) || 8);
const outFile = flag("--out", "data/khach-san-quynhon.json");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Public-domain / CC0 photos, one pool per slot in the gallery. */
const THEMES = {
  exterior: {
    queries: [
      "resort pool",
      "luxury resort pool",
      "infinity pool",
      "beach resort",
      "tropical resort",
      "hotel exterior palm",
      "resort pool palm",
    ],
    accept: /pool|resort|villa|hotel|tropical|beach|palm|infinity|terrace|lounge/i,
  },
  room: {
    queries: [
      "hotel room",
      "bed in hotel room",
      "hotel bedroom",
      "hotel suite",
      "luxury bedroom",
      "hotel interior",
    ],
    accept: /bed|bedroom|room|suite|interior|living|bathroom/i,
  },
  amenity: {
    queries: [
      "resort restaurant",
      "hotel lobby",
      "spa pool",
      "resort pool",
      "hotel lounge",
      "beach bar resort",
    ],
    accept: /lobby|restaurant|spa|terrace|lounge|pool|resort|hotel|breakfast|bar/i,
  },
  seaside: {
    queries: [
      "beach villa",
      "tropical beach",
      "sea view resort",
      "beach palm sunset",
      "tropical island beach",
      "beach palm tree",
    ],
    accept: /beach|sea|ocean|coast|palm|tropical|island|villa|shore|bay/i,
  },
};

/** Scenes that make a beach hotel card look broken. */
const REJECT_SCENE =
  /ski|snow|winter|mountain|forest|wedding|conference|concert|banquet|abandoned|ruin|archive|black and white|vintage|airport|office|factory|construction|street food|motorcycle|temple|sign|rules|map|logo|poster|diagram|egg|whelk|storm|station|museum|church|school|clinic|hospital|cemetery|aerial/i;
const ALT = {
  exterior: "Khuôn viên và hồ bơi",
  room: "Phòng nghỉ",
  amenity: "Không gian chung",
  seaside: "Bãi biển gần khu nghỉ",
};

async function getJson(url, tries = 4) {
  for (let attempt = 1; attempt <= tries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`HTTP ${response.status}`);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === tries) throw error;
      await sleep(2500 * attempt);
    }
  }
  return null;
}

/** Real properties in Quy Nhơn, restricted to hotels/resorts/homestays. */
async function fetchOsmHotels() {
  const query = `[out:json][timeout:90];
(
  node["tourism"~"^(hotel|resort|guest_house|apartment)$"](13.68,109.10,14.02,109.36);
  way["tourism"~"^(hotel|resort|guest_house|apartment)$"](13.68,109.10,14.02,109.36);
);
out center tags 150;`;
  const body = new URLSearchParams({ data: query });
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "User-Agent": UA, Accept: "application/json" },
        body,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      return json.elements ?? [];
    } catch (error) {
      if (attempt === 3) throw error;
      await sleep(2000 * attempt);
    }
  }
  return [];
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function pickHotels(elements) {
  const seen = new Set();
  const rows = [];
  for (const element of elements) {
    const tags = element.tags ?? {};
    const name = String(tags.name ?? "").replace(/\s+/g, " ").trim();
    if (name.length < 4 || !/[a-zA-ZÀ-ỹ]/.test(name)) continue;
    if (/^(test|demo|khách sạn)$/i.test(name)) continue;
    const slug = slugify(name);
    if (!slug || slug.length < 4 || seen.has(slug)) continue;
    seen.add(slug);

    const tourism = tags.tourism;
    const kind = /homestay|home ?stay/i.test(name)
      ? "homestay"
      : /apartment|căn hộ|can ho|condotel/i.test(name)
        ? "apartment"
        : /resort|khu nghỉ|villa/i.test(name)
          ? "resort"
          : tourism === "resort"
            ? "resort"
            : tourism === "guest_house"
              ? "homestay"
              : "hotel";
    const address = [tags["addr:housenumber"], tags["addr:street"]]
      .filter(Boolean)
      .join(" ")
      .trim();
    const stars = Number.parseInt(tags.stars ?? "", 10);

    // Prefer resorts, starred and addressed properties; drop hostels/homestays
    // with names that read like a mini-mart.
    let score = 0;
    if (tourism === "resort") score += 6;
    if (/resort|beach|bay|sea|ocean|villa/i.test(name)) score += 4;
    if (Number.isFinite(stars)) score += 3;
    if (address) score += 2;
    if (tourism === "hotel") score += 2;
    if (tourism === "guest_house") score -= 2;

    rows.push({
      slug,
      name,
      tourism,
      kind,
      address,
      stars: Number.isFinite(stars) ? Math.min(5, Math.max(1, stars)) : null,
      score,
    });
  }
  return rows.sort((a, b) => b.score - a.score).slice(0, limit);
}

async function fetchPhotoPool() {
  const pool = {};
  for (const [theme, config] of Object.entries(THEMES)) {
    const candidates = [];
    const seen = new Set();
    for (const query of config.queries) {
      if (candidates.length >= 30) break;
      const url =
        "https://api.openverse.org/v1/images/?" +
        new URLSearchParams({
          q: query,
          license: "cc0,pdm",
          size: "large",
          aspect_ratio: "wide",
          page_size: "20",
        });
      const json = await getJson(url).catch((error) => {
        process.stderr.write(`  query failed (${query}): ${error.message}\n`);
        return null;
      });
      for (const item of json?.results ?? []) {
        if (!item.url || seen.has(item.url)) continue;
        if ((item.width ?? 0) < 1200 || (item.height ?? 0) < 600) continue;
        if (!["cc0", "pdm"].includes(String(item.license))) continue;
        const haystack = `${item.title ?? ""}`;
        // A generic query still returns weddings, ski racks and archive scans.
        // Match on the photo's own caption only — the tag list is too broad to
        // trust — and drop the scenes that read as a mistake on a beach page.
        if (!config.accept.test(haystack)) continue;
        if (REJECT_SCENE.test(haystack)) continue;
        seen.add(item.url);
        candidates.push({
          url: item.url,
          creator: item.creator ?? "",
          license: item.license,
          source: item.foreign_landing_url ?? item.url,
          title: item.title ?? "",
        });
      }
      await sleep(1200);
    }
    pool[theme] = candidates;
    process.stdout.write(
      `photos: ${theme} -> ${candidates.length} candidate(s)\n`,
    );
  }
  return pool;
}

async function downloadPhoto(candidate, target, nextCandidate, onSettled) {
  let sharp = null;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    sharp = null;
  }
  for (let attempt = candidate; attempt; attempt = nextCandidate()) {
    try {
      const response = await fetch(attempt.url, { headers: { "User-Agent": UA } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const type = response.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) throw new Error(`not an image: ${type}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 40_000) throw new Error("file too small");

      if (sharp) {
        const info = await sharp(buffer).metadata();
        const stats = await sharp(buffer).stats();
        const means = stats.channels.map((channel) => channel.mean);
        if (means.length >= 3) {
          // Archive scans and night shots land in the pool too; both look like
          // a broken card next to a sunlit resort.
          const spread = Math.max(...means) - Math.min(...means);
          if (spread < 6) throw new Error("near-grayscale");
          const brightness = (means[0] + means[1] + means[2]) / 3;
          if (brightness < 45 || brightness > 235) throw new Error("flat exposure");
        }
        // Sepia and duotone archive scans keep a channel spread, so measure
        // saturation directly instead of trusting RGB means.
        const hsv = await sharp(buffer)
          .resize({ width: 64 })
          .toColourspace("hsv")
          .stats();
        const saturation = (hsv.channels[1]?.mean ?? 255) / 255;
        if (saturation < 0.12) throw new Error("desaturated");
        const output = await sharp(buffer)
          .resize({ width: 1280, withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer();
        if (output.length < 25_000) throw new Error("encoded too small");
        // Hash the file name: a regenerated photo must not sit behind the
        // Next image cache under the same URL.
        const hashed = target.replace(
          /\.webp$/,
          `-${createHash("sha1").update(output).digest("hex").slice(0, 8)}.webp`,
        );
        await writeFile(hashed, output);
        onSettled(attempt.url, true);
        return {
          src: `/${path.relative("public", hashed).split(path.sep).join("/")}`,
          width: Math.min(info.width ?? 1280, 1280),
          height: Math.round(
            ((info.height ?? 720) * Math.min(info.width ?? 1280, 1280)) /
              (info.width ?? 1280),
          ),
          credit: attempt,
        };
      }

      await writeFile(target, buffer);
      onSettled(attempt.url, true);
      return {
        src: `/${path.relative("public", target).split(path.sep).join("/")}`,
        width: 1280,
        height: 720,
        credit: attempt,
      };
    } catch (error) {
      onSettled(attempt.url, false);
      if (process.env.HOTELS_SCRAPE_DEBUG)
        process.stderr.write(`  skip ${attempt.url}: ${error.message}\n`);
    }
  }
  return null;
}

function demoRooms(kind, index) {
  const weekend = [5, 6];
  const bump = (amount, ratio) => Math.round((amount * ratio) / 10_000) * 10_000;
  const rows =
    kind === "resort"
      ? [
          { name: "Deluxe hướng biển", size: 38, bed: "1 giường King", base: 1_850_000, adults: 2, children: 1 },
          { name: "Suite gia đình", size: 55, bed: "1 King + 1 sofa bed", base: 2_900_000, adults: 3, children: 2 },
          { name: "Villa 2 phòng ngủ", size: 95, bed: "2 King", base: 4_200_000, adults: 4, children: 2 },
        ]
      : kind === "homestay"
        ? [
            { name: "Phòng đôi", size: 20, bed: "1 giường Queen", base: 380_000, adults: 2, children: 1 },
            { name: "Phòng gia đình", size: 28, bed: "1 Queen + 1 đơn", base: 520_000, adults: 3, children: 2 },
          ]
        : [
            { name: "Standard", size: 24, bed: "1 giường Queen", base: 620_000, adults: 2, children: 0 },
            { name: "Deluxe", size: 32, bed: "1 giường King", base: 850_000, adults: 2, children: 1 },
            { name: "Phòng gia đình", size: 42, bed: "1 King + 2 đơn", base: 1_150_000, adults: 4, children: 2 },
          ];

  return rows.map((room, roomIndex) => ({
    name: room.name,
    description: `Khoảng ${room.size} m², ${room.bed.toLowerCase()}. Giá và tiện ích là dữ liệu demo, cần xác nhận với khách sạn.`,
    sizeSqm: room.size,
    bed: room.bed,
    view: roomIndex === 0 && kind === "resort" ? "Biển" : "Thành phố",
    capacityAdults: room.adults,
    capacityChildren: room.children,
    maxOccupancy: room.adults + room.children,
    amenities: ["Điều hoà", "Wi-Fi", "Phòng tắm riêng"],
    order: (index + 1) * 10 + roomIndex,
    rates: [
      { kind: "base", amount: room.base, includesBreakfast: kind !== "homestay" },
      { kind: "weekday", weekdays: weekend, amount: bump(room.base, 1.15), includesBreakfast: kind !== "homestay" },
      {
        kind: "date_range",
        startDate: "2027-04-28",
        endDate: "2027-05-03",
        amount: bump(room.base, 1.35),
        includesBreakfast: kind !== "homestay",
        label: "Cao điểm lễ 30/4",
      },
    ],
  }));
}

function hotelCopy(row) {
  const kind = row.kind ?? "hotel";
  const place = "Quy Nhơn";
  const summary =
    kind === "resort"
      ? `${row.name} là khu nghỉ dưỡng tại ${place}, phù hợp cho kỳ nghỉ biển và gia đình.`
      : kind === "homestay"
        ? `${row.name} là chỗ nghỉ nhỏ tại ${place}, thuận tiện cho khách đi biển và khám phá thành phố.`
        : kind === "apartment"
          ? `${row.name} là căn hộ dịch vụ tại ${place}, phù hợp nhóm bạn và gia đình ở dài ngày.`
          : `${row.name} là khách sạn tại ${place}, thuận tiện di chuyển ra bãi biển và trung tâm.`;
  return {
    kind,
    starRating: row.stars ?? (kind === "resort" ? 4 : kind === "hotel" ? 3 : 2),
    starBasis: row.stars
      ? "Hạng sao theo dữ liệu OpenStreetMap, chưa xác nhận lại với khách sạn"
      : "Hạng sao ước lượng cho bản demo, chưa xác nhận với khách sạn",
    summary,
    description: [
      summary,
      `Thông tin, tiện ích và giá trong bản ghi này là dữ liệu demo để dựng giao diện. Thay bằng thông tin do khách sạn cung cấp trước khi xuất bản.`,
    ],
    amenities:
      kind === "resort"
        ? ["Hồ bơi", "Bãi biển", "Ăn sáng", "Wi-Fi", "Lễ tân 24/7", "Đưa đón sân bay"]
        : kind === "homestay"
          ? ["Wi-Fi", "Điều hoà", "Nước nóng", "Giữ hành lý"]
          : ["Wi-Fi", "Điều hoà", "Lễ tân 24/7", "Giữ hành lý", "Thang máy"],
    highlights:
      kind === "resort"
        ? ["Sát biển", "Hồ bơi ngoài trời", "Phù hợp gia đình"]
        : ["Gần trung tâm", "Dễ đi ra bãi biển"],
  };
}

async function main() {
  process.stdout.write("Fetching hotels from OpenStreetMap (Overpass)...\n");
  const elements = await fetchOsmHotels();
  const rows = pickHotels(elements);
  if (rows.length === 0) throw new Error("No usable hotels found in the bbox.");
  process.stdout.write(
    `Selected ${rows.length}: ${rows.map((row) => row.name).join(" | ")}\n`,
  );

  process.stdout.write("Fetching CC0 / public-domain photos (Openverse)...\n");
  const pool = await fetchPhotoPool();

  const usedUrls = new Set();
  const failedUrls = new Set();
  const takeNext = (theme) => {
    for (const candidate of pool[theme] ?? []) {
      if (!candidate) continue;
      if (usedUrls.has(candidate.url) || failedUrls.has(candidate.url)) continue;
      return candidate;
    }
    return null;
  };
  const credits = [];
  const hotels = [];

  for (const [index, row] of rows.entries()) {
    const dir = path.join(IMAGE_ROOT, row.slug);
    await mkdir(dir, { recursive: true });
    const copy = hotelCopy(row);
    const images = [];

    for (const [slot, theme] of ["exterior", "room", "amenity", "seaside"].entries()) {
      const candidate = takeNext(theme);
      if (!candidate) continue;
      const target = path.join(dir, `${slot + 1}.webp`);
      const saved = await downloadPhoto(
        candidate,
        target,
        () => takeNext(theme),
        (url, ok) => (ok ? usedUrls.add(url) : failedUrls.add(url)),
      );
      if (!saved) continue;
      images.push({
        src: saved.src,
        alt: `${ALT[theme]} tại ${row.name}`,
        width: saved.width,
        height: saved.height,
      });
      credits.push({
        hotel: row.name,
        image: saved.src,
        license: saved.credit.license,
        creator: saved.credit.creator,
        source: saved.credit.source,
      });
    }

    if (images.length === 0) {
      // Never ship a hotel without a photo: reuse the site's own hero art.
      images.push({
        src: "/images/hero/blue-bay.webp",
        alt: `Toàn cảnh biển Quy Nhơn (ảnh của Sea Trip) cho ${row.name}`,
      });
    }

    hotels.push({
      slug: row.slug,
      name: row.name,
      province: "Bình Định",
      address: row.address
        ? `${row.address}, Quy Nhơn, Bình Định`
        : "Quy Nhơn, Bình Định (chưa có số nhà trong dữ liệu mở)",
      lodgingType: copy.kind,
      starRating: copy.starRating,
      starBasis: copy.starBasis,
      summary: copy.summary,
      description: copy.description,
      highlights: copy.highlights,
      amenities: copy.amenities,
      images,
      checkInTime: "14:00",
      checkOutTime: "12:00",
      policies: [
        "Nhận phòng từ 14:00, trả phòng trước 12:00",
        "Dữ liệu demo: giá, tiện ích và ảnh chưa được khách sạn xác nhận",
      ],
      roomMode: "manual_daily",
      order: index + 1,
      rooms: demoRooms(copy.kind, index),
      availabilityOffsets: [
        { days: 0, rooms: 4 },
        { days: 1, rooms: 3 },
        { days: 7, rooms: 5 },
      ],
    });
    process.stdout.write(
      `  ${row.name} · ${copy.kind} · ${images.length} ảnh\n`,
    );
  }

  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(outFile, `${JSON.stringify({ hotels }, null, 2)}\n`, "utf8");

  if (credits.length > 0) {
    const lines = [
      "# Nguồn ảnh (demo)",
      "",
      "Ảnh tải bằng `scripts/hotels/scrape-quynhon.mjs` từ Openverse, chỉ lọc",
      "giấy phép CC0 / public domain. Giữ file này khi còn dùng ảnh demo.",
      "",
      "| Ảnh | Giấy phép | Tác giả | Nguồn |",
      "| --- | --- | --- | --- |",
      ...credits.map(
        (entry) =>
          `| ${entry.image} | ${entry.license} | ${entry.creator || "—"} | ${entry.source} |`,
      ),
      "",
    ];
    await writeFile(
      path.join(IMAGE_ROOT, "CREDITS.md"),
      lines.join("\n"),
      "utf8",
    );
  }

  process.stdout.write(
    `\nWrote ${outFile} (${hotels.length} hotels, ${credits.length} photos).\n` +
      "Next: HOTELS_IMPORT_OK=1 npm run hotels:import -- " +
      `${outFile}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`scrape failed: ${error.message}\n`);
  process.exit(1);
});

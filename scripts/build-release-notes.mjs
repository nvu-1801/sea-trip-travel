#!/usr/bin/env node
/**
 * Tạo `release-notes.json` cho đợt deploy.
 *
 * Chỉ đọc commit trailer tường minh, không suy đoán từ subject/body thông
 * thường. Nhờ vậy email không bao giờ biến một commit kỹ thuật thành một
 * "tính năng" mà khách hàng chưa hề thấy.
 *
 *   Customer-Note: Trang tour mới giúp khách xem lịch trình và giá rõ hơn
 *   Khách-hàng: Bộ lọc tìm tour nhanh hơn và dễ dùng trên điện thoại
 *
 * Nhiều dòng cho một commit = nhiều mục trong email.
 *
 * Script chạy trong CI (đã checkout đầy đủ lịch sử). Mọi lỗi đều được hạ cấp
 * thành manifest rỗng để không chặn deploy thật.
 */
import { execFileSync } from "node:child_process";

const MAX_COMMITS = 400;
const TRAILER = /^\s*(?:Customer-Note|Khách-hàng|Khach-hang)\s*:\s*(.+?)\s*$/i;

function resolveHead() {
  const fromEnv = (process.env.GITHUB_SHA ?? "").trim();
  if (/^[a-f0-9]{40}$/.test(fromEnv)) return fromEnv;
  try {
    const local = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    return /^[a-f0-9]{40}$/.test(local) ? local : null;
  } catch {
    return null;
  }
}

function extractNotes(body) {
  const notes = [];
  for (const line of body.split(/\r?\n/)) {
    const match = TRAILER.exec(line);
    if (!match) continue;
    const note = match[1].replace(/\s+/g, " ").trim();
    if (note && !notes.includes(note)) notes.push(note);
  }
  return notes;
}

const head = resolveHead();
const manifest = { version: 2, head, order: [], notes: {} };

if (!head) {
  console.error("[release-notes] Không xác định được commit đang deploy; tạo manifest rỗng.");
  process.stdout.write(JSON.stringify(manifest));
  process.exit(0);
}

try {
  // `%x1e` tách commit, `%x1f` tách sha/body. Bản ghi mới nhất đứng trước.
  const raw = execFileSync(
    "git",
    ["log", "--no-merges", `--format=%H%x1f%B%x1e`, "-n", String(MAX_COMMITS), head],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );

  for (const record of raw.split("\x1e")) {
    const trimmed = record.replace(/^\r?\n/, "");
    if (!trimmed) continue;
    const separator = trimmed.indexOf("\x1f");
    if (separator === -1) continue;
    const sha = trimmed.slice(0, separator).trim();
    if (!/^[a-f0-9]{40}$/.test(sha)) continue;
    const body = trimmed.slice(separator + 1);
    manifest.order.push(sha);
    const notes = extractNotes(body);
    if (notes.length > 0) manifest.notes[sha] = notes;
  }
} catch (error) {
  console.error(
    `[release-notes] Không đọc được lịch sử Git (${error instanceof Error ? error.message : "unknown"}).`,
  );
}

if (manifest.order.length === MAX_COMMITS) {
  console.error(
    `[release-notes] Chỉ quét ${MAX_COMMITS} commit gần nhất. Nếu lần deploy trước cũ hơn, email chỉ gồm ghi chú của commit mới nhất.`,
  );
}

console.error(
  `[release-notes] ${manifest.order.length} commit, ${Object.keys(manifest.notes).length} commit có ghi chú khách hàng.`,
);
process.stdout.write(JSON.stringify(manifest));

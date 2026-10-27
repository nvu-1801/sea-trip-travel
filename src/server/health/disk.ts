import "server-only";
import { readdir, stat, statfs } from "node:fs/promises";
import path from "node:path";
import { cmsDataDir } from "@/server/cms/db";
import type { HealthStorage } from "@/lib/health";

/**
 * How much the CMS actually occupies on disk.
 *
 * The scan is bounded in both files and time: the health page must never make
 * an admin wait on a runaway media folder, and a partial number with a note is
 * more useful than a hung request.
 */
const MAX_FILES = 20_000;
const MAX_MS = 1_500;

type TreeSize = { bytes: number; files: number; partial: boolean };

async function fileBytes(file: string): Promise<number> {
  try {
    const info = await stat(file);
    return info.isFile() ? info.size : 0;
  } catch {
    return 0;
  }
}

async function measureTree(
  root: string,
  budget: { remaining: number; deadline: number },
): Promise<TreeSize> {
  let bytes = 0;
  let files = 0;
  let partial = false;
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return { bytes, files, partial };
  }
  for (const entry of entries) {
    if (Date.now() > budget.deadline || budget.remaining <= 0) {
      partial = true;
      break;
    }
    const full = path.join(root, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      const child = await measureTree(full, budget);
      bytes += child.bytes;
      files += child.files;
      partial ||= child.partial;
      continue;
    }
    if (!entry.isFile()) continue;
    bytes += await fileBytes(full);
    files += 1;
    budget.remaining -= 1;
  }
  return { bytes, files, partial };
}

async function freeSpace(dataDir: string) {
  try {
    const info = await statfs(dataDir);
    const total = Number(info.blocks) * Number(info.bsize);
    const free = Number(info.bavail) * Number(info.bsize);
    if (!Number.isFinite(total) || total <= 0) return null;
    return {
      total,
      free: Math.max(0, free),
      usedPercent: Math.min(
        100,
        Math.max(0, Math.round(((total - free) / total) * 100)),
      ),
    };
  } catch {
    return null;
  }
}

/**
 * `options` exists for tests and for installations that keep the volume
 * somewhere unusual; production reads the same environment variables as the
 * CMS itself.
 */
export async function measureStorage(options?: {
  dataDir?: string;
  dbPath?: string;
  uploadsDir?: string;
  includeVolume?: boolean;
}): Promise<HealthStorage> {
  const explicit = Boolean(options);
  if (!explicit && process.env.VERCEL)
    return {
      available: false,
      note: "Vercel serverless không có volume bền vững để đo dung lượng.",
      dataBytes: 0,
      databaseBytes: 0,
      walBytes: 0,
      uploadsBytes: 0,
      uploadFiles: 0,
      otherBytes: 0,
      volumeTotalBytes: null,
      volumeFreeBytes: null,
      volumeUsedPercent: null,
    };

  const dbPath =
    options?.dbPath ??
    process.env.CMS_DB_PATH ??
    path.join(cmsDataDir(), "seatrip.sqlite");
  // When the CMS points at another volume, that folder — not the checkout's
  // `data/` — is the thing the owner wants to measure.
  const dataDir =
    options?.dataDir ??
    (process.env.CMS_DB_PATH ? path.dirname(dbPath) : cmsDataDir());
  const uploadsDir =
    options?.uploadsDir ?? process.env.CMS_UPLOAD_DIR ?? path.join(dataDir, "uploads");

  const budget = { remaining: MAX_FILES, deadline: Date.now() + MAX_MS };
  const [data, uploads, databaseBytes, walBytes] = await Promise.all([
    measureTree(dataDir, budget),
    measureTree(uploadsDir, budget),
    fileBytes(dbPath),
    fileBytes(`${dbPath}-wal`),
  ]);
  const volume =
    options?.includeVolume === false ? null : await freeSpace(dataDir);
  const databaseOnly = databaseBytes + walBytes;
  const otherBytes = Math.max(
    0,
    data.bytes - uploads.bytes - databaseOnly,
  );
  const available = data.files > 0 || databaseBytes > 0 || uploads.files > 0;

  return {
    available,
    note: data.partial || uploads.partial
      ? "Lần quét chạm giới hạn an toàn; con số có thể thấp hơn thực tế."
      : null,
    dataBytes: Math.round(data.bytes),
    databaseBytes: Math.round(databaseBytes),
    walBytes: Math.round(walBytes),
    uploadsBytes: Math.round(uploads.bytes),
    uploadFiles: uploads.files,
    otherBytes: Math.round(otherBytes),
    volumeTotalBytes: volume ? Math.round(volume.total) : null,
    volumeFreeBytes: volume ? Math.round(volume.free) : null,
    volumeUsedPercent: volume?.usedPercent ?? null,
  };
}

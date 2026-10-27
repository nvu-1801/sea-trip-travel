import "server-only";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { cmsDataDir, db } from "@/server/cms/db";

/**
 * Which uploaded images still earn their place.
 *
 * A file is "used" when any record references `/api/media/<name>` in its draft
 * or published body — the exact rule the delete endpoint enforces, so nothing
 * reported here can be rejected by the API. Files with no library row are
 * reported separately because only a server-side cleanup can remove them.
 */
export type MediaUsage = {
  /** Library rows no record references. */
  unusedNames: string[];
  /** Upload files that have no library row. */
  orphanNames: string[];
  /** Bytes held by unused library files and orphan files. */
  unusedBytes: number;
  /** Library file name → bytes on disk (0 when the file is missing). */
  sizes: Record<string, number>;
};

function uploadsDir() {
  return process.env.CMS_UPLOAD_DIR ?? path.join(cmsDataDir(), "uploads");
}

export async function mediaUsage(options?: {
  uploadsDir?: string;
}): Promise<MediaUsage> {
  const dir = options?.uploadsDir ?? uploadsDir();
  const rows = db().prepare("SELECT name FROM media").all() as {
    name: string;
  }[];
  let files: string[] = [];
  try {
    files = (await readdir(dir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && !entry.isSymbolicLink())
      .map((entry) => entry.name);
  } catch {
    // No uploads folder yet: every library row is missing on disk.
  }
  const sizes: Record<string, number> = {};
  await Promise.all(
    files.map(async (file) => {
      try {
        const info = await stat(path.join(dir, file));
        sizes[file] = info.isFile() ? info.size : 0;
      } catch {
        sizes[file] = 0;
      }
    }),
  );
  const referenced = db().prepare(
    "SELECT 1 FROM records WHERE instr(data,?)>0 OR instr(coalesce(published,''),?)>0 LIMIT 1",
  );
  const unusedNames: string[] = [];
  let unusedBytes = 0;
  for (const row of rows) {
    const reference = `/api/media/${row.name}`;
    if (referenced.get(reference, reference)) continue;
    unusedNames.push(row.name);
    unusedBytes += sizes[row.name] ?? 0;
  }
  const library = new Set(rows.map((row) => row.name));
  const orphanNames = files.filter((file) => !library.has(file));
  for (const file of orphanNames) unusedBytes += sizes[file] ?? 0;
  return { unusedNames, orphanNames, unusedBytes, sizes };
}

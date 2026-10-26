/**
 * Backup retention is deliberately narrow: only successful, verified backups
 * created by the scheduler (`kind=auto`) may be pruned. Pre-deploy copies,
 * manual exports and anything from an older format are never touched.
 */
export const AUTO_KEEP = 3;

export function isAutoId(id) {
  return typeof id === "string" && /^auto-\d{8}T\d{6}Z-[a-f0-9]{6}$/.test(id);
}

/**
 * Given manifest sidecars, return the archives that may be removed.
 *
 * Rules:
 *  - only `kind === "auto"` + `status === "done"` + `verifiedAt` + format 1;
 *  - only IDs that match the current auto pattern;
 *  - sort newest first by `createdAt` then ID;
 *  - keep `keep` entries and return the rest;
 *  - a missing/invalid createdAt is kept (fail safe, never delete unknowns).
 */
export function selectExpired(entries, keep = AUTO_KEEP) {
  const eligible = entries
    .filter(
      (entry) =>
        entry &&
        entry.kind === "auto" &&
        entry.status === "done" &&
        Boolean(entry.verifiedAt) &&
        entry.formatVersion === 1 &&
        isAutoId(entry.id),
    )
    .sort((a, b) => {
      const at = Date.parse(a.createdAt ?? "");
      const bt = Date.parse(b.createdAt ?? "");
      if (!Number.isFinite(at) || !Number.isFinite(bt))
        return a.id < b.id ? 1 : -1;
      if (at !== bt) return bt - at;
      return a.id < b.id ? 1 : -1;
    });
  const keepIds = new Set(eligible.slice(0, Math.max(0, keep)).map((e) => e.id));
  return eligible.filter((entry) => !keepIds.has(entry.id));
}

/** Sidecar validation: rejects anything that could point outside the dir. */
export function safeManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = value.id;
  if (typeof id !== "string" || !/^[a-z0-9-]{10,80}$/i.test(id)) return null;
  if (typeof value.createdAt !== "string") return null;
  if (!Number.isFinite(Date.parse(value.createdAt))) return null;
  if (value.formatVersion !== 1) return null;
  const kind = value.kind;
  if (!["auto", "manual", "predeploy"].includes(kind)) return null;
  if (value.status !== "done") return null;
  if (!value.archive || typeof value.archive.sha256 !== "string") return null;
  if (!/^[a-f0-9]{64}$/i.test(value.archive.sha256)) return null;
  return value;
}

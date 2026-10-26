import path from "node:path";
import {
  exists,
  isFile,
  listFiles,
  readJson,
  writeFileAtomic,
} from "./util.mjs";
import { safeManifest } from "./retention.mjs";

export function manifestPath(backupDir, id) {
  return path.join(backupDir, `${id}.manifest.json`);
}

export function archivePath(backupDir, id) {
  return path.join(backupDir, `${id}.seatar`);
}

export function checksumPath(backupDir, id) {
  return path.join(backupDir, `${id}.sha256`);
}

export function logPath(backupDir, id) {
  return path.join(backupDir, "logs", `${id}.log`);
}

export function readManifest(backupDir, id) {
  const value = safeManifest(readJson(manifestPath(backupDir, id)));
  if (!value) return null;
  if (!isFile(archivePath(backupDir, id))) return null;
  return value;
}

export function listManifests(backupDir) {
  return listFiles(backupDir, /^[a-z0-9-]+\.manifest\.json$/i)
    .map((name) =>
      safeManifest(readJson(path.join(backupDir, name))),
    )
    .filter(Boolean)
    .filter((entry) => isFile(archivePath(backupDir, entry.id)))
    .sort((a, b) => {
      const at = Date.parse(a.createdAt ?? "");
      const bt = Date.parse(b.createdAt ?? "");
      if (!Number.isFinite(at) || !Number.isFinite(bt))
        return a.id < b.id ? 1 : -1;
      return bt - at;
    });
}

export function readState(backupDir) {
  return (
    readJson(path.join(backupDir, "state.json"), null) ?? {
      updatedAt: null,
      lastAttempt: null,
      lastSuccess: null,
      lastVerify: null,
      lastRestoreTest: null,
      retention: null,
      offsite: null,
      schedule: null,
      installed: null,
    }
  );
}

export function writeState(backupDir, patch) {
  const current = readState(backupDir);
  const value = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
    formatVersion: 1,
  };
  writeFileAtomic(
    path.join(backupDir, "state.json"),
    `${JSON.stringify(value, null, 2)}\n`,
    0o640,
  );
  return value;
}

export function installStatePath(backupDir) {
  return path.join(backupDir, "install-state.json");
}

export function readInstallState(backupDir) {
  const file = installStatePath(backupDir);
  return exists(file) ? readJson(file, null) : null;
}

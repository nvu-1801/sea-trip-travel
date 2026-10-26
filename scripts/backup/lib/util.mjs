import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  statfsSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { pipeline } from "node:stream/promises";

export const FORMAT_VERSION = 1;
export const TOOL_VERSION = "1";
export const ID_PATTERN =
  /^(auto|manual|predeploy)-\d{8}T\d{6}Z-[a-f0-9]{6}$/;

export function args(argv = process.argv.slice(2)) {
  const flags = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      flags.set(value.slice(2), next);
      i += 1;
    } else {
      flags.set(value.slice(2), "true");
    }
  }
  return flags;
}

export function envNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback;
}

export function backupId(kind, date = new Date()) {
  const stamp = date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const suffix = Math.random().toString(16).slice(2, 8).padEnd(6, "0");
  return `${kind}-${stamp}-${suffix}`;
}

export function newId(kind) {
  const id = backupId(kind);
  if (!ID_PATTERN.test(id)) throw new Error("Không tạo được mã backup");
  return id;
}

export function ensureDir(directory, mode = 0o750) {
  mkdirSync(directory, { recursive: true, mode });
  return directory;
}

export function isSafeId(value) {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export function requireSafeId(value) {
  if (!isSafeId(value)) throw new Error("Mã backup không hợp lệ");
  return value;
}

export function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(file);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export function writeFileAtomic(file, content, mode = 0o640) {
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, content, { mode });
  renameSync(temporary, file);
}

export function run(command, argv, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argv, {
      stdio: ["ignore", options.stdout ? "pipe" : "ignore", "pipe"],
      cwd: options.cwd,
      env: options.env ?? process.env,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr?.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const detail = stderr.trim().split("\n").slice(-3).join(" · ");
      reject(
        new Error(
          `${path.basename(command)} lỗi (${code})${detail ? `: ${detail}` : ""}`,
        ),
      );
    });
  });
}

export function treeSize(root) {
  let bytes = 0;
  let files = 0;
  const walk = (directory) => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        try {
          bytes += statSync(full).size;
          files += 1;
        } catch {
          /* file vanished; the marker should prevent this */
        }
      }
    }
  };
  walk(root);
  return { bytes, files };
}

export function freeBytes(directory) {
  try {
    const info = statfsSync(directory);
    return Number(info.bavail) * Number(info.bsize);
  } catch {
    return null;
  }
}

export function listFiles(directory, pattern) {
  try {
    return readdirSync(directory).filter((name) => pattern.test(name)).sort();
  } catch {
    return [];
  }
}

export function removeIfExists(file) {
  try {
    unlinkSync(file);
  } catch {
    /* already gone */
  }
}

export function removeTree(directory) {
  try {
    rmSync(directory, { recursive: true, force: true, maxRetries: 2 });
  } catch {
    /* cleanup best effort */
  }
}

export function redact(message) {
  const text = String(message ?? "");
  return text
    .replace(/LEAD_ENCRYPTION_KEY\s*=\s*\S+/gi, "LEAD_ENCRYPTION_KEY=[đã ẩn]")
    .replace(/SMTP_PASSWORD\s*=\s*\S+/gi, "SMTP_PASSWORD=[đã ẩn]")
    .replace(/ADMIN_PASSWORD\s*=\s*\S+/gi, "ADMIN_PASSWORD=[đã ẩn]")
    .replace(/(password|passwd|secret|token)\s*[:=]\s*\S+/gi, "$1=[đã ẩn]")
    .slice(0, 600);
}

export class Logger {
  constructor(file) {
    this.file = file;
    ensureDir(path.dirname(file));
    this.lines = [];
  }
  line(message) {
    const text = `${new Date().toISOString()} ${redact(message)}`;
    this.lines.push(text);
    console.log(text);
    writeFileAtomic(this.file, `${this.lines.join("\n")}\n`);
  }
}

export async function copyFile(source, target, mode = 0o640) {
  ensureDir(path.dirname(target));
  await pipeline(createReadStream(source), createWriteStream(target, { mode }));
}

/** Hash the bytes as they are copied, so verification does not depend on a
 *  read-after-write round trip (some bind mounts are eventually consistent). */
export async function copyFileHashed(source, target, mode = 0o640) {
  ensureDir(path.dirname(target));
  const hash = createHash("sha256");
  let bytes = 0;
  const input = createReadStream(source);
  input.on("data", (chunk) => {
    hash.update(chunk);
    bytes += chunk.length;
  });
  await pipeline(input, createWriteStream(target, { mode }));
  return { sha256: hash.digest("hex"), bytes };
}

export function isDirectory(value) {
  try {
    return statSync(value).isDirectory();
  } catch {
    return false;
  }
}

export function isFile(value) {
  try {
    return statSync(value).isFile();
  } catch {
    return false;
  }
}

export function fileSize(value) {
  try {
    return statSync(value).size;
  } catch {
    return 0;
  }
}

export function readJson(file, fallback = null) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

export function authority() {
  const dataDir = process.env.BACKUP_DATA_DIR ?? "/data";
  const backupDir = process.env.BACKUP_DIR ?? "/backups";
  return {
    dataDir,
    backupDir,
    dbPath: path.join(dataDir, "seatrip.sqlite"),
    uploadsDir: path.join(dataDir, "uploads"),
    marker: path.join(dataDir, ".backup-active"),
    keyFile: process.env.BACKUP_KEY_FILE ?? "/run/secret/archive.key",
    configDir: process.env.BACKUP_CONFIG_DIR ?? "/config",
    appSha: (process.env.BACKUP_APP_SHA ?? "").trim() || null,
    keepAuto: envNumber("BACKUP_KEEP_AUTO", 3),
    minFreeBytes: envNumber("BACKUP_MIN_FREE_BYTES", 0),
    retentionEnabled: process.env.BACKUP_SKIP_RETENTION !== "1",
    offsiteDir: (process.env.BACKUP_OFFSITE_DIR ?? "").trim(),
    image: process.env.BACKUP_IMAGE ?? "unknown",
  };
}

export function exists(value) {
  return Boolean(value) && existsSync(value);
}

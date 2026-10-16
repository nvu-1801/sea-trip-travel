import "server-only";

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";
import type { Metadata as SharpMetadata } from "sharp";
import { getMedia, insertMedia, type NewMedia } from "@/server/repo/media";
import type { MediaRecord } from "@/server/repo/types";

/**
 * Upload pipeline.
 *
 * Security posture, in order:
 *   1. Size is checked before the bytes are decoded.
 *   2. The *real* format is read from the pixels (`sharp.metadata()`), never
 *      trusted from the `Content-Type` header or the file extension.
 *   3. The stored filename is generated, never derived from user input, so a
 *      crafted name cannot escape the upload directory.
 *   4. Variants are re-encoded to WebP and never upscaled.
 *
 * Binary data lives on disk under `UPLOAD_DIR`; SQLite only stores metadata.
 */

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const FORMAT_MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const FORMAT_EXT: Record<string, string> = { jpeg: "jpg", png: "png", webp: "webp" };

export const MEDIA_MAX_BYTES = Number(process.env.MEDIA_MAX_BYTES ?? 10 * 1024 * 1024);

export type VariantName = "large" | "cover" | "banner" | "thumb";

export type VariantSpec = {
  name: VariantName;
  width: number;
  height?: number;
  /** "cover" crops to fill, "inside" keeps the whole frame. */
  fit: "cover" | "inside";
};

/** Recommended sizes shown in the upload form. */
export const VARIANT_SPECS: readonly VariantSpec[] = [
  { name: "banner", width: 1920, height: 1080, fit: "cover" },
  { name: "cover", width: 1200, height: 800, fit: "cover" },
  { name: "large", width: 1600, fit: "inside" },
  { name: "thumb", width: 480, height: 320, fit: "cover" },
];

export function uploadDir(): string {
  const configured = process.env.UPLOAD_DIR?.trim();
  const dir = configured && configured.length > 0 ? configured : "./data/uploads";
  // turbopackIgnore: true — the path is intentionally resolved at runtime; the
  // default keeps bundle tracing from pulling the whole project into the output.
  return resolve(/* turbopackIgnore: true */ process.cwd(), dir);
}

export type UploadProblem = { code: string; message: string };

export function validateUploadInput(file: File): UploadProblem | null {
  if (file.size === 0) return { code: "EMPTY", message: "Tệp rỗng." };
  if (file.size > MEDIA_MAX_BYTES) {
    return {
      code: "TOO_LARGE",
      message: `Ảnh vượt quá ${Math.round(MEDIA_MAX_BYTES / (1024 * 1024))} MB cho phép.`,
    };
  }
  return null;
}

export type ProcessedUpload = {
  media: MediaRecord;
  width: number | null;
  height: number | null;
  format: string;
  dupeOf?: MediaRecord;
};

/** Validate, optimise and persist one uploaded image. */
export async function processUpload(
  file: File,
  options: { alt?: string; originalName?: string } = {},
): Promise<{ ok: true; result: ProcessedUpload } | { ok: false; problem: UploadProblem }> {
  const inputProblem = validateUploadInput(file);
  if (inputProblem) return { ok: false, problem: inputProblem };

  const buffer = Buffer.from(await file.arrayBuffer());

  let metadata: SharpMetadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    return { ok: false, problem: { code: "UNREADABLE", message: "Không đọc được ảnh." } };
  }

  const format = metadata.format ?? "";
  if (!ALLOWED_FORMATS.has(format)) {
    return {
      ok: false,
      problem: {
        code: "UNSUPPORTED_TYPE",
        message: "Chỉ nhận ảnh JPG, PNG hoặc WebP.",
      },
    };
  }

  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const id = `med_${sha256.slice(0, 20)}`;
  const dir = join(uploadDir(), id);
  mkdirSync(dir, { recursive: true });

  const originalName = `original.${FORMAT_EXT[format]}`;
  writeFileSync(join(dir, originalName), buffer);

  const variants: MediaRecord["variants"] = [];
  for (const spec of VARIANT_SPECS) {
    const pipeline = sharp(buffer).rotate().resize({
      width: spec.width,
      height: spec.height,
      fit: spec.fit,
      // Never upscale: a 600px source stays 600px.
      withoutEnlargement: true,
    });
    const output = await pipeline.webp({ quality: 82 }).toBuffer();
    const filename = `${spec.name}.webp`;
    writeFileSync(join(dir, filename), output);
    const info = await sharp(output).metadata();
    variants.push({
      name: spec.name,
      url: `/media/${id}/${spec.name}`,
      width: info.width ?? spec.width,
      height: info.height ?? spec.height ?? 0,
      mime: "image/webp",
    });
  }

  const payload: NewMedia = {
    id,
    storage: "upload",
    url: `/media/${id}/original`,
    filename: originalName,
    originalName: options.originalName ?? file.name,
    mime: FORMAT_MIME[format] ?? "application/octet-stream",
    bytes: buffer.byteLength,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    sha256,
    variants,
    altDefault: options.alt ?? null,
  };

  const existing = getMedia(id);
  const media = existing ?? insertMedia(payload);

  return {
    ok: true,
    result: {
      media,
      width: media.width,
      height: media.height,
      format,
      ...(existing ? { dupeOf: existing } : {}),
    },
  };
}

/** Read a stored upload for the media route handler. */
export function readMediaFile(
  media: MediaRecord,
  variant: string,
): { body: Buffer; mime: string } | null {
  if (media.storage !== "upload") return null;
  const dir = join(uploadDir(), media.id);

  if (variant === "original") {
    if (!media.filename) return null;
    const path = join(dir, media.filename);
    safeStat(path);
    return { body: readFileSync(path), mime: media.mime };
  }

  const match = media.variants.find((entry) => entry.name === variant);
  if (!match) return null;
  const path = join(dir, `${variant}.webp`);
  safeStat(path);
  return { body: readFileSync(path), mime: match.mime };
}

function safeStat(path: string): void {
  const info = statSync(path);
  if (!info.isFile()) throw new Error("Không phải tệp");
}

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  readFileSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { createGunzip, createGzip } from "node:zlib";
import { finished, pipeline } from "node:stream/promises";

/**
 * Archive format:
 *
 *   magic  "SEATRIPBAK1\n"       12 bytes
 *   iv                          12 bytes
 *   AES-256-GCM ciphertext      n bytes (gzip stream)
 *   auth tag                    16 bytes
 *
 * The key is a base64-encoded 32-byte random value stored outside the app
 * container (root-only). The tag makes tampering detectable; the checksum file
 * additionally pins the exact encrypted bytes.
 */
export const MAGIC = Buffer.from("SEATRIPBAK1\n");
const IV_BYTES = 12;
const TAG_BYTES = 16;
const HEADER_BYTES = MAGIC.length + IV_BYTES;

export function readKey(file) {
  const raw = readFileSync(file, "utf8").trim();
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("Khóa mã hóa backup không hợp lệ");
  return key;
}

export async function encryptArchive(source, target, key) {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const output = createWriteStream(target, { mode: 0o640 });
  output.write(MAGIC);
  output.write(iv);
  await pipeline(
    createReadStream(source),
    createGzip({ level: 1 }),
    cipher,
    output,
    { end: false },
  );
  output.end(cipher.getAuthTag());
  await finished(output);
}

export async function decryptArchive(source, target, key) {
  const size = statSync(source).size;
  if (size < HEADER_BYTES + TAG_BYTES) throw new Error("Tệp backup bị cắt ngắn");
  const header = await readRange(source, 0, HEADER_BYTES - 1);
  if (!timingSafeEqual(header.subarray(0, MAGIC.length), MAGIC))
    throw new Error("Không phải định dạng backup SEA TRIP");
  const iv = header.subarray(MAGIC.length, HEADER_BYTES);
  const tag = await readRange(source, size - TAG_BYTES, size - 1);
  const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: TAG_BYTES });
  decipher.setAuthTag(tag);
  try {
    await pipeline(
      createReadStream(source, {
        start: HEADER_BYTES,
        end: size - TAG_BYTES - 1,
      }),
      decipher,
      createGunzip(),
      createWriteStream(target, { mode: 0o600 }),
    );
  } catch (error) {
    try {
      unlinkSync(target);
    } catch {
      /* nothing to clean */
    }
    const code = typeof error?.code === "string" ? error.code : "";
    if (["EACCES", "EPERM", "ENOENT", "ENOSPC", "EROFS"].includes(code))
      throw error;
    throw new Error(
      "Không giải mã được backup (sai khóa hoặc tệp đã bị sửa)",
      { cause: error },
    );
  }
}

function readRange(file, start, end) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = createReadStream(file, { start, end });
    stream.on("error", reject);
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

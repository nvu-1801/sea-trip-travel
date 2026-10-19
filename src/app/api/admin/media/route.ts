import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { requireSession } from "@/server/cms/auth";
import { db, audit } from "@/server/cms/db";
import { handle, jsonBody, reply } from "@/server/cms/http";
import { z } from "zod";
import { tours } from "@/content";
const directory = () =>
  process.env.CMS_UPLOAD_DIR ?? path.resolve("data/uploads");
export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const originals = [
      ...new Map(
        tours
          .flatMap((tour) => tour.images)
          .filter((image) => image.src)
          .map((image) => [
            image.src,
            {
              id: `original:${image.src}`,
              name: image.src!.split("/").pop(),
              src: image.src,
              alt: image.alt,
              original: true,
            },
          ]),
      ).values(),
    ];
    const uploaded = (
      db().prepare("SELECT * FROM media ORDER BY created_at DESC").all() as {
        name: string;
      }[]
    ).map((item) => ({
      ...item,
      src: `/api/media/${item.name}`,
      original: false,
    }));
    return reply([...uploaded, ...originals]);
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const max = 10 * 1024 * 1024;
    const type = request.headers.get("content-type") ?? "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(type))
      return reply({ error: "Chỉ nhận JPEG, PNG, WebP" }, 415);
    if (Number(request.headers.get("content-length") ?? 0) > max)
      return reply({ error: "Ảnh vượt quá 10 MB" }, 413);
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Thiếu ảnh" }, 400);
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel();
        return reply({ error: "Ảnh vượt quá 10 MB" }, 413);
      }
      chunks.push(value);
    }
    const buffer = Buffer.concat(chunks);
    const image = sharp(buffer, {
      limitInputPixels: 25000000,
      animated: false,
    });
    const metadata = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format ?? "") ||
      (metadata.pages ?? 1) > 1
    )
      return reply({ error: "Định dạng ảnh không hợp lệ" }, 415);
    const id = randomUUID();
    const name = `${id}.webp`;
    const output = await image
      .rotate()
      .resize({
        width: 1920,
        height: 1920,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    await mkdir(directory(), { recursive: true, mode: 0o700 });
    await writeFile(path.join(directory(), name), output.data, { mode: 0o600 });
    const alt =
      decodeURIComponent(request.headers.get("x-image-alt") ?? "").slice(
        0,
        300,
      ) || "Ảnh du lịch SEA TRIP";
    db()
      .prepare(
        "INSERT INTO media(id,name,alt,width,height,created_at) VALUES(?,?,?,?,?,?)",
      )
      .run(
        id,
        name,
        alt,
        output.info.width,
        output.info.height,
        new Date().toISOString(),
      );
    audit("upload", id);
    return reply({ id, name, alt, src: `/api/media/${name}` }, 201);
  });
}
export async function DELETE(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const { id } = z
      .object({ id: z.uuid() })
      .parse(await jsonBody(request, 1000));
    const media = db().prepare("SELECT name FROM media WHERE id=?").get(id) as
      { name: string } | undefined;
    if (!media) return reply({ error: "Không tìm thấy ảnh" }, 404);
    const reference = `/api/media/${media.name}`;
    if (
      db()
        .prepare(
          "SELECT id FROM records WHERE instr(data,?)>0 OR instr(coalesce(published,''),?)>0 LIMIT 1",
        )
        .get(reference, reference)
    )
      return reply(
        {
          error: "Ảnh còn được tham chiếu trong nội dung hoặc bản đã xuất bản",
        },
        409,
      );
    await unlink(
      /* turbopackIgnore: true */ path.join(
        /* turbopackIgnore: true */ directory(),
        media.name,
      ),
    );
    db().prepare("DELETE FROM media WHERE id=?").run(id);
    audit("media-delete", id);
    return reply({ ok: true });
  });
}
export async function PATCH(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const input = z
      .object({ id: z.uuid(), alt: z.string().trim().min(1).max(300) })
      .parse(await jsonBody(request, 2000));
    const result = db()
      .prepare("UPDATE media SET alt=? WHERE id=?")
      .run(input.alt, input.id);
    if (!result.changes)
      return reply({ error: "Không tìm thấy ảnh tải lên" }, 404);
    audit("media-update", input.id);
    return reply({ ok: true });
  });
}

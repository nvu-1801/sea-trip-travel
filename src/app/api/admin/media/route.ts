import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { requireSession } from "@/server/cms/auth";
import { cmsDataDir, db } from "@/server/cms/db";
import { backupInProgress } from "@/server/cms/backup";
import { auditFailure, auditRequest } from "@/server/cms/audit";
import { handle, jsonBody, reply } from "@/server/cms/http";
import { z } from "zod";
import { tours } from "@/content";
import { heroPhotos } from "@/domain/home-hero";
import { CUSTOMER_STORIES_MEDIA } from "@/features/home/customer-stories-demo";
import { mediaUsage } from "@/server/media/usage";
const directory = () =>
  process.env.CMS_UPLOAD_DIR ?? path.join(cmsDataDir(), "uploads");
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
    const usage = await mediaUsage();
    const unused = new Set(usage.unusedNames);
    const uploaded = (
      db().prepare("SELECT * FROM media ORDER BY created_at DESC").all() as {
        name: string;
      }[]
    ).map((item) => ({
      ...item,
      src: `/api/media/${item.name}`,
      original: false,
      used: !unused.has(item.name),
      bytes: usage.sizes[item.name] ?? 0,
    }));
    return reply([
      ...uploaded,
      ...originals,
      ...heroPhotos.map((photo) => ({
        id: `hero:${photo.src}`,
        name: photo.src.split("/").pop(),
        src: photo.src,
        alt: photo.alt,
        original: true,
      })),
      ...CUSTOMER_STORIES_MEDIA.map((item) => ({
        ...item,
        original: true,
      })),
    ]);
  });
}
export async function POST(request: Request) {
  return handle(async () => {
    await requireSession(request);
    if (backupInProgress())
      return reply(
        {
          error:
            "Hệ thống đang sao lưu dữ liệu. Thử tải ảnh lại sau ít phút.",
        },
        409,
      );
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
      .webp({ quality: 92, effort: 5 })
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
    auditRequest(request, "upload", id, {
      details: {
        name,
        alt,
        width: output.info.width,
        height: output.info.height,
      },
    });
    return reply({ id, name, alt, src: `/api/media/${name}` }, 201);
  });
}
export async function DELETE(request: Request) {
  return handle(async () => {
    await requireSession(request);
    if (backupInProgress())
      return reply(
        {
          error:
            "Hệ thống đang sao lưu dữ liệu. Thử xóa ảnh lại sau ít phút.",
        },
        409,
      );
    const { id } = z
      .object({ id: z.uuid() })
      .parse(await jsonBody(request, 1000));
    const media = db()
      .prepare("SELECT name, alt FROM media WHERE id=?")
      .get(id) as { name: string; alt: string } | undefined;
    if (!media) {
      auditFailure(request, "media-delete", id, "Không tìm thấy ảnh");
      return reply({ error: "Không tìm thấy ảnh" }, 404);
    }
    const reference = `/api/media/${media.name}`;
    if (
      db()
        .prepare(
          "SELECT id FROM records WHERE instr(data,?)>0 OR instr(coalesce(published,''),?)>0 LIMIT 1",
        )
        .get(reference, reference)
    ) {
      auditFailure(
        request,
        "media-delete",
        id,
        "Ảnh còn được tham chiếu trong nội dung hoặc bản đã xuất bản",
        { name: media.name, alt: media.alt },
      );
      return reply(
        {
          error: "Ảnh còn được tham chiếu trong nội dung hoặc bản đã xuất bản",
        },
        409,
      );
    }
    await unlink(
      /* turbopackIgnore: true */ path.join(
        /* turbopackIgnore: true */ directory(),
        media.name,
      ),
    );
    db().prepare("DELETE FROM media WHERE id=?").run(id);
    auditRequest(request, "media-delete", id, {
      details: { name: media.name, alt: media.alt },
    });
    return reply({ ok: true });
  });
}
export async function PATCH(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const input = z
      .object({ id: z.uuid(), alt: z.string().trim().min(1).max(300) })
      .parse(await jsonBody(request, 2000));
    const previous = db()
      .prepare("SELECT name, alt FROM media WHERE id=?")
      .get(input.id) as { name: string; alt: string } | undefined;
    const result = db()
      .prepare("UPDATE media SET alt=? WHERE id=?")
      .run(input.alt, input.id);
    if (!result.changes) {
      auditFailure(request, "media-update", input.id, "Không tìm thấy ảnh tải lên");
      return reply({ error: "Không tìm thấy ảnh tải lên" }, 404);
    }
    auditRequest(request, "media-update", input.id, {
      details: {
        name: previous?.name ?? null,
        before: { alt: previous?.alt ?? null },
        after: { alt: input.alt },
      },
    });
    return reply({ ok: true });
  });
}

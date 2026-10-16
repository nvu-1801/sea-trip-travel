import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/server/auth/guard";
import { requireAdminApi } from "@/server/auth/session";
import { processUpload, validateUploadInput, MEDIA_MAX_BYTES } from "@/server/media/service";

/**
 * `POST /api/admin/media` — multipart image upload.
 *
 * Auth + same-origin (CSRF) are checked before a single byte is decoded. A route
 * handler is used rather than a Server Action because Server Actions cap the
 * body at ~1 MB by default, and a 10 MB photograph is a normal upload here.
 */
export async function POST(request: Request): Promise<Response> {
  const admin = await requireAdminApi();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập." }, { status: 401 });
  }
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Yêu cầu không hợp lệ." }, { status: 403 });
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MEDIA_MAX_BYTES + 1024 * 1024) {
    return NextResponse.json(
      {
        ok: false,
        error: `Ảnh vượt quá ${Math.round(MEDIA_MAX_BYTES / (1024 * 1024))} MB cho phép.`,
      },
      { status: 413 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Không đọc được dữ liệu tải lên." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Thiếu tệp ảnh." }, { status: 400 });
  }

  const guard = validateUploadInput(file);
  if (guard) return NextResponse.json({ ok: false, error: guard.message }, { status: 400 });

  const alt = typeof form.get("alt") === "string" ? String(form.get("alt")) : undefined;

  try {
    const outcome = await processUpload(file, { alt, originalName: file.name });
    if (!outcome.ok) {
      return NextResponse.json({ ok: false, error: outcome.problem.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, media: outcome.result.media });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    console.error(`[media] upload failed: ${detail}`);
    return NextResponse.json({ ok: false, error: "Không xử lý được ảnh." }, { status: 500 });
  }
}

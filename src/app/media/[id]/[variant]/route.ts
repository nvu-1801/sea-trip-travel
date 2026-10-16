import { NextResponse } from "next/server";
import { getMedia } from "@/server/repo/media";
import { readMediaFile } from "@/server/media/service";

/**
 * Serves uploaded media from `UPLOAD_DIR`.
 *
 * Files are streamed from disk rather than placed in `public/`, so an upload
 * never requires a rebuild and never ends up inside a serverless bundle. Static
 * media (the 28 approved photographs) keep their original `/images/...` URLs and
 * never come through here.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; variant: string }> },
): Promise<Response> {
  const { id, variant } = await params;

  const media = getMedia(id);
  if (!media || media.storage !== "upload" || media.deletedAt) {
    return new NextResponse("Not found", { status: 404 });
  }

  let file: { body: Buffer; mime: string } | null = null;
  try {
    file = readMediaFile(media, variant);
  } catch {
    file = null;
  }
  if (!file) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(file.body), {
    status: 200,
    headers: {
      "content-type": file.mime,
      "content-length": String(file.body.byteLength),
      // Media is content-addressed by sha256, so it is safe to cache hard.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

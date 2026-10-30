import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { session } from "@/server/cms/auth";
import { landingSections } from "@/server/cms/store";
import { parseYouTubeUrl } from "@/lib/youtube";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID = /^[A-Za-z0-9_-]{11}$/;
const CACHE_DIR = path.resolve(
  process.env.YOUTUBE_THUMB_CACHE_DIR ?? "data/youtube-thumbnails",
);

function configuredVideo(id: string): boolean {
  try {
    return landingSections().customers.videos.some(
      (video) => parseYouTubeUrl(video.youtubeUrl)?.id === id,
    );
  } catch {
    return false;
  }
}

function image(bytes: Uint8Array, cacheControl: string) {
  // Copy into a plain ArrayBuffer so the Blob part is independent of the
  // source buffer's lifetime and satisfies the DOM BodyInit types.
  const copy = new Uint8Array(bytes);
  return new Response(new Blob([copy.buffer], { type: "image/jpeg" }), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": cacheControl,
      "x-content-type-options": "nosniff",
    },
  });
}

/**
 * Same-origin YouTube thumbnail proxy.
 *
 * The public cards never call i.ytimg.com from the visitor's browser: this
 * route fetches the image once, stores it on the persistent data volume and
 * serves it from our own origin (allowed by the CSP). It only permits IDs that
 * are actually configured in the customers section, unless an admin session is
 * previewing a link that has not been saved yet.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!ID.test(id)) return new Response("Not found", { status: 404 });

  const configured = configuredVideo(id);
  if (!configured && !(await session())) {
    return new Response("Not found", { status: 404 });
  }
  const cacheControl = configured
    ? "public, max-age=31536000, immutable"
    : "private, max-age=3600";

  const file = path.join(CACHE_DIR, `${id}.jpg`);
  try {
    const cached = await readFile(file);
    return image(new Uint8Array(cached), cacheControl);
  } catch {
    // Not cached yet.
  }

  const sources = [
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  ];
  for (const source of sources) {
    try {
      const response = await fetch(source, {
        signal: AbortSignal.timeout(8000),
        headers: { accept: "image/jpeg,image/*" },
      });
      if (!response.ok) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength === 0) continue;
      try {
        await mkdir(CACHE_DIR, { recursive: true, mode: 0o700 });
        const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
        await writeFile(temporary, bytes);
        await rename(temporary, file);
      } catch {
        // A read-only cache directory must not break the image response.
      }
      return image(bytes, cacheControl);
    } catch {
      // Try the next size.
    }
  }
  return new Response("Not found", { status: 404 });
}

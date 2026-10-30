import { requireSession } from "@/server/cms/auth";
import { handle, reply } from "@/server/cms/http";
import { parseYouTubeUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

type OEmbed = {
  title?: unknown;
  author_name?: unknown;
  thumbnail_url?: unknown;
};

/**
 * Studio helper: read the public oEmbed title for a YouTube link so the owner
 * does not have to copy it by hand. The URL is normalised through
 * `parseYouTubeUrl` first, so this endpoint can never fetch an arbitrary host.
 */
export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const input = new URL(request.url).searchParams.get("url") ?? "";
    const parsed = parseYouTubeUrl(input);
    if (!parsed) {
      return reply({ error: "Link YouTube không hợp lệ." }, 400);
    }
    const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(
      parsed.watchUrl,
    )}&format=json`;
    try {
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(8000),
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        return reply(
          {
            error:
              "YouTube không trả về thông tin cho video này. Kiểm tra quyền xem hoặc link.",
          },
          502,
        );
      }
      const data = (await response.json()) as OEmbed;
      return reply({
        id: parsed.id,
        title:
          typeof data.title === "string" ? data.title.trim().slice(0, 160) : "",
        author:
          typeof data.author_name === "string"
            ? data.author_name.trim().slice(0, 120)
            : "",
      });
    } catch {
      return reply(
        { error: "Không kết nối được YouTube. Thử lại hoặc nhập tiêu đề tay." },
        502,
      );
    }
  });
}

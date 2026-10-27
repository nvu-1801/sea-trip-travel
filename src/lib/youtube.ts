/**
 * YouTube URL parsing for the customer-stories section.
 *
 * Only the forms the site actually supports are accepted, and the video id is
 * validated so the public page can build a safe embed URL from data — never
 * from HTML an admin typed.
 */

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
]);

export type YouTubeRef = {
  id: string;
  watchUrl: string;
  embedUrl: string;
};

export function parseYouTubeUrl(input: unknown): YouTubeRef | null {
  if (typeof input !== "string") return null;
  const text = input.trim();
  if (!text || text.length > 400) return null;
  if (/[<>"']/.test(text)) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!HOSTS.has(host)) return null;

  let id = "";
  if (host === "youtu.be") {
    id = url.pathname.split("/").filter(Boolean)[0] ?? "";
  } else if (url.pathname === "/watch") {
    id = url.searchParams.get("v") ?? "";
  } else {
    const match = url.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
    if (match) id = match[2];
  }
  if (!ID.test(id)) return null;
  return {
    id,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
  };
}

export function isYouTubeUrl(value: unknown): boolean {
  return parseYouTubeUrl(value) !== null;
}

import { requireSession } from "@/server/cms/auth";
import { list } from "@/server/cms/store";
import { handle, reply } from "@/server/cms/http";
import {
  buildAdminSearchItem,
  type AdminSearchItem,
} from "@/lib/admin-search";

/**
 * Compact index for the Studio quick search.
 *
 * Deliberately not the full records: tours carry long itineraries and articles
 * carry body blocks. The palette only needs identity, a readable subtitle and a
 * pre-folded haystack, so the browser can filter while typing without another
 * request per keystroke.
 */

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function textArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const items: AdminSearchItem[] = [];

    for (const row of list("tours")) {
      if (row.state === "deleted") continue;
      const data = row.data;
      const duration =
        data.duration && typeof data.duration === "object"
          ? (data.duration as Record<string, unknown>)
          : {};
      const days = Number(duration.days ?? 0);
      const nights = Number(duration.nights ?? 0);
      items.push(
        buildAdminSearchItem({
          kind: "tours",
          id: row.id,
          slug: text(data.slug),
          title: text(data.title) || row.id,
          subtitle: [
            text(data.tourCode),
            days > 0 ? `${days} ngày ${nights} đêm` : "",
          ]
            .filter(Boolean)
            .join(" · "),
          status: row.state,
          aliases: [
            text(data.summary),
            text(data.badge),
            ...textArray(data.tags),
          ],
        }),
      );
    }

    for (const row of list("articles")) {
      if (row.state === "deleted") continue;
      const data = row.data;
      items.push(
        buildAdminSearchItem({
          kind: "articles",
          id: row.id,
          slug: text(data.slug),
          title: text(data.title) || row.id,
          subtitle: text(data.slug),
          status: row.state,
          aliases: [text(data.excerpt), ...textArray(data.tags)],
        }),
      );
    }

    for (const row of list("destinations")) {
      if (row.state === "deleted") continue;
      const data = row.data;
      items.push(
        buildAdminSearchItem({
          kind: "destinations",
          id: row.id,
          slug: text(data.slug),
          title: text(data.name) || row.id,
          subtitle: text(data.province) || text(data.region),
          status: row.state,
          aliases: [text(data.summary)],
        }),
      );
    }

    for (const row of list("categories")) {
      if (row.state === "deleted") continue;
      const data = row.data;
      items.push(
        buildAdminSearchItem({
          kind: "categories",
          id: row.id,
          slug: text(data.slug),
          title: text(data.name) || row.id,
          subtitle: text(data.path),
          status: row.state,
          aliases: [text(data.description)],
        }),
      );
    }

    return reply({ items });
  });
}

import { requireSession } from "@/server/cms/auth";
import { list } from "@/server/cms/store";
import { handle, reply } from "@/server/cms/http";

/**
 * Reference options for the Studio pickers. Labels are what the owner reads —
 * category rows carry their parent trail (`Tour Quy Nhơn – Phú Yên › 1 ngày`)
 * and destinations carry their region, so nobody has to recognise an id.
 */
export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const categories = list("categories").filter(
      (row) => row.state !== "deleted",
    );
    const categoryById = new Map(categories.map((row) => [row.id, row]));
    const categoryLabel = (id: string) => {
      const parts: string[] = [];
      const seen = new Set<string>();
      let current = categoryById.get(id);
      while (current && parts.length < 8 && !seen.has(current.id)) {
        seen.add(current.id);
        parts.unshift(String(current.data.name ?? current.id));
        current = current.data.parentId
          ? categoryById.get(String(current.data.parentId))
          : undefined;
      }
      return parts.join(" › ") || id;
    };

    return reply(
      Object.fromEntries(
        (["categories", "destinations", "tours", "articles"] as const).map(
          (kind) => [
            kind,
            list(kind)
              .filter((row) => row.state !== "deleted")
              .map((row) => {
                if (kind === "tours" || kind === "articles")
                  return {
                    value: String(row.data.slug),
                    label: String(
                      row.data.title ??
                        row.data.name ??
                        row.data.slug ??
                        row.id,
                    ),
                  };
                if (kind === "destinations")
                  return {
                    value: row.id,
                    label: String(row.data.name ?? row.id),
                  };
                return {
                  value: row.id,
                  label: categoryLabel(row.id),
                };
              }),
          ],
        ),
      ),
    );
  });
}

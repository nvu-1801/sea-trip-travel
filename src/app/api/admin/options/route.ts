import { requireSession } from "@/server/cms/auth";
import { list } from "@/server/cms/store";
import { handle, reply } from "@/server/cms/http";
export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const result = Object.fromEntries(
      (["categories", "destinations", "tours", "articles"] as const).map(
        (kind) => [
          kind,
          list(kind)
            .filter((row) => row.state !== "deleted")
            .map((row) => ({
              value:
                kind === "tours" || kind === "articles"
                  ? String(row.data.slug)
                  : row.id,
              label: String(row.data.name ?? row.data.title),
            })),
        ],
      ),
    );
    return reply({
      ...result,
      tourIds: list("tours")
        .filter((row) => row.state !== "deleted")
        .map((row) => ({ value: row.id, label: String(row.data.title) })),
    });
  });
}

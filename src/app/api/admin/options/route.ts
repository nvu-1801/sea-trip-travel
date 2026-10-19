import { requireSession } from "@/server/cms/auth";
import { list } from "@/server/cms/store";
import { handle, reply } from "@/server/cms/http";
export async function GET(request: Request) {
  return handle(async () => {
    await requireSession(request);
    return reply(
      Object.fromEntries(
        (["categories", "destinations", "tours"] as const).map((kind) => [
          kind,
          list(kind)
            .filter((row) => row.state !== "deleted")
            .map((row) => ({
              value: kind === "tours" ? String(row.data.slug) : row.id,
              label: String(row.data.name ?? row.data.title),
            })),
        ]),
      ),
    );
  });
}

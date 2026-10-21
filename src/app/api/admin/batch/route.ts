import { z } from "zod";
import { requireSession } from "@/server/cms/auth";
import { saveBatch, schemas, type Collection } from "@/server/cms/store";
import { handle, jsonBody, reply } from "@/server/cms/http";
export async function POST(request: Request) {
  return handle(async () => {
    await requireSession(request);
    const changes = z
      .array(
        z.object({
          collection: z
            .string()
            .refine((value) => Object.hasOwn(schemas, value)),
          data: z.unknown(),
          paths: z
            .array(
              z
                .array(
                  z
                    .string()
                    .min(1)
                    .max(80)
                    .refine(
                      (key) =>
                        !["__proto__", "constructor", "prototype"].includes(
                          key,
                        ),
                    ),
                )
                .max(8),
            )
            .min(1)
            .max(100)
            .optional(),
          revision: z.number().int().nonnegative(),
          action: z.enum(["save", "publish", "unpublish", "delete", "restore"]),
        }),
      )
      .min(1)
      .max(8)
      .parse(await jsonBody(request, 2400000));
    return reply(
      saveBatch(
        changes.map((change) => ({
          ...change,
          collection: change.collection as Collection,
        })),
      ),
    );
  });
}

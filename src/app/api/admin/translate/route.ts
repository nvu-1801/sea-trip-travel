import { handleTranslate } from "@/server/translation/route-handler";

/**
 * POST /api/admin/translate
 *
 * Admin-only, same-origin + CSRF checked inside `handleTranslate`. It never
 * writes to the database: the response is copied into the form by the client
 * and only the normal Save/Publish action persists it.
 */
export async function POST(request: Request) {
  return handleTranslate(request);
}

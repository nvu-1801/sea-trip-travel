import { HttpError } from "./auth";
import { ZodError } from "zod";
export async function jsonBody(request: Request, max = 600000) {
  if (Number(request.headers.get("content-length") ?? 0) > max)
    throw new HttpError(413, "Dữ liệu quá lớn");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Thiếu dữ liệu");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, "Dữ liệu quá lớn");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new HttpError(400, "JSON không hợp lệ");
  }
}
export function reply(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
export async function handle(operation: () => Promise<Response>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof HttpError)
      return reply({ error: error.message }, error.status);
    if (error instanceof ZodError)
      return reply(
        {
          error: error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .slice(0, 8)
            .join(" · "),
        },
        400,
      );
    console.error(
      "[cms] request failed",
      error instanceof Error ? error.message : "unknown",
    );
    return reply(
      {
        error: error instanceof Error ? error.message : "Yêu cầu không hợp lệ",
      },
      400,
    );
  }
}

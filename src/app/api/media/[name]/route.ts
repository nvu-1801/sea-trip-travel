import { readFile } from "node:fs/promises";
import path from "node:path";
import { cmsDataDir } from "@/server/cms/db";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const { name } = await params;
  if (!/^[a-f0-9-]{36}\.webp$/.test(name))
    return new Response(null, { status: 404 });
  try {
    const data = await readFile(
      /* turbopackIgnore: true */ path.join(
        /* turbopackIgnore: true */ process.env.CMS_UPLOAD_DIR ??
          path.join(cmsDataDir(), "uploads"),
        name,
      ),
    );
    return new Response(data, {
      headers: {
        "content-type": "image/webp",
        "cache-control": "public,max-age=31536000,immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

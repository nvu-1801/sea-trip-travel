import { db } from "@/server/cms/db";
export const dynamic = "force-dynamic";
export function GET() {
  try {
    if (
      process.env.CMS_ENABLED === "1" &&
      !/^[a-f0-9]{64}$/i.test(process.env.LEAD_ENCRYPTION_KEY ?? "")
    )
      throw new Error("Missing lead encryption key");
    if (process.env.CMS_ENABLED === "1") db().prepare("SELECT 1").get();
    return Response.json(
      {
        status: "ok",
        service: "sea-trip-travel",
        sha: process.env.APP_SHA ?? "local",
        database: process.env.CMS_ENABLED === "1" ? "connected" : "disabled",
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "error" }, { status: 503 });
  }
}

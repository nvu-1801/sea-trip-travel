import { redirect } from "next/navigation";
import { session } from "@/server/cms/auth";

/**
 * Every Studio section is a real URL. The auth gate lives once here, so a
 * direct link to `/admin/tours` or `/admin/destinations` redirects to the
 * dedicated sign-in page instead of rendering a half-empty workspace.
 */
export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await session())) redirect("/admin/login");
  return children;
}

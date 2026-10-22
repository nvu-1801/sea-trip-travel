import { redirect } from "next/navigation";
import { session } from "@/server/cms/auth";
import { AdminLogin } from "@/features/admin/login-screen";

export const metadata = {
  title: "Đăng nhập · SEA TRIP Studio",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await session()) redirect("/admin");
  const query = await searchParams;
  const next = first(query.next);
  return (
    <AdminLogin
      next={next?.startsWith("/admin") ? next : "/admin"}
      loggedOut={first(query.loggedOut) === "1"}
      expired={first(query.expired) === "1"}
    />
  );
}

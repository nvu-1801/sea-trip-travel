import { notFound } from "next/navigation";
import { session } from "@/server/cms/auth";
import { contentVersion } from "@/server/cms/db";
import { Dashboard } from "@/features/admin/dashboard";
import { isAdminSection } from "@/lib/admin-routes";

const LABELS: Record<string, string> = {
  home: "Trang chủ",
  theme: "Giao diện",
  tours: "Tour du lịch",
  articles: "Cẩm nang",
  categories: "Danh mục",
  destinations: "Điểm đến",
  media: "Thư viện ảnh",
  messages: "Nội dung VI / EN",
  settings: "Website & footer",
  leads: "Yêu cầu tư vấn",
  activity: "Kiểm tra hoạt động",
  account: "Bảo mật",
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  return {
    title: `${LABELS[section] ?? "Studio"} · SEA TRIP Studio`,
  };
}

export default async function AdminSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { section } = await params;
  if (!isAdminSection(section) || section === "overview") notFound();
  const value = await session();
  const query = await searchParams;
  return (
    <Dashboard
      section={section}
      initialEdit={first(query.edit)}
      initialCsrf={value?.csrf ?? null}
      initialVersion={value ? contentVersion("admin") : undefined}
    />
  );
}

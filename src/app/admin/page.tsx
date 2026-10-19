import { session } from "@/server/cms/auth";
import { Dashboard } from "@/features/admin/dashboard";
import { contentVersion } from "@/server/cms/db";
export default async function AdminPage() {
  const value = await session();
  return (
    <Dashboard
      initialCsrf={value?.csrf ?? null}
      initialVersion={value ? contentVersion("admin") : undefined}
    />
  );
}

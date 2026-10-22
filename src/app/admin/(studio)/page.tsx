import { session } from "@/server/cms/auth";
import { Dashboard } from "@/features/admin/dashboard";
import { contentVersion } from "@/server/cms/db";

export default async function AdminOverviewPage() {
  const value = await session();
  return (
    <Dashboard
      section="overview"
      initialCsrf={value?.csrf ?? null}
      initialVersion={value ? contentVersion("admin") : undefined}
    />
  );
}

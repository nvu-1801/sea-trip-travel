"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useContentUpdates } from "@/lib/use-content-updates";

export function LiveContent({ version }: { version: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useContentUpdates({
    enabled: true,
    url: "/api/content-version",
    initialVersion: version,
    onChange: () => {
      if (pending) return false;
      startTransition(() => router.refresh());
      return true;
    },
  });
  return null;
}

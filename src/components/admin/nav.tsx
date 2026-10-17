"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Admin navigation.
 *
 * The active item is derived from the pathname, so no page has to pass state.
 */

export type NavItem = { href: string; label: string; icon: string };

export const ADMIN_NAV: readonly NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: "▦" },
  { href: "/admin/tours", label: "Tour", icon: "🧭" },
  { href: "/admin/articles", label: "Bài viết", icon: "📝" },
  { href: "/admin/media", label: "Thư viện ảnh", icon: "🖼️" },
  { href: "/admin/leads", label: "Yêu cầu tư vấn", icon: "📨" },
  { href: "/admin/trash", label: "Thùng rác", icon: "🗑️" },
  { href: "/admin/settings", label: "Trang chủ & liên hệ", icon: "⚙️" },
  { href: "/admin/account", label: "Tài khoản", icon: "🔑" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ variant = "sidebar" }: { variant?: "sidebar" | "mobile" }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <ul className={cn("flex-col gap-1", variant === "sidebar" ? "flex" : "flex")}>
      {ADMIN_NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary-soft text-primary-strong"
                  : "text-foreground-muted hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {item.icon}
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  if (variant === "mobile") {
    return (
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-strong bg-surface px-3.5 text-sm font-semibold text-foreground"
        >
          <span aria-hidden="true">☰</span>
          Menu
        </button>
        {open ? (
          <nav id="admin-mobile-nav" aria-label="Điều hướng quản trị" className="mt-3 rounded-2xl border border-border bg-surface p-3 shadow-card">
            {links}
          </nav>
        ) : null}
      </div>
    );
  }

  return (
    <nav aria-label="Điều hướng quản trị" className="hidden lg:block">
      {links}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/apparel", label: "Products", match: (p: string) => p === "/admin/apparel" || (/^\/admin\/apparel\/[^/]+$/.test(p) && !/^\/admin\/apparel\/(home|collections)$/.test(p)) },
  { href: "/admin/apparel/home", label: "Home", match: (p: string) => p === "/admin/apparel/home" },
  { href: "/admin/apparel/collections", label: "Collections", match: (p: string) => p.startsWith("/admin/apparel/collections") },
];

/** Sub-navigation for /admin/apparel: Products (list + editor) · Home · Collections. */
export function ApparelTabs() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Apparel sections" className="flex gap-1 border-b">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-xs font-bold uppercase tracking-wide ${
              active ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

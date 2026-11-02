"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  Contact,
  FileText,
  Home,
  Image as ImageIcon,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  Search,
  Share2,
  Shirt,
  ShoppingBag,
  Ticket,
  UserCheck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavCounts } from "@/lib/admin/nav-counts";
import { openCommandPalette } from "@/components/admin/CommandPalette";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Only the exact path is active (Home), not every /admin/* child. */
  exact?: boolean;
  badge?: keyof NavCounts;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

// Grouping per the admin dashboard PRD (P1). Link targets are unchanged from
// the flat D-038..D-044 list; only Home and Analytics are new.
const SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/admin", label: "Home", icon: Home, exact: true },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Commerce",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag, badge: "ordersToShip" },
      { href: "/admin/customers", label: "Customers", icon: Contact },
      { href: "/admin/discounts", label: "Discounts", icon: Ticket },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/apparel", label: "Apparel", icon: Shirt },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/heroes", label: "Heroes", icon: ImageIcon },
      { href: "/admin/banners", label: "Banners", icon: Megaphone },
      { href: "/admin/blog", label: "Blog", icon: FileText },
      { href: "/admin/social-media", label: "Social Media", icon: Share2 },
    ],
  },
  {
    title: "Community",
    items: [
      { href: "/admin/subscribers", label: "Subscribers", icon: Users },
      { href: "/admin/messages", label: "Messages", icon: MessageSquare, badge: "unreadMessages" },
      { href: "/admin/events", label: "Events", icon: CalendarDays },
      { href: "/admin/staff", label: "Check-in Staff", icon: UserCheck },
    ],
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/**
 * Admin sidebar: grouped nav with icons, count badges and a left accent bar on
 * the active item. Below `md` it collapses to a top bar with a menu toggle that
 * slides the same panel in from the left.
 */
export function AdminSidebar({ email, counts }: { email: string | null; counts: NavCounts }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
        <Link href="/admin" className="font-semibold tracking-tight">
          Private Stock Admin
        </Link>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="admin-sidebar"
          onClick={() => setOpen((v) => !v)}
          className="rounded p-1.5 hover:bg-neutral-100"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      {open && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
        />
      )}

      <aside
        id="admin-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r bg-white p-4 transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link href="/admin" className="mb-4 font-semibold tracking-tight">
          Private Stock Admin
        </Link>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            openCommandPalette();
          }}
          className="mb-4 flex w-full items-center gap-2 rounded border bg-white px-2.5 py-1.5 text-sm text-neutral-500 hover:bg-neutral-100"
        >
          <Search className="size-4 shrink-0" aria-hidden />
          <span>Search…</span>
          <kbd className="ml-auto rounded border px-1 font-mono text-[10px] text-neutral-400">⌘K</kbd>
        </button>
        <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {SECTIONS.map((section, i) => (
            <div key={section.title ?? i} className="flex flex-col gap-1">
              {section.title && (
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const active = isActive(pathname, item);
                const badge = item.badge ? counts[item.badge] : 0;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "relative flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-neutral-100",
                      active &&
                        "bg-neutral-100 font-medium before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-neutral-900 before:content-['']",
                    )}
                  >
                    <Icon className="size-4 shrink-0 text-neutral-500" aria-hidden />
                    <span className="truncate">{item.label}</span>
                    {badge > 0 && (
                      <span className="ml-auto rounded-full bg-neutral-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <form action="/admin/logout" method="post" className="mt-6">
          <Button variant="outline" size="sm" type="submit" className="w-full">
            Sign out
          </Button>
        </form>
        <p className="mt-3 truncate text-xs text-neutral-500">{email}</p>
      </aside>
    </>
  );
}

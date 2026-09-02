import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { Button } from "@/components/ui/button";

// Order locked in the /admin build-out session (D-038..D-044).
const SECTIONS = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/apparel", label: "Apparel" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/heroes", label: "Heroes" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/social-media", label: "Social Media" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/subscribers", label: "Subscribers" },
  { href: "/admin/messages", label: "Messages" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense in depth — proxy.ts already gates /admin/*, re-verify here.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminEmail(user?.email)) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <aside className="flex w-56 flex-col border-r bg-white p-4">
        <Link href="/admin" className="mb-6 font-semibold tracking-tight">
          Private Stock Admin
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded px-3 py-2 text-sm hover:bg-neutral-100"
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <form action="/admin/logout" method="post" className="mt-6">
          <Button variant="outline" size="sm" type="submit" className="w-full">
            Sign out
          </Button>
        </form>
        <p className="mt-3 truncate text-xs text-neutral-500">{user?.email}</p>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

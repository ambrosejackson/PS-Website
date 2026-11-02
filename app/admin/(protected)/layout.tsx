import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { getNavCounts } from "@/lib/admin/nav-counts";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { CommandPalette } from "@/components/admin/CommandPalette";

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

  // Badge counts (orders to ship, unread messages). Sections and link order
  // live in components/admin/AdminSidebar.tsx.
  const counts = await getNavCounts();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-100 md:flex-row">
      <AdminSidebar email={user?.email ?? null} counts={counts} />
      <main className="flex-1 p-4 md:p-8">{children}</main>
      <CommandPalette />
    </div>
  );
}

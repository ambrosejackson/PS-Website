import { createAdminClient } from "@/lib/supabase/admin";
import { adminAllowedEmails } from "@/lib/admin/allowlist";
import { StaffManager } from "./StaffManager";

export const dynamic = "force-dynamic";

/** /admin/staff — check-in-only accounts (D-096). Admins themselves are managed via ADMIN_ALLOWED_EMAILS in Vercel. */
export default async function StaffPage() {
  const { data } = await createAdminClient().from("staff_roles").select("*").order("created_at");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Check-in staff</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          People here can sign in at <code>/admin/login</code> and use the event check-in screen only. They can&apos;t see
          orders, products, subscribers or anything else in admin. Admins ({adminAllowedEmails().join(", ")}) already have
          check-in access.
        </p>
      </div>
      <StaffManager staff={(data ?? []).map((s) => ({ email: s.email, created_at: s.created_at, created_by: s.created_by }))} />
    </div>
  );
}

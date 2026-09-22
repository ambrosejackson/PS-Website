import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";

/**
 * Who may use the event check-in screen (D-096): admins (ADMIN_ALLOWED_EMAILS)
 * plus anyone in staff_roles with role 'checkin'. Check-in staff never satisfy
 * isAdminEmail(), so proxy.ts and the (protected) admin layout keep them out of
 * the rest of /admin.
 */
export interface StaffAccess {
  email: string | null;
  isAdmin: boolean;
  canCheckIn: boolean;
}

export async function getStaffAccess(): Promise<StaffAccess> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.toLowerCase() ?? null;
  if (!email) return { email: null, isAdmin: false, canCheckIn: false };
  if (isAdminEmail(email)) return { email, isAdmin: true, canCheckIn: true };
  const admin = createAdminClient();
  const { data } = await admin.from("staff_roles").select("role").eq("email", email).maybeSingle();
  return { email, isAdmin: false, canCheckIn: data?.role === "checkin" };
}

export async function requireAdmin(): Promise<string> {
  const a = await getStaffAccess();
  if (!a.isAdmin || !a.email) throw new Error("Unauthorized");
  return a.email;
}

export async function requireCheckIn(): Promise<string> {
  const a = await getStaffAccess();
  if (!a.canCheckIn || !a.email) throw new Error("Unauthorized");
  return a.email;
}

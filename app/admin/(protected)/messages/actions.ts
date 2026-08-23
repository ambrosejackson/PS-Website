"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import type { Database } from "@/lib/database.types";

export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
export type MessageStatus = "new" | "read" | "archived";
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

export async function setMessageStatus(id: string, status: MessageStatus): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  if (!["new", "read", "archived"].includes(status)) return { ok: false, error: "Bad status." };
  const { error } = await createAdminClient().from("messages").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/messages");
  revalidatePath(`/admin/messages/${id}`);
  return { ok: true, data: undefined };
}

/** Opening a "new" message marks it read (called from the detail page). */
export async function markMessageRead(id: string): Promise<void> {
  if (!(await requireAdmin())) return;
  await createAdminClient().from("messages").update({ status: "read" }).eq("id", id).eq("status", "new");
  revalidatePath("/admin/messages");
}

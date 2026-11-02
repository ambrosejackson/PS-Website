import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { chicagoDayKey } from "@/lib/admin/chicago";

/**
 * Sidebar badge counts (admin dashboard P1). Service-role reads, same pattern
 * as /admin/orders; authorization is the (protected) layout + proxy.ts gate.
 * The two definitions here are shared with lib/admin/dashboard.ts.
 */

export type Db = ReturnType<typeof createAdminClient>;

export interface NavCounts {
  ordersToShip: number;
  unreadMessages: number;
}

/**
 * Orders to ship: paid, fulfillment new or packed, and either not a pre-order
 * or a pre-order whose ships_after date has arrived (Chicago today).
 */
export async function countOrdersToShip(db: Db, today = chicagoDayKey()): Promise<number> {
  const { count } = await db
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid")
    .in("fulfillment_status", ["new", "packed"])
    .or(`ships_after.is.null,ships_after.lte.${today}`);
  return count ?? 0;
}

/** Unread = messages.status = 'new' (opening a message flips it to 'read'). */
export async function countUnreadMessages(db: Db): Promise<number> {
  const { count } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");
  return count ?? 0;
}

export async function getNavCounts(): Promise<NavCounts> {
  const db = createAdminClient();
  try {
    const [ordersToShip, unreadMessages] = await Promise.all([
      countOrdersToShip(db),
      countUnreadMessages(db),
    ]);
    return { ordersToShip, unreadMessages };
  } catch {
    // A badge must never take the admin shell down with it.
    return { ordersToShip: 0, unreadMessages: 0 };
  }
}

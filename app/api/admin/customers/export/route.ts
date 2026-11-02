import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/events/staff";
import { listAllCustomers } from "@/lib/admin/customers";
import { toCsv } from "@/lib/csv";

/**
 * CSV of the Customers list with the current search applied (D-142). API
 * routes do not inherit the (protected) layout, so the admin allowlist is
 * re-checked here via requireAdmin() (D-129 pattern), as the analytics export does.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const rows = await listAllCustomers(q);
  const csv = toCsv(
    ["email", "name", "paid_orders", "net_revenue", "last_order", "subscriber", "subscriber_brand", "rewards_account", "rsvps"],
    rows.map((c) => [
      c.email,
      c.name,
      c.paidOrders,
      (c.netRevenueCents / 100).toFixed(2),
      c.lastOrderAt,
      c.subscriber ? "Y" : "N",
      c.subscriber?.brand ?? "",
      c.hasAccount ? "Y" : "N",
      c.rsvps,
    ]),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

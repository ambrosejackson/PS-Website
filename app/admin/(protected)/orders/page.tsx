import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { money } from "@/lib/commerce/config";
import { FULFILLMENT_LABEL, FULFILLMENT_TONE, shortOrderId } from "@/components/site/OrderSummary";

export const dynamic = "force-dynamic";

const STATUSES = ["new", "placed_with_provider", "packed", "shipped", "delivered", "canceled"] as const;

/** /admin/orders — paid orders, newest first; search by email / id; filter by status (D-041). */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; all?: string }>;
}) {
  const { q = "", status = "", all } = await searchParams;
  const db = createAdminClient();
  let query = db
    .from("orders")
    .select("id, created_at, email, customer_name, payment_provider, status, fulfillment_status, total_cents, promo_code")
    .order("created_at", { ascending: false })
    .limit(200);
  // Default view hides abandoned pending/failed checkouts; ?all=1 shows them.
  if (!all) query = query.in("status", ["paid", "submitted_to_provider", "shipped", "delivered", "refunded"]);
  if (status) query = query.eq("fulfillment_status", status);
  const needle = q.trim().toLowerCase();
  if (needle) {
    query = needle.length >= 8 && /^[0-9a-f-]+$/.test(needle) ? query.ilike("id", `${needle}%`) : query.ilike("email", `%${needle}%`);
  }
  const { data: rows, error } = await query;

  const counts: Record<string, number> = {};
  const { data: countRows } = await db.from("orders").select("fulfillment_status").in("status", ["paid", "submitted_to_provider", "shipped", "delivered"]);
  for (const r of countRows ?? []) counts[r.fulfillment_status] = (counts[r.fulfillment_status] ?? 0) + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Orders</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          Paid merch orders from Stripe and PayPal. Work each one new → placed with provider → packed → shipped →
          delivered. Refunds are issued in the processor dashboards — the flag here is a marker only.
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-2 rounded border bg-white p-3" method="get">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search email or order id"
          className="h-9 min-w-64 rounded-md border px-3 text-sm"
        />
        <select name="status" defaultValue={status} className="h-9 rounded-md border bg-white px-2 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {FULFILLMENT_LABEL[s]} ({counts[s] ?? 0})
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-neutral-600">
          <input type="checkbox" name="all" value="1" defaultChecked={!!all} /> include pending / failed
        </label>
        <button type="submit" className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
          Filter
        </button>
        <Link href="/admin/orders" className="text-xs text-neutral-500 underline">
          Clear
        </Link>
      </form>

      {error && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error.message}</p>}
      {!error && (rows ?? []).length === 0 && (
        <p className="rounded border border-dashed p-6 text-sm text-neutral-400">No orders yet</p>
      )}
      {(rows ?? []).length > 0 && (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2">Order</th>
                <th className="px-4 py-2">Placed</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Rail</th>
                <th className="px-4 py-2">Fulfillment</th>
                <th className="px-4 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(rows ?? []).map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/orders/${o.id}`} className="font-mono font-medium hover:underline">
                      #{shortOrderId(o.id)}
                    </Link>
                    {o.status !== "paid" && (
                      <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] uppercase">{o.status}</span>
                    )}
                    {o.promo_code && <span className="ml-2 text-[10px] text-neutral-500">promo {o.promo_code}</span>}
                  </td>
                  <td className="px-4 py-2 text-neutral-600">
                    {new Date(o.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-2">
                    <div>{o.customer_name ?? "—"}</div>
                    <div className="text-xs text-neutral-500">{o.email}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${o.payment_provider === "paypal" ? "bg-[#ffc439]/40 text-[#003087]" : "bg-[#635bff]/15 text-[#3b2fd9]"}`}>
                      {o.payment_provider}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${FULFILLMENT_TONE[o.fulfillment_status] ?? ""}`}>
                      {FULFILLMENT_LABEL[o.fulfillment_status] ?? o.fulfillment_status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{money(o.total_cents ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

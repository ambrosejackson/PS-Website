import Link from "next/link";
import { money } from "@/lib/commerce/config";
import { listCustomers, type CustomerList } from "@/lib/admin/customers";
import { DASH, PanelLink } from "@/components/admin/panels";

export const dynamic = "force-dynamic";

function fmtDate(iso: string | null): string {
  if (!iso) return DASH;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
}

/**
 * /admin/customers (D-142): one row per lowercased email across paid orders,
 * subscribers, RSVPs and rewards accounts. Search by email or name; net
 * revenue desc; 50 per page; CSV of the current search.
 */
export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  let list: CustomerList = { rows: [], total: 0, page, pageSize: 50 };
  let loadError: string | null = null;
  try {
    list = await listCustomers({ q, page });
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load customers.";
  }
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (p > 1) u.set("page", String(p));
    const s = u.toString();
    return `/admin/customers${s ? `?${s}` : ""}`;
  };
  const exportHref = `/api/admin/customers/export${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Customers</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          Everyone the site knows by email: paid orders, newsletter subscribers, event RSVPs and rewards accounts,
          merged on the lowercased address. Read-only.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-center gap-2 rounded border bg-white p-3">
        <input name="q" defaultValue={q} placeholder="Search email or name" className="h-9 min-w-64 rounded-md border px-3 text-sm" />
        <button type="submit" className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white">
          Search
        </button>
        <Link href="/admin/customers" className="text-xs text-neutral-500 underline">
          Clear
        </Link>
        <span className="ml-auto">
          <PanelLink href={exportHref}>Export CSV</PanelLink>
        </span>
      </form>

      {loadError && <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
      {!loadError && list.rows.length === 0 && (
        <p className="rounded border border-dashed p-6 text-sm text-neutral-400">{q ? "No customers match." : "No customers yet"}</p>
      )}
      {list.rows.length > 0 && (
        <div className="overflow-x-auto rounded border bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2 text-right">Paid orders</th>
                <th className="px-4 py-2 text-right">Net revenue</th>
                <th className="px-4 py-2">Last order</th>
                <th className="px-4 py-2">Subscriber</th>
                <th className="px-4 py-2">Rewards</th>
                <th className="px-4 py-2 text-right">RSVPs</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.rows.map((c) => (
                <tr key={c.email} className="hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link href={`/admin/customers/${encodeURIComponent(c.email)}`} className="font-medium hover:underline">
                      {c.email}
                    </Link>
                    <div className="text-xs text-neutral-500">{c.name ?? DASH}</div>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">{c.paidOrders}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{c.paidOrders > 0 ? money(c.netRevenueCents) : DASH}</td>
                  <td className="px-4 py-2 text-neutral-600">{fmtDate(c.lastOrderAt)}</td>
                  <td className="px-4 py-2">
                    {c.subscriber ? (
                      <>
                        Y{c.subscriber.brand && <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] uppercase text-neutral-700">{c.subscriber.brand}</span>}
                      </>
                    ) : (
                      <span className="text-neutral-400">N</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{c.hasAccount ? "Y" : <span className="text-neutral-400">N</span>}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{c.rsvps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loadError && (
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <span>
            {list.total.toLocaleString("en-US")} {list.total === 1 ? "customer" : "customers"}
            {pages > 1 && ` · page ${list.page} of ${pages}`}
          </span>
          {pages > 1 && (
            <span className="flex gap-3">
              {list.page > 1 && (
                <Link href={href(list.page - 1)} className="underline">
                  Previous
                </Link>
              )}
              {list.page < pages && (
                <Link href={href(list.page + 1)} className="underline">
                  Next
                </Link>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

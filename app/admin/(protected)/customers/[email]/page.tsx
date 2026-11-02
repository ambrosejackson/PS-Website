import Link from "next/link";
import { notFound } from "next/navigation";
import { money } from "@/lib/commerce/config";
import { getCustomerDetail } from "@/lib/admin/customers";
import { DASH, Empty, Kpi, Panel } from "@/components/admin/panels";
import { FULFILLMENT_LABEL, FULFILLMENT_TONE, shortOrderId } from "@/components/site/OrderSummary";

export const dynamic = "force-dynamic";

function fmtDate(iso: string | null): string {
  if (!iso) return DASH;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/Chicago" });
}

/** /admin/customers/[email] (D-142): summary, orders, RSVPs, subscriber and profile rows. Read-only. */
export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ email: string }> }) {
  const { email: raw } = await params;
  let email: string;
  try {
    email = decodeURIComponent(raw);
  } catch {
    notFound();
  }
  const c = await getCustomerDetail(email);
  if (!c) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="text-xs text-neutral-500 hover:underline">
          ← Customers
        </Link>
        <h1 className="mt-1 break-all font-condensed text-2xl font-bold uppercase tracking-tight">{c.email}</h1>
        <p className="mt-1 text-sm text-neutral-600">{c.name ?? "No name on file"}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="Paid orders" value={String(c.paidOrders)} />
        <Kpi label="Net revenue" value={c.paidOrders > 0 ? money(c.netRevenueCents) : DASH} sub="total less refunds" />
        <Kpi label="Last order" value={fmtDate(c.lastOrderAt)} />
        <Kpi label="Subscriber" value={c.subscriber ? "Yes" : "No"} sub={c.subscriber?.brand ?? undefined} />
        <Kpi label="Rewards account" value={c.hasAccount ? "Yes" : "No"} sub={`${c.rsvps} confirmed ${c.rsvps === 1 ? "RSVP" : "RSVPs"}`} />
      </div>

      <Panel title="Orders">
        {c.orders.length === 0 ? (
          <Empty>No paid orders.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-2 py-1.5">Date</th>
                  <th className="px-2 py-1.5">Order</th>
                  <th className="px-2 py-1.5 text-right">Total</th>
                  <th className="px-2 py-1.5">Status</th>
                  <th className="px-2 py-1.5">Fulfillment</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {c.orders.map((o) => (
                  <tr key={o.id}>
                    <td className="px-2 py-1.5 text-neutral-600">{fmtDate(o.paid_at ?? o.created_at)}</td>
                    <td className="px-2 py-1.5">
                      <Link href={`/admin/orders/${o.id}`} className="font-mono font-medium hover:underline">
                        #{shortOrderId(o.id)}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {money(o.total_cents ?? 0)}
                      {o.refunded_cents > 0 && <span className="ml-1 text-xs text-red-600">−{money(o.refunded_cents)}</span>}
                    </td>
                    <td className="px-2 py-1.5 text-xs uppercase text-neutral-600">{o.status}</td>
                    <td className="px-2 py-1.5">
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${FULFILLMENT_TONE[o.fulfillment_status] ?? ""}`}>
                        {FULFILLMENT_LABEL[o.fulfillment_status] ?? o.fulfillment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="RSVPs">
          {c.rsvpRows.length === 0 ? (
            <Empty>No event RSVPs.</Empty>
          ) : (
            <ul className="divide-y text-sm">
              {c.rsvpRows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {r.event ? (
                      <Link href={`/admin/events/${r.event.slug}`} className="font-medium hover:underline">
                        {r.event.name}
                      </Link>
                    ) : (
                      <span className="font-medium">Event</span>
                    )}
                    <span className="ml-2 text-xs text-neutral-500">{r.event ? fmtDate(r.event.starts_at) : DASH}</span>
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${r.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-700"}`}>
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title="Subscriber">
            {c.subscriberRow ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-neutral-500">Persona</dt>
                <dd>{c.subscriberRow.persona}</dd>
                <dt className="text-neutral-500">Brand</dt>
                <dd>{c.subscriberRow.brand_context ?? DASH}</dd>
                <dt className="text-neutral-500">Source</dt>
                <dd className="font-mono text-xs">{c.subscriberRow.source_path}</dd>
                <dt className="text-neutral-500">Consented</dt>
                <dd>{fmtDate(c.subscriberRow.consented_at)}</dd>
                <dt className="text-neutral-500">PSM sync</dt>
                <dd>{c.subscriberRow.synced_to_psm_at ? fmtDate(c.subscriberRow.synced_to_psm_at) : "not yet"}</dd>
              </dl>
            ) : (
              <Empty>Not a newsletter subscriber.</Empty>
            )}
          </Panel>

          <Panel title="Rewards profile">
            {c.profile ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-neutral-500">Name</dt>
                <dd>
                  {c.profile.first_name} {c.profile.last_name}
                </dd>
                <dt className="text-neutral-500">ZIP</dt>
                <dd>{c.profile.zip ?? DASH}</dd>
                <dt className="text-neutral-500">Marketing opt-in</dt>
                <dd>{c.profile.marketing_opt_in_at ? fmtDate(c.profile.marketing_opt_in_at) : "No"}</dd>
                <dt className="text-neutral-500">Joined</dt>
                <dd>{fmtDate(c.profile.created_at)}</dd>
              </dl>
            ) : (
              <Empty>No rewards account.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

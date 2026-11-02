import Link from "next/link";
import { Plus } from "lucide-react";
import { getDashboardData } from "@/lib/admin/dashboard";
import { chicagoDayKey } from "@/lib/admin/chicago";
import { money } from "@/lib/commerce/config";
import { FULFILLMENT_LABEL, FULFILLMENT_TONE, shortOrderId } from "@/components/site/OrderSummary";
import { SalesChart } from "@/components/admin/SalesChart";
import { DASH, Empty, Kpi, Panel, plural } from "@/components/admin/panels";

export const dynamic = "force-dynamic";

const QUICK_ACTIONS = [
  { href: "/admin/products/new", label: "Product" },
  { href: "/admin/apparel/new", label: "Apparel" },
  { href: "/admin/blog/new", label: "Blog post" },
];

function TodoRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-neutral-100">
        <span>{children}</span>
        <span aria-hidden className="text-neutral-400">
          →
        </span>
      </Link>
    </li>
  );
}


/** /admin — dashboard over the website's own tables (admin dashboard PRD, P1). */
export default async function AdminHomePage() {
  const data = await getDashboardData();
  const { kpis, todo } = data;
  const todayKey = chicagoDayKey();

  const todos = [
    todo.ordersToShip > 0 && (
      <TodoRow key="ship" href="/admin/orders?status=new">
        {plural(todo.ordersToShip, "order")} to ship
      </TodoRow>
    ),
    todo.preordersReady > 0 && (
      <TodoRow key="pre" href="/admin/orders?status=new">
        {plural(todo.preordersReady, "pre-order")} ready to ship
      </TodoRow>
    ),
    todo.withProvider > 0 && (
      <TodoRow key="provider" href="/admin/orders?status=placed_with_provider">
        {todo.withProvider} with provider
      </TodoRow>
    ),
    todo.unreadMessages > 0 && (
      <TodoRow key="msg" href="/admin/messages?status=new">
        {plural(todo.unreadMessages, "unread message")}
      </TodoRow>
    ),
    todo.productsNoImage > 0 && (
      <TodoRow key="img" href="/admin/products">
        {plural(todo.productsNoImage, "product")} with no image
      </TodoRow>
    ),
    todo.lowStock > 0 && (
      <TodoRow key="stock" href="/admin/apparel">
        {plural(todo.lowStock, "variant")} low on stock
      </TodoRow>
    ),
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">{data.greeting}</h1>
          <p className="mt-1 text-sm text-neutral-600">Here&rsquo;s how privatestock.co is doing.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex items-center gap-1 rounded bg-neutral-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-neutral-800"
            >
              <Plus className="size-3.5" aria-hidden /> {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Today" value={money(kpis.today.cents)} sub={plural(kpis.today.orders, "paid order")} />
        <Kpi label="Last 7 days" value={money(kpis.d7.cents)} sub={plural(kpis.d7.orders, "paid order")} />
        <Kpi label="Last 30 days" value={money(kpis.d30.cents)} sub={plural(kpis.d30.orders, "paid order")} />
        <Kpi
          label="Average order 30d"
          value={kpis.avgOrderCents === null ? DASH : money(kpis.avgOrderCents)}
          sub={kpis.avgOrderCents === null ? "no paid orders yet" : "revenue ÷ orders"}
        />
        <Kpi label="Visitors 7d" value={kpis.visitors7.toLocaleString("en-US")} sub={plural(kpis.pageviews7, "page view")} />
        <Kpi
          label="Conversion 30d"
          value={kpis.conversion30.rate === null ? DASH : `${(kpis.conversion30.rate * 100).toFixed(1)}%`}
          sub={
            kpis.conversion30.rate === null
              ? "no sessions yet"
              : `${kpis.conversion30.purchases} of ${kpis.conversion30.sessions.toLocaleString("en-US")} sessions`
          }
        />
      </div>

      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900">
          <span className="group-open:hidden">More</span>
          <span className="hidden group-open:inline">Less</span>
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Subscribers 7d" value={kpis.subscribers7.toLocaleString("en-US")} sub="new sign-ups" />
          {kpis.rsvps !== null && (
            <Kpi label="RSVPs" value={kpis.rsvps.toLocaleString("en-US")} sub="confirmed, upcoming events" />
          )}
          <Kpi label="Pre-orders pending" value={kpis.preordersPending.toLocaleString("en-US")} sub="ship date not reached" />
        </div>
      </details>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel
            title="Sales · last 30 days"
            action={
              <Link href="/admin/orders" className="text-xs font-semibold uppercase tracking-wide text-neutral-600 hover:underline">
                All orders
              </Link>
            }
          >
            <SalesChart days={data.sales.days} series={data.sales.series} todayKey={todayKey} />
            <p className="mt-2 text-[11px] text-neutral-400">
              All = order totals. Apparel / Other = line-item subtotals by merch category, before shipping, tax and discounts.
            </p>
          </Panel>
        </div>
        <Panel title="To do">
          {todos.length === 0 ? <Empty>Nothing waiting on you.</Empty> : <ul className="-mx-2 space-y-0.5">{todos}</ul>}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Recent orders">
            {data.recentOrders.length === 0 ? (
              <Empty>No orders yet</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="py-1.5 pr-3 font-medium">Date</th>
                      <th className="py-1.5 pr-3 font-medium">Customer</th>
                      <th className="py-1.5 pr-3 text-right font-medium">Total</th>
                      <th className="py-1.5 pr-3 font-medium">Status</th>
                      <th className="py-1.5 font-medium">Fulfillment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="whitespace-nowrap py-2 pr-3 text-neutral-600">
                          <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                            {new Date(o.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              timeZone: "America/Chicago",
                            })}
                            <span className="ml-1 font-mono text-[11px] text-neutral-400">{shortOrderId(o.id)}</span>
                          </Link>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="truncate">{o.customer_name ?? DASH}</div>
                          <div className="truncate text-xs text-neutral-500">{o.email ?? ""}</div>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{o.total_cents === null ? DASH : money(o.total_cents)}</td>
                        <td className="py-2 pr-3 capitalize text-neutral-600">{o.status}</td>
                        <td className="py-2">
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
        </div>

        <div className="space-y-4">
          <Panel title="Top products · 30d">
            {data.topProducts.length === 0 ? (
              <Empty>No items sold in the last 30 days.</Empty>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {data.topProducts.map((p) => (
                  <li key={p.title} className="flex items-center justify-between gap-3">
                    <span className="truncate">{p.title}</span>
                    <span className="shrink-0 tabular-nums text-neutral-500">×{p.qty}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
          <Panel title="Top referrers · 7d">
            {data.topReferrers.length === 0 ? (
              <Empty>No outside referrers in the last 7 days.</Empty>
            ) : (
              <ol className="space-y-1.5 text-sm">
                {data.topReferrers.map((r) => (
                  <li key={r.host} className="flex items-center justify-between gap-3">
                    <span className="truncate">{r.host}</span>
                    <span className="shrink-0 tabular-nums text-neutral-500">{r.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

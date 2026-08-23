import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderWithItems, type ShippingAddressJson } from "@/lib/commerce/orders";
import { money } from "@/lib/commerce/config";
import {
  addressLines,
  FULFILLMENT_LABEL,
  FULFILLMENT_TONE,
  OrderItems,
  OrderTotals,
  shortOrderId,
} from "@/components/site/OrderSummary";
import { OrderActions } from "../OrderActions";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderWithItems(id);
  if (!order) notFound();
  const addr = order.shipping_address as ShippingAddressJson | null;
  const addressText = addressLines(addr).join("\n");
  const tracking = (order.tracking as { carrier?: string; number?: string; url?: string | null } | null) ?? null;
  const hasProviderItems = order.order_items.some((i) => i.fulfillment_provider && i.fulfillment_provider !== "self");
  const providerCounts = order.order_items.reduce<Record<string, number>>((m, i) => {
    const k = i.fulfillment_provider ?? "self";
    m[k] = (m[k] ?? 0) + i.qty;
    return m;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="text-xs text-neutral-500 hover:underline">
          ← Orders
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Order #{shortOrderId(order.id)}</h1>
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${FULFILLMENT_TONE[order.fulfillment_status] ?? ""}`}>
            {FULFILLMENT_LABEL[order.fulfillment_status] ?? order.fulfillment_status}
          </span>
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${order.payment_provider === "paypal" ? "bg-[#ffc439]/40 text-[#003087]" : "bg-[#635bff]/15 text-[#3b2fd9]"}`}>
            {order.payment_provider}
          </span>
          {order.status !== "paid" && <span className="rounded bg-neutral-200 px-2 py-0.5 text-[11px] uppercase">{order.status}</span>}
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {new Date(order.created_at).toLocaleString()} · {order.id}
          {order.stripe_payment_intent ? ` · PI ${order.stripe_payment_intent}` : ""}
          {order.paypal_capture_id ? ` · PayPal capture ${order.paypal_capture_id}` : ""}
        </p>
        <p className="mt-2 text-sm">
          Fulfillment: {Object.entries(providerCounts).map(([k, n]) => `${n} × ${k.toUpperCase()}`).join(" · ")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <div className="rounded border bg-white p-4">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Items</h2>
            <OrderItems items={order.order_items} showProvider />
            <OrderTotals o={order} />
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded border bg-white p-4 text-sm">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Customer</h2>
              <p>{order.customer_name ?? "—"}</p>
              <p className="text-neutral-600">{order.email ?? "—"}</p>
              {order.promo_code && <p className="mt-2 text-xs text-neutral-500">Promo used: <code>{order.promo_code}</code> (−{money(order.discount_cents ?? 0)})</p>}
            </div>
            <div className="rounded border bg-white p-4 text-sm">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Payment</h2>
              <p>{order.payment_provider === "paypal" ? "PayPal" : "Stripe"} · {money(order.total_cents ?? 0)}</p>
              <p className="text-xs text-neutral-500">tax {money(order.tax_cents ?? 0)} · shipping {money(order.shipping_cents ?? 0)}{order.stripe_tax_calculation_id ? ` · Stripe Tax calc ${order.stripe_tax_calculation_id}` : ""}</p>
              {order.paid_at && <p className="text-xs text-neutral-500">paid {new Date(order.paid_at).toLocaleString()}</p>}
            </div>
          </div>
        </div>
        <OrderActions
          id={order.id}
          fulfillmentStatus={order.fulfillment_status}
          status={order.status}
          tracking={tracking}
          note={order.internal_note}
          addressText={addressText}
          hasProviderItems={hasProviderItems}
        />
      </div>
    </div>
  );
}

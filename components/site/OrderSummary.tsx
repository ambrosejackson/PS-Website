import { money } from "@/lib/commerce/config";
import type { OrderItemRow, OrderWithItems, ShippingAddressJson } from "@/lib/commerce/orders";

/** Shared order renderer (customer page + admin detail): items, totals, address. */

export const FULFILLMENT_LABEL: Record<string, string> = {
  new: "New",
  placed_with_provider: "Placed with provider",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  canceled: "Canceled",
};

export const FULFILLMENT_TONE: Record<string, string> = {
  new: "bg-amber-100 text-amber-900",
  placed_with_provider: "bg-blue-100 text-blue-900",
  packed: "bg-indigo-100 text-indigo-900",
  shipped: "bg-green-100 text-green-900",
  delivered: "bg-neutral-200 text-neutral-800",
  canceled: "bg-red-100 text-red-900",
};

export function shortOrderId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function addressLines(a: ShippingAddressJson | null | undefined): string[] {
  if (!a) return [];
  return [a.name, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(", "), a.country]
    .filter((x): x is string => !!x && String(x).trim().length > 0)
    .map(String);
}

export function ProviderTag({ provider }: { provider: string | null }) {
  const p = provider ?? "self";
  const cls =
    p === "printify" ? "bg-blue-100 text-blue-900" : p === "tapstitch" ? "bg-pink-100 text-pink-900" : "bg-green-100 text-green-900";
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>{p}</span>;
}

export function OrderItems({ items, showProvider = false }: { items: OrderItemRow[]; showProvider?: boolean }) {
  return (
    <ul className="divide-y border-y">
      {items.map((i) => (
        <li key={i.id} className="flex gap-3 py-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden bg-[#f5f5f5]">
            {i.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={i.image_url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{i.title ?? "Item"}</p>
            <p className="text-xs text-neutral-500">
              {i.variant_label}
              {i.sku ? ` · SKU ${i.sku}` : ""} · qty {i.qty}
            </p>
            {showProvider && (
              <div className="mt-1">
                <ProviderTag provider={i.fulfillment_provider} />
              </div>
            )}
          </div>
          <p className="shrink-0 text-sm text-ink">{money(i.unit_price_cents * i.qty)}</p>
        </li>
      ))}
    </ul>
  );
}

export function OrderTotals({ o }: { o: OrderWithItems }) {
  return (
    <dl className="mt-3 space-y-1 text-sm">
      <div className="flex justify-between"><dt className="text-neutral-500">Subtotal</dt><dd>{money(o.subtotal_cents ?? 0)}</dd></div>
      {o.discount_cents ? (
        <div className="flex justify-between"><dt className="text-neutral-500">Discount{o.promo_code ? ` (${o.promo_code})` : ""}</dt><dd>− {money(o.discount_cents)}</dd></div>
      ) : null}
      <div className="flex justify-between"><dt className="text-neutral-500">Shipping</dt><dd>{o.shipping_cents ? money(o.shipping_cents) : "FREE"}</dd></div>
      <div className="flex justify-between"><dt className="text-neutral-500">Tax</dt><dd>{money(o.tax_cents ?? 0)}</dd></div>
      <div className="flex justify-between border-t pt-1 font-semibold"><dt>Total</dt><dd>{money(o.total_cents ?? 0)}</dd></div>
    </dl>
  );
}

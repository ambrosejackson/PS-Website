"use client";

import Link from "next/link";
import { useCart, type CartLine } from "@/lib/cart/context";
import { FREE_SHIPPING_THRESHOLD_CENTS, money } from "@/lib/commerce/config";

/**
 * Cart line items shared by the drawer and /apparel/cart: thumbnail, name,
 * "Size · Color", qty stepper, remove, line total.
 */
export function CartLines({ lines, onNavigate, compact = false }: { lines: CartLine[]; onNavigate?: () => void; compact?: boolean }) {
  const cart = useCart();
  return (
    <ul className={`divide-y divide-hairline ${compact ? "" : "border-y border-hairline"}`}>
      {lines.map((l) => (
        <li key={l.variantId} className={`flex gap-4 ${compact ? "py-4" : "py-5"}`}>
          <Link href={`/apparel/${l.slug}`} onClick={onNavigate} className={`shrink-0 overflow-hidden bg-[#f0f0f0] ${compact ? "h-20 w-20" : "h-28 w-28"}`}>
            {l.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={l.image} alt="" className="h-full w-full object-cover" />
            ) : null}
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/apparel/${l.slug}`} onClick={onNavigate} className="block truncate font-condensed text-sm font-semibold uppercase tracking-wide text-ink">
              {l.name}
            </Link>
            <p className="mt-0.5 text-xs text-neutral-500">{l.variantLabel || l.sku}</p>
            <p className="mt-1 text-sm text-ink">{money(l.priceCents)}</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="inline-flex items-center border border-hairline">
                <button type="button" aria-label={`Decrease quantity of ${l.name}`} onClick={() => cart.setQty(l.variantId, l.qty - 1)} className="px-2.5 py-1 text-sm">
                  −
                </button>
                <span className="min-w-8 text-center text-sm" aria-live="polite">
                  {l.qty}
                </span>
                <button type="button" aria-label={`Increase quantity of ${l.name}`} onClick={() => cart.setQty(l.variantId, l.qty + 1)} className="px-2.5 py-1 text-sm">
                  +
                </button>
              </div>
              <button type="button" onClick={() => cart.remove(l.variantId)} className="text-xs text-neutral-500 underline hover:text-ink">
                Remove
              </button>
            </div>
          </div>
          <p className="shrink-0 text-sm font-medium text-ink">{money(l.priceCents * l.qty)}</p>
        </li>
      ))}
    </ul>
  );
}

/** Items / Subtotal / free-shipping progress / disclaimer — shared footer numbers. */
export function CartSummary({ className = "" }: { className?: string }) {
  const cart = useCart();
  return (
    <div className={`space-y-2 text-sm ${className}`}>
      <div className="flex justify-between">
        <span className="text-neutral-500">Items</span>
        <span>{cart.count}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-semibold text-ink">Subtotal</span>
        <span className="font-semibold text-ink">{money(cart.subtotalCents)}</span>
      </div>
      <FreeShippingProgress />
      <p className="text-xs text-neutral-400">Shipping, taxes, and discount codes are calculated at checkout.</p>
    </div>
  );
}

export function FreeShippingProgress() {
  const cart = useCart();
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - cart.subtotalCents);
  const pct = Math.min(100, Math.round((cart.subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100));
  return (
    <div className="space-y-1">
      <div className="h-1 w-full bg-hairline" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress to free shipping">
        <div className="h-full bg-ink transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
      </div>
      {remaining > 0 ? (
        <p className="text-xs text-neutral-500">
          <span className="font-semibold text-ink">{money(remaining)}</span> away from free shipping.
        </p>
      ) : (
        <p className="text-xs text-green-700">You&apos;ve unlocked free shipping.</p>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/context";
import { centsToFreeShipping, money } from "@/lib/commerce/config";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Cart drawer (header cart icon). Lines: image / name / variant / price, qty
 * edit + remove, subtotal, shipping line with the free-shipping nudge, "Taxes
 * calculated at checkout", CHECKOUT → /apparel/checkout.
 */
export function CartDrawer() {
  const cart = useCart();
  const toFree = centsToFreeShipping(cart.subtotalCents);

  return (
    <Sheet open={cart.open} onOpenChange={cart.setOpen}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-condensed uppercase tracking-wide">
            Your cart{cart.count > 0 ? ` (${cart.count})` : ""}
          </SheetTitle>
          <SheetDescription>
            {cart.count > 0
              ? "Merch & apparel ship from Chicago. Secure checkout with Apple Pay, Google Pay, cards, Link, Cash App Pay or PayPal."
              : "Your cart is empty."}
          </SheetDescription>
        </SheetHeader>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
            <p className="text-sm text-neutral-500">Nothing here yet.</p>
            <Link
              href="/apparel"
              onClick={() => cart.setOpen(false)}
              className="bg-ink px-6 py-3 font-condensed text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-ink/85"
            >
              Shop Apparel
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-4">
              {cart.lines.map((l) => (
                <li key={l.variantId} className="flex gap-3 py-4">
                  <Link
                    href={`/apparel/${l.slug}`}
                    onClick={() => cart.setOpen(false)}
                    className="h-20 w-20 shrink-0 overflow-hidden bg-[#f5f5f5]"
                  >
                    {l.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={l.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/apparel/${l.slug}`}
                      onClick={() => cart.setOpen(false)}
                      className="block truncate font-condensed text-sm font-semibold uppercase tracking-wide text-ink"
                    >
                      {l.name}
                    </Link>
                    <p className="text-xs text-neutral-500">{l.variantLabel || l.sku}</p>
                    <p className="mt-1 text-sm text-ink">{money(l.priceCents)}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="inline-flex items-center border border-hairline">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => cart.setQty(l.variantId, l.qty - 1)}
                          className="px-2.5 py-1 text-sm"
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center text-sm">{l.qty}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => cart.setQty(l.variantId, l.qty + 1)}
                          className="px-2.5 py-1 text-sm"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => cart.remove(l.variantId)}
                        className="text-xs text-neutral-500 underline hover:text-ink"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-ink">{money(l.priceCents * l.qty)}</p>
                </li>
              ))}
            </ul>

            <div className="space-y-2 border-t px-4 py-4 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal</span>
                <span>{money(cart.subtotalCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Shipping</span>
                <span>{cart.shippingCents === 0 ? "FREE" : money(cart.shippingCents)}</span>
              </div>
              {toFree > 0 ? (
                <p className="text-xs text-neutral-500">
                  You&apos;re <span className="font-semibold text-ink">{money(toFree)}</span> from free shipping.
                </p>
              ) : (
                <p className="text-xs text-green-700">You&apos;ve unlocked free shipping.</p>
              )}
              <p className="text-xs text-neutral-400">Taxes calculated at checkout.</p>
              <Link
                href="/apparel/checkout"
                onClick={() => cart.setOpen(false)}
                className="mt-2 block bg-ink py-3.5 text-center font-condensed text-sm font-semibold uppercase tracking-[0.16em] text-white hover:bg-ink/85"
              >
                Checkout — {money(cart.subtotalCents + cart.shippingCents)}
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart/context";
import { money } from "@/lib/commerce/config";
import { CartLines, CartSummary } from "./CartLines";

/** /apparel/cart — the full-page cart behind the drawer's "View cart" (D-075). */
export function CartPage() {
  const cart = useCart();
  if (cart.lines.length === 0) {
    return (
      <div className="border border-dashed border-hairline p-12 text-center">
        <p className="font-condensed text-base uppercase tracking-wide text-ink">Your cart is empty</p>
        <Link href="/apparel/shop" className="mt-5 inline-block bg-ink px-6 py-3 font-condensed text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-ink/85">
          Continue shopping
        </Link>
      </div>
    );
  }
  return (
    <div className="grid gap-10 md:grid-cols-[1fr_320px] md:gap-16">
      <CartLines lines={cart.lines} />
      <aside className="h-fit border border-hairline p-5 md:sticky md:top-6">
        <CartSummary />
        <Link
          href="/apparel/checkout"
          className="mt-5 block bg-ink py-3.5 text-center font-condensed text-sm font-semibold uppercase tracking-[0.16em] text-white hover:bg-ink/85"
        >
          Check out — {money(cart.subtotalCents)}
        </Link>
        <Link href="/apparel/shop" className="nav-underline mx-auto mt-3 block w-fit font-condensed text-xs font-semibold uppercase tracking-wide text-ink">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}

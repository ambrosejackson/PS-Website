"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart/context";
import { centsToFreeShipping, money, SHIP_COUNTRIES } from "@/lib/commerce/config";
import { PayPalSection } from "@/components/site/PayPalSection";

/**
 * Checkout: cart summary (left) + two payment paths (right).
 *  - Stripe: POST /api/stripe/checkout with cart + optional promo → redirect to
 *    Stripe Checkout (address, tax, wallets, promo codes handled there).
 *  - PayPal: we collect email + shipping address here (needed for the Stripe
 *    Tax calculation that keeps both rails identical), then the PayPal buttons
 *    create/capture via our server routes.
 * Prices shown are the cart snapshot; every server route re-prices from the DB.
 */

export interface ShippingAddress {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

const EMPTY_ADDRESS: ShippingAddress = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: SHIP_COUNTRIES[0],
};

export function CheckoutClient({
  stripeReady,
  paypalClientId,
}: {
  stripeReady: boolean;
  paypalClientId: string | null;
}) {
  const cart = useCart();
  const [promo, setPromo] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [stripeBusy, setStripeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toFree = centsToFreeShipping(cart.subtotalCents);

  async function payWithStripe() {
    setError(null);
    setStripeBusy(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cart.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          promoCode: promo.trim() || null,
          email: email.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) {
        setError(body.error ?? "Could not start checkout — please try again.");
        setStripeBusy(false);
        return;
      }
      window.location.href = body.url;
    } catch {
      setError("Network error — please try again.");
      setStripeBusy(false);
    }
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mt-10 border border-dashed border-hairline p-12 text-center">
        <p className="font-condensed text-sm uppercase tracking-wide text-neutral-400">Your cart is empty.</p>
        <Link
          href="/apparel"
          className="mt-4 inline-block bg-ink px-6 py-3 font-condensed text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-ink/85"
        >
          Shop Apparel
        </Link>
      </div>
    );
  }

  const inputCls = "h-10 w-full border border-hairline px-3 text-sm text-ink outline-none focus:border-ink";

  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
      {/* ---- Summary ---- */}
      <div>
        <h2 className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400">Order summary</h2>
        <ul className="mt-4 divide-y border-y">
          {cart.lines.map((l) => (
            <li key={l.variantId} className="flex gap-3 py-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden bg-[#f5f5f5]">
                {l.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.image} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-condensed text-sm font-semibold uppercase tracking-wide text-ink">{l.name}</p>
                <p className="text-xs text-neutral-500">
                  {l.variantLabel || l.sku} · qty {l.qty}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <button type="button" onClick={() => cart.setQty(l.variantId, l.qty - 1)} className="border border-hairline px-2">−</button>
                  <button type="button" onClick={() => cart.setQty(l.variantId, l.qty + 1)} className="border border-hairline px-2">+</button>
                  <button type="button" onClick={() => cart.remove(l.variantId)} className="text-neutral-500 underline">Remove</button>
                </div>
              </div>
              <p className="shrink-0 text-sm text-ink">{money(l.priceCents * l.qty)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-neutral-500">Subtotal</span><span>{money(cart.subtotalCents)}</span></div>
          <div className="flex justify-between"><span className="text-neutral-500">Shipping</span><span>{cart.shippingCents === 0 ? "FREE" : money(cart.shippingCents)}</span></div>
          {toFree > 0 ? (
            <p className="text-xs text-neutral-500">You&apos;re <span className="font-semibold text-ink">{money(toFree)}</span> from free shipping.</p>
          ) : (
            <p className="text-xs text-green-700">Free shipping applied.</p>
          )}
          <div className="flex justify-between"><span className="text-neutral-500">Tax</span><span className="text-neutral-500">Calculated at checkout</span></div>
          <div className="flex justify-between border-t pt-2 font-semibold"><span>Before tax</span><span>{money(cart.subtotalCents + cart.shippingCents)}</span></div>
        </div>
        <div className="mt-6">
          <label className="font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-400" htmlFor="promo">
            Promo code (optional)
          </label>
          <input
            id="promo"
            value={promo}
            onChange={(e) => setPromo(e.target.value.toUpperCase())}
            placeholder="PS15-XXXXXX"
            className={`${inputCls} mt-1 font-mono uppercase`}
          />
          <p className="mt-1 text-xs text-neutral-400">Newsletter codes are one-time and first-order only.</p>
        </div>
      </div>

      {/* ---- Payment paths ---- */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <div className="border border-hairline p-5">
          <h2 className="font-condensed text-sm font-semibold uppercase tracking-wide text-ink">Pay with card / wallet</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Apple Pay, Google Pay, Link, Cash App Pay or any card. Shipping address and tax are collected on the next
            screen.
          </p>
          <button
            type="button"
            onClick={payWithStripe}
            disabled={!stripeReady || stripeBusy}
            className="mt-5 w-full bg-ink py-3.5 font-condensed text-sm font-semibold uppercase tracking-[0.16em] text-white hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {stripeBusy ? "Redirecting…" : "Continue to secure checkout"}
          </button>
          {!stripeReady && <p className="mt-2 text-xs text-amber-700">Card checkout isn&apos;t configured on this deployment yet.</p>}
        </div>

        <div className="border border-hairline p-5">
          <h2 className="font-condensed text-sm font-semibold uppercase tracking-wide text-ink">PayPal</h2>
          <p className="mt-1 text-xs text-neutral-500">Enter your email and shipping address so we can calculate tax, then pay with PayPal.</p>
          <div className="mt-4 grid gap-2">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email for your receipt" className={inputCls} autoComplete="email" />
            <input value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} placeholder="Full name" className={inputCls} autoComplete="name" />
            <input value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} placeholder="Address" className={inputCls} autoComplete="address-line1" />
            <input value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} placeholder="Apt, suite (optional)" className={inputCls} autoComplete="address-line2" />
            <div className="grid grid-cols-[1fr_70px_90px] gap-2">
              <input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="City" className={inputCls} autoComplete="address-level2" />
              <input value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="IL" className={inputCls} autoComplete="address-level1" />
              <input value={address.postal_code} onChange={(e) => setAddress({ ...address, postal_code: e.target.value })} placeholder="ZIP" className={inputCls} autoComplete="postal-code" inputMode="numeric" />
            </div>
          </div>
          <div className="mt-4">
            <PayPalSection clientId={paypalClientId} email={email} address={address} promoCode={promo.trim() || null} />
          </div>
        </div>
        {error && <p className="md:col-span-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}

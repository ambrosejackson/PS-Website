"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useCart } from "@/lib/cart/context";
import type { ShippingAddress } from "@/components/site/CheckoutClient";

/**
 * PayPal JS SDK buttons → our server routes (create-order prices the cart,
 * validates the promo and runs the Stripe Tax calculation; capture-order
 * captures + finalizes). Requires email + shipping address first (for tax).
 */
export function PayPalSection({
  clientId,
  email,
  address,
  promoCode,
}: {
  clientId: string | null;
  email: string;
  address: ShippingAddress;
  promoCode: string | null;
}) {
  const cart = useCart();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [totals, setTotals] = useState<{ taxCents: number; totalCents: number } | null>(null);

  if (!clientId) {
    return <p className="text-xs text-amber-700">PayPal isn&apos;t configured on this deployment yet.</p>;
  }
  const ready =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    address.name.trim() &&
    address.line1.trim() &&
    address.city.trim() &&
    address.state.trim() &&
    address.postal_code.trim();

  return (
    <div className="space-y-2">
      {!ready && <p className="text-xs text-neutral-500">Fill in email + shipping address to enable PayPal.</p>}
      {totals && (
        <p className="text-xs text-neutral-600">
          Tax ${(totals.taxCents / 100).toFixed(2)} · Total ${(totals.totalCents / 100).toFixed(2)}
        </p>
      )}
      <div className={ready ? "" : "pointer-events-none opacity-40"}>
        <PayPalScriptProvider
          options={{ clientId, currency: "USD", intent: "capture", components: "buttons", disableFunding: "card" }}
        >
          <PayPalButtons
            style={{ layout: "vertical", shape: "rect", label: "paypal", height: 44 }}
            disabled={!ready}
            forceReRender={[cart.lines, email, address, promoCode]}
            createOrder={async () => {
              setError(null);
              const res = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  lines: cart.lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
                  email,
                  address,
                  promoCode,
                }),
              });
              const body = await res.json().catch(() => ({}));
              if (!res.ok || !body.id) {
                const msg = body.error ?? "Could not start PayPal checkout.";
                setError(msg);
                throw new Error(msg);
              }
              if (body.totals) setTotals({ taxCents: body.totals.taxCents, totalCents: body.totals.totalCents });
              return body.id as string;
            }}
            onApprove={async (data) => {
              const res = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paypalOrderId: data.orderID }),
              });
              const body = await res.json().catch(() => ({}));
              if (!res.ok || !body.orderId) {
                setError(body.error ?? "PayPal capture failed.");
                return;
              }
              cart.clear();
              router.push(`/apparel/order/${body.orderId}?token=${encodeURIComponent(data.orderID)}`);
            }}
            onError={(err) => {
              setError(err instanceof Error ? err.message : "PayPal error — please try again.");
            }}
            onCancel={() => setError(null)}
          />
        </PayPalScriptProvider>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

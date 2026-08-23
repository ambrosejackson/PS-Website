"use client";

import type { ShippingAddress } from "@/components/site/CheckoutClient";

/**
 * PayPal buttons slot. Wired to the PayPal JS SDK + our create/capture routes in
 * the PayPal commit; until then it explains the state honestly.
 */
export function PayPalSection({
  clientId,
}: {
  clientId: string | null;
  email: string;
  address: ShippingAddress;
  promoCode: string | null;
}) {
  if (!clientId) {
    return <p className="text-xs text-amber-700">PayPal isn&apos;t configured on this deployment yet.</p>;
  }
  return <p className="text-xs text-neutral-500">PayPal buttons load here.</p>;
}

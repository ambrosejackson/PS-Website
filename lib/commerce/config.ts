/**
 * Merch commerce rules (D-039): flat shipping $6.99, FREE at $75+ merchandise
 * subtotal (before discounts), Stripe Tax on both rails. Shared by the cart
 * UI, the Stripe session builder and the PayPal order builder so the totals
 * are computed by ONE function everywhere.
 */

export const SHIPPING_FLAT_CENTS = 699;
export const FREE_SHIPPING_THRESHOLD_CENTS = 7500;
export const CURRENCY = "usd";
/** Stripe Tax product tax code for general tangible goods (merch & apparel). */
export const TAX_CODE_GOODS = "txcd_99999999";
/** Stripe Tax code for shipping. */
export const TAX_CODE_SHIPPING = "txcd_92010001";
export const SHIP_COUNTRIES = ["US"] as const;
export const CART_STORAGE_KEY = "ps_cart_v1";
export const MAX_QTY_PER_LINE = 10;

export function shippingCents(subtotalCents: number): number {
  return subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FLAT_CENTS;
}

/** Cents still needed to unlock free shipping (0 when already free). */
export function centsToFreeShipping(subtotalCents: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents);
}

export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

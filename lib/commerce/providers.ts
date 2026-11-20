/**
 * Fulfillment providers (D-145..D-147). `self` is the Elk Grove Village facility;
 * every other key is a print-on-demand vendor Ambrose places orders with BY HAND
 * (no store connection, no API). Vendor names, keys and dashboard URLs are
 * internal: public pages receive only the finished `madeToOrderLine()` string,
 * resolved server-side (lib/commerce/providers.server.ts).
 *
 * This module is pure (no server imports) so the admin editor can use the key
 * list; the DB loader lives in providers.server.ts.
 */

export const PROVIDER_KEYS = ["self", "printify", "tapstitch", "nycfactory", "podpartner"] as const;
export type ProviderKey = (typeof PROVIDER_KEYS)[number];

/** Label for the in-house option in the admin dropdown. */
export const SELF_LABEL = "In-house (Elk Grove Village)";

export function isProviderKey(v: unknown): v is ProviderKey {
  return typeof v === "string" && (PROVIDER_KEYS as readonly string[]).includes(v);
}

/** True for every provider except `self` (null / unknown counts as in-house). */
export function isPod(key: string | null | undefined): boolean {
  return !!key && key !== "self";
}

export type ProviderDays = {
  production_days_min: number | null;
  production_days_max: number | null;
};

/**
 * The customer-facing line for a made-to-order product:
 *   both days set and different → "Made to order · ships in 3–7 business days"
 *   both set and equal          → "Made to order · ships in 5 business days"
 *   either missing              → "Made to order"
 */
export function madeToOrderLine(provider: ProviderDays | null | undefined): string {
  const min = provider?.production_days_min;
  const max = provider?.production_days_max;
  const ok = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;
  if (!ok(min) || !ok(max)) return "Made to order";
  if (min === max) return `Made to order · ships in ${min} business days`;
  const [lo, hi] = min < max ? [min, max] : [max, min];
  return `Made to order · ships in ${lo}–${hi} business days`;
}

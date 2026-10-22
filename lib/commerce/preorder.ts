/**
 * Pre-order helpers (D-123): a product with `ships_after` set is sold now and
 * ships by that date. One formatter so every surface — product page, cart,
 * Stripe page, PayPal review, order page, email — says the same thing.
 */

/** "January 31, 2027" from an ISO date (YYYY-MM-DD or full ISO); null when unset or past. */
export function formatShipsAfter(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** The line shown wherever a pre-order item appears. */
export function preorderLine(iso: string | null | undefined): string | null {
  const t = formatShipsAfter(iso);
  return t ? `Pre-order · ships by ${t}` : null;
}

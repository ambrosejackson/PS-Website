/**
 * Client-safe pieces of the discount model (D-142): code generation, status
 * derivation and labels. The server-only queries live in lib/commerce/discounts.ts.
 */

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

export const MAX_CODES_PER_BATCH = 50;

/** `PS{pct}-XXXXXX`; the newsletter flow passes 15. */
export function generateCode(pct = 15): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const suffix = Array.from(bytes)
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join("");
  return `PS${pct}-${suffix}`;
}

export type DiscountStatus = "open" | "redeemed" | "expired";
export const DISCOUNT_STATUSES: DiscountStatus[] = ["open", "redeemed", "expired"];
export const DISCOUNT_STATUS_LABEL: Record<DiscountStatus, string> = { open: "Open", redeemed: "Redeemed", expired: "Expired" };

/** Redeemed wins over expired (a used code stays "Redeemed" after its expiry passes). */
export function discountStatus(row: { redeemed_at: string | null; expires_at: string | null }, now = new Date()): DiscountStatus {
  if (row.redeemed_at) return "redeemed";
  if (row.expires_at && new Date(row.expires_at) <= now) return "expired";
  return "open";
}

export function isDiscountStatus(v: unknown): v is DiscountStatus {
  return v === "open" || v === "redeemed" || v === "expired";
}

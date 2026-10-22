/**
 * Merch commerce rules (D-039, revised D-120): USPS-only domestic shipping,
 * rated live by ZIP through Shippo (lib/shipping/shippo.ts). Two services —
 * Standard (USPS Ground Advantage) and Priority (USPS Priority Mail). Standard
 * is FREE at $75+ merchandise subtotal (before discounts); Priority is always
 * its quoted price. If Shippo is unavailable the cart falls back to one flat
 * Standard rate so checkout never blocks (the order is flagged). Stripe Tax on
 * both rails. Shared by the cart UI, the quote route, the Stripe session
 * builder and the PayPal order builder so the totals are computed by ONE set
 * of functions everywhere.
 */

export const FREE_SHIPPING_THRESHOLD_CENTS = 7500;
/** Charged only when Shippo cannot quote (D-120 decision 6). */
export const SHIPPING_FALLBACK_CENTS = 699;
export const CURRENCY = "usd";
/** Stripe Tax product tax code for general tangible goods (merch & apparel). */
export const TAX_CODE_GOODS = "txcd_99999999";
/** Stripe Tax code for shipping. */
export const TAX_CODE_SHIPPING = "txcd_92010001";
export const SHIP_COUNTRIES = ["US"] as const;
export const CART_STORAGE_KEY = "ps_cart_v1";
/** ZIP + chosen service live beside the cart so the choice survives reloads. */
export const SHIPPING_PREF_STORAGE_KEY = "ps_ship_v1";
export const MAX_QTY_PER_LINE = 10;

/** Ship-from for every rate quote: the Elk Grove Village facility (D-120 decision 4). */
export const SHIP_FROM = {
  name: "Private Stock Cannabis Co.",
  street1: "2400 Greenleaf Ave",
  city: "Elk Grove Village",
  state: "IL",
  zip: "60007",
  country: "US",
} as const;

/** Packed-parcel defaults for variants with no weight/size on file (admin flags them). */
export const DEFAULT_PARCEL = { weightOz: 12, lengthIn: 10, widthIn: 8, heightIn: 2 } as const;

export type ShippingService = "standard" | "priority";

export const SERVICE_LABEL: Record<ShippingService, { name: string; carrier: string }> = {
  standard: { name: "Standard", carrier: "USPS Ground Advantage" },
  priority: { name: "Priority", carrier: "USPS Priority Mail" },
};

/** One priced option as shown on the cart page and charged at checkout. */
export interface ShippingOption {
  service: ShippingService;
  /** What the buyer pays after the $75 rule. */
  cents: number;
  /** Carrier's quote before the $75 rule (for "FREE — normally $x.xx"). */
  quotedCents: number;
  /** Shippo rate object id — what a label purchase takes later. Null in fallback. */
  rateId: string | null;
  /** Carrier delivery estimate in days, when Shippo supplies one. */
  days: number | null;
}

export interface ShippingQuote {
  zip: string;
  options: ShippingOption[];
  /** True when these are the flat fallback numbers, not a Shippo quote. */
  fallback: boolean;
}

/** Apply the $75 rule: Standard is free at the threshold; Priority never is. */
export function priceAfterThreshold(service: ShippingService, quotedCents: number, subtotalCents: number): number {
  if (service === "standard" && subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) return 0;
  return quotedCents;
}

/** The fallback quote when Shippo cannot be reached: one Standard option at the flat rate. */
export function fallbackQuote(zip: string, subtotalCents: number): ShippingQuote {
  return {
    zip,
    fallback: true,
    options: [
      {
        service: "standard",
        quotedCents: SHIPPING_FALLBACK_CENTS,
        cents: priceAfterThreshold("standard", SHIPPING_FALLBACK_CENTS, subtotalCents),
        rateId: null,
        days: null,
      },
    ],
  };
}

/** Cents still needed to unlock free Standard shipping (0 when already free). */
export function centsToFreeShipping(subtotalCents: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents);
}

export const ZIP_RE = /^\d{5}$/;

export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function isShippingService(v: unknown): v is ShippingService {
  return v === "standard" || v === "priority";
}

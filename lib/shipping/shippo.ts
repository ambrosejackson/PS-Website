import "server-only";
import {
  DEFAULT_PARCEL,
  SHIP_FROM,
  fallbackQuote,
  priceAfterThreshold,
  type ShippingOption,
  type ShippingQuote,
  type ShippingService,
} from "@/lib/commerce/config";

/**
 * USPS rate quotes through Shippo (D-120). One shipment per quote: ship-from is
 * the Elk Grove Village facility, ship-to is the buyer's ZIP (USPS rates are
 * ZIP-based, so city/street are not needed to price), one parcel sized from
 * the cart. Only the two services the store offers come back; everything
 * else Shippo returns is ignored. Any failure — no key, timeout, HTTP error,
 * no USPS rates — yields the flat fallback quote so checkout never blocks.
 *
 * Env: SHIPPO_API_KEY (server only). Shippo's test token quotes real rates
 * without purchasing anything; the live token is the same API.
 */

const SHIPPO_URL = "https://api.goshippo.com/shipments/";
const TIMEOUT_MS = 3000;

/** Shippo service-level tokens → the store's two services. */
const SERVICE_BY_TOKEN: Record<string, ShippingService> = {
  usps_ground_advantage: "standard",
  usps_priority: "priority",
};

export interface Parcel {
  weightOz: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}

export function shippoConfigured(): boolean {
  return Boolean(process.env.SHIPPO_API_KEY);
}

/** One box for the whole cart: weights add, the largest footprint wins, heights stack. */
export function parcelForLines(
  lines: { qty: number; weightOz: number | null; lengthIn: number | null; widthIn: number | null; heightIn: number | null }[],
): Parcel {
  let weight = 0;
  let length = 0;
  let width = 0;
  let height = 0;
  for (const l of lines) {
    const w = l.weightOz ?? DEFAULT_PARCEL.weightOz;
    const L = l.lengthIn ?? DEFAULT_PARCEL.lengthIn;
    const W = l.widthIn ?? DEFAULT_PARCEL.widthIn;
    const H = l.heightIn ?? DEFAULT_PARCEL.heightIn;
    weight += w * l.qty;
    length = Math.max(length, L);
    width = Math.max(width, W);
    height += H * l.qty;
  }
  return {
    weightOz: round2(Math.max(1, weight)),
    lengthIn: round2(Math.max(1, length)),
    widthIn: round2(Math.max(1, width)),
    heightIn: round2(Math.max(0.25, height)),
  };
}

interface ShippoRate {
  object_id: string;
  provider: string;
  servicelevel?: { token?: string };
  amount: string;
  currency: string;
  estimated_days?: number | null;
}

/**
 * Quote both services for a ZIP. Returns the fallback quote (flagged) rather
 * than throwing, so callers never need their own error path.
 */
export async function quoteUsps(zip: string, parcel: Parcel, subtotalCents: number): Promise<ShippingQuote> {
  const key = process.env.SHIPPO_API_KEY;
  if (!key) return fallbackQuote(zip, subtotalCents);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SHIPPO_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { Authorization: `ShippoToken ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        address_from: { ...SHIP_FROM },
        address_to: { zip, country: "US" },
        parcels: [
          {
            length: String(parcel.lengthIn),
            width: String(parcel.widthIn),
            height: String(parcel.heightIn),
            distance_unit: "in",
            weight: String(parcel.weightOz),
            mass_unit: "oz",
          },
        ],
        carrier_accounts: undefined,
        async: false,
      }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[shippo] HTTP", res.status, (await res.text()).slice(0, 300));
      return fallbackQuote(zip, subtotalCents);
    }
    const body = (await res.json()) as { rates?: ShippoRate[] };
    const options: ShippingOption[] = [];
    for (const r of body.rates ?? []) {
      if (r.provider !== "USPS" || r.currency !== "USD") continue;
      const service = SERVICE_BY_TOKEN[r.servicelevel?.token ?? ""];
      if (!service || options.some((o) => o.service === service)) continue;
      const quotedCents = Math.round(Number(r.amount) * 100);
      if (!Number.isFinite(quotedCents) || quotedCents <= 0) continue;
      options.push({
        service,
        quotedCents,
        cents: priceAfterThreshold(service, quotedCents, subtotalCents),
        rateId: r.object_id,
        days: typeof r.estimated_days === "number" ? r.estimated_days : null,
      });
    }
    if (!options.some((o) => o.service === "standard")) {
      console.error("[shippo] no USPS Ground Advantage rate for", zip);
      return fallbackQuote(zip, subtotalCents);
    }
    options.sort((a, b) => (a.service === "standard" ? -1 : 1) - (b.service === "standard" ? -1 : 1));
    return { zip, options, fallback: false };
  } catch (e) {
    console.error("[shippo]", e instanceof Error ? e.message : e);
    return fallbackQuote(zip, subtotalCents);
  } finally {
    clearTimeout(timer);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

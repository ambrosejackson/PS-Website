import { NextResponse } from "next/server";
import { getStoreLocations } from "@/lib/data";
import { availabilityComingSoon } from "@/lib/showRealAvailability";
import { distanceMiles, zipToCoords } from "@/lib/geo/zip";
import type { TkLocatorResponse, TkLocatorStore } from "@/lib/tk-locator";

/**
 * FILE 06 // SUPPLY LINES — inline radius search for the TerpKings locator
 * console. Same inclusion rules as /store-locator: published store_locations
 * rows (delivery ≤90d, brand allowlist enforced upstream by the PSM publish),
 * the showRealAvailability production gate, filtered to stores carrying
 * TerpKings. Every match within RADIUS_MILES, nearest first; an empty radius
 * falls back to the NEAREST_COUNT closest. Presence + links only — never
 * prices (guardrail #2). Stores without coordinates (3 at last count) cannot
 * be distance-ranked and are skipped here; they still list on /store-locator.
 */
const RADIUS_MILES = 10;
const NEAREST_COUNT = 3;
const BRAND = "terpkings";

export async function GET(request: Request): Promise<NextResponse<TkLocatorResponse>> {
  const zip = new URL(request.url).searchParams.get("zip")?.trim() ?? "";
  if (!/^\d{5}$/.test(zip)) return NextResponse.json({ mode: "invalid_zip" });
  if (availabilityComingSoon()) return NextResponse.json({ mode: "coming_soon" });

  const origin = zipToCoords(zip);
  if (!origin) return NextResponse.json({ mode: "unknown_zip" });

  const stores = await getStoreLocations();
  const ranked = stores
    .filter(
      (s) =>
        s.brands.some((b) => b.toLowerCase() === BRAND) &&
        s.latitude !== null &&
        s.longitude !== null,
    )
    .map((s) => ({
      store: s,
      miles: distanceMiles(origin, { lat: s.latitude as number, lng: s.longitude as number }),
    }))
    .sort((a, b) => a.miles - b.miles);

  if (ranked.length === 0) return NextResponse.json({ mode: "none" });

  const within = ranked.filter((r) => r.miles <= RADIUS_MILES);
  const picked = within.length > 0 ? within : ranked.slice(0, NEAREST_COUNT);

  const payload: TkLocatorStore[] = picked.map(({ store: s, miles }) => {
    const parts = [s.address_line1, s.city, s.state, s.zip].filter(Boolean);
    return {
      id: s.id,
      name: s.name,
      chainName: s.chain_name,
      address: parts.join(", "),
      distanceMi: Math.round(miles * 10) / 10,
      menuUrl: s.menu_url,
      // Same construction as StoreLocatorList's directionsHref.
      mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        [s.name, ...parts].join(", "),
      )}`,
    };
  });

  return NextResponse.json({
    mode: within.length > 0 ? "radius" : "nearest",
    stores: payload,
  });
}

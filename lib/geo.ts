/**
 * Small geo helpers for the store locator's ZIP search.
 * No external services: ZIP centroids ship in lib/il-zip-centroids.ts.
 */

export const ZIP_RE = /^\d{5}$/;

/** Great-circle distance in statute miles. */
export function milesBetween(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Resolve an Illinois ZIP to its centroid. The 45 KB table is imported on
 * first use so visitors who never type a ZIP never download it.
 * Returns null for anything that is not an Illinois ZIP we know.
 */
export async function lookupIlZip(zip: string): Promise<[lat: number, lng: number] | null> {
  if (!ZIP_RE.test(zip)) return null;
  const mod = await import("@/lib/il-zip-centroids");
  return mod.default[zip] ?? null;
}

export function formatMiles(mi: number): string {
  if (mi < 0.95) return "under a mile";
  return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
}

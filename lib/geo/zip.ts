import centroids from "./zip-centroids.json";

/**
 * US ZIP → centroid lookup for radius search, resolved entirely on the server.
 * Same philosophy as the locator's D-060 geocoding: free, keyless, no runtime
 * third-party dependency. Data: the `zipcodes` npm package v8.0.0 (MIT),
 * 42,555 five-digit ZIPs as [lat, lng] rounded to 4 decimal places (~1.1MB).
 * Server-only — never import this module from a client component, or the
 * whole table ships to the browser.
 */
const ZIPS = centroids as unknown as Record<string, [number, number]>;

export interface Coords {
  lat: number;
  lng: number;
}

export function zipToCoords(zip: string): Coords | null {
  const hit = ZIPS[zip];
  return hit ? { lat: hit[0], lng: hit[1] } : null;
}

/** Great-circle distance in statute miles (haversine, R = 3958.8 mi). */
export function distanceMiles(a: Coords, b: Coords): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

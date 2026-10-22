"use client";

import { useState } from "react";
import { ZIP_RE, lookupIlZip, milesBetween } from "@/lib/geo";

/**
 * Shared ZIP → distance logic for the store locator and product pages (D-116).
 * Typing a 5-digit Illinois ZIP resolves its centroid (lazy table) and lets the
 * caller rank anything with coordinates by straight-line miles.
 */

type ZipState =
  | { kind: "none" }
  | { kind: "found"; zip: string; lat: number; lng: number }
  | { kind: "unknown"; zip: string };

export interface Located {
  latitude: number | null;
  longitude: number | null;
}

export function useZipDistance() {
  const [query, setQuery] = useState("");
  // Last resolved ZIP lookup. Only applies while the input still holds that
  // ZIP, so stale async results and edits never leak into each other.
  const [zipState, setZipState] = useState<ZipState>({ kind: "none" });

  const trimmed = query.trim();
  const typedZip = ZIP_RE.test(trimmed) ? trimmed : null;

  function onQueryChange(next: string) {
    setQuery(next);
    const zip = next.trim();
    if (!ZIP_RE.test(zip)) return;
    lookupIlZip(zip).then((hit) => {
      setZipState(hit ? { kind: "found", zip, lat: hit[0], lng: hit[1] } : { kind: "unknown", zip });
    });
  }

  const zipMode = zipState.kind === "found" && zipState.zip === typedZip;
  const zipUnknown = zipState.kind === "unknown" && zipState.zip === typedZip;
  const center = zipMode ? { lat: zipState.lat, lng: zipState.lng } : null;

  /** Miles from the typed ZIP, or null when there is no ZIP or no coordinates. */
  function milesTo(item: Located): number | null {
    if (!center || item.latitude == null || item.longitude == null) return null;
    return milesBetween(center.lat, center.lng, item.latitude, item.longitude);
  }

  return { query, trimmed, typedZip, onQueryChange, zipMode, zipUnknown, zip: typedZip, milesTo };
}

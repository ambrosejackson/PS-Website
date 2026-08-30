"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import type { StoreLocation } from "@/lib/data";

/**
 * Illinois dispensary map (D-061). Leaflet + CARTO Positron tiles — no API key,
 * attribution rendered below the canvas. Leaflet touches `window`, so it is
 * imported dynamically inside an effect rather than at module scope.
 *
 * Stores without coordinates are simply not plotted; the list beside the map is
 * the authoritative set, so a missing geocode costs a pin, never a listing.
 */

const TIER_COLOR: Record<string, string> = {
  live: "#1a1a1a",
  recent: "#8a8a8a",
  listed: "#c4c4c4",
};

export function AvailabilityMap({
  stores,
  selectedId,
  onSelect,
}: {
  stores: StoreLocation[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<Record<string, Marker>>({});
  const [ready, setReady] = useState(false);

  const located = useMemo(
    () => stores.filter((s) => s.latitude !== null && s.longitude !== null),
    [stores],
  );
  // Re-fit only when the actual set of pins changes, not on every render.
  const key = useMemo(() => located.map((s) => s.id).join("|"), [located]);

  useEffect(() => {
    let cancelled = false;
    if (!holder.current || located.length === 0) return;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !holder.current) return;

      if (!map.current) {
        map.current = L.map(holder.current, {
          scrollWheelZoom: false,
          attributionControl: false,
        });
        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
          maxZoom: 18,
          subdomains: "abcd",
        }).addTo(map.current);
      }

      Object.values(markers.current).forEach((m) => m.remove());
      markers.current = {};

      for (const s of located) {
        const marker = L.circleMarker([s.latitude!, s.longitude!], {
          radius: 6,
          weight: 2,
          color: "#ffffff",
          fillColor: TIER_COLOR[s.availability_tier ?? "listed"] ?? TIER_COLOR.listed,
          fillOpacity: 1,
        })
          .addTo(map.current!)
          .bindTooltip(s.name, { direction: "top", offset: [0, -6] })
          .on("click", () => onSelect?.(s.id));
        markers.current[s.id] = marker as unknown as Marker;
      }

      map.current.fitBounds(
        L.latLngBounds(located.map((s) => [s.latitude!, s.longitude!] as [number, number])),
        { padding: [28, 28], maxZoom: 11 },
      );
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // onSelect is a stable callback from the page; pins depend on `key` only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Tear the map down only when the component itself unmounts.
  useEffect(
    () => () => {
      map.current?.remove();
      map.current = null;
    },
    [],
  );

  useEffect(() => {
    if (!ready || !selectedId) return;
    const store = located.find((s) => s.id === selectedId);
    if (store) map.current?.panTo([store.latitude!, store.longitude!]);
    markers.current[selectedId]?.openTooltip?.();
  }, [selectedId, ready, located]);

  if (located.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center border border-dashed border-hairline text-sm text-neutral-400">
        Map available once store coordinates are published.
      </div>
    );
  }

  return (
    <div>
      <div
        ref={holder}
        className="aspect-[4/3] w-full border border-hairline bg-neutral-100 md:sticky md:top-24"
        aria-label="Map of dispensaries carrying Private Stock brands"
        role="application"
      />
      <p className="mt-2 text-[10px] tracking-wide text-neutral-400">
        © OpenStreetMap contributors © CARTO
      </p>
    </div>
  );
}

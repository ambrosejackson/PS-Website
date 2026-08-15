"use client";

import { useState } from "react";
import type { StoreLocation } from "@/lib/data";

/**
 * Placeholder region map: stores plotted by lat/lng on a simple SVG panel with
 * hover + click. Replaced by MapLibre/Leaflet with real tiles in Phase 2 when
 * the PSM geo backfill + publish pipeline land.
 */
export function AvailabilityMap({ stores }: { stores: StoreLocation[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const located = stores.filter(
    (s) => s.latitude !== null && s.longitude !== null,
  );

  if (located.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-sm border border-dashed text-sm text-neutral-400">
        Map available when live store data connects.
      </div>
    );
  }

  const lats = located.map((s) => s.latitude!);
  const lngs = located.map((s) => s.longitude!);
  const pad = 0.4;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;

  const x = (lng: number) => ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = (lat: number) => (1 - (lat - minLat) / (maxLat - minLat)) * 75;

  return (
    <div className="relative">
      <svg
        viewBox="0 0 100 75"
        role="img"
        aria-label="Map of dispensary locations"
        className="aspect-[4/3] w-full rounded-sm bg-neutral-100"
      >
        {located.map((s) => (
          <g key={s.id}>
            <circle
              cx={x(s.longitude!)}
              cy={y(s.latitude!)}
              r={hovered === s.id ? 2.6 : 1.8}
              className="cursor-pointer fill-neutral-900 transition-all"
              onMouseEnter={() => setHovered(s.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                if (s.menu_url) window.open(s.menu_url, "_blank", "noopener");
              }}
            />
          </g>
        ))}
      </svg>
      <div className="pointer-events-none absolute left-2 top-2 rounded-sm bg-white/85 px-2 py-1 text-[10px] tracking-widest text-neutral-500">
        {hovered
          ? located.find((s) => s.id === hovered)?.name
          : "REGION MAP · INTERACTIVE MAP COMING WITH LIVE DATA"}
      </div>
    </div>
  );
}

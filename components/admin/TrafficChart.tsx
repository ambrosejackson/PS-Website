"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Point {
  key: string;
  label: string;
  value: number;
}

interface Props {
  points: Point[];
  /** Noun for the readout, e.g. "sessions". */
  unit: string;
  todayKey?: string;
}

const W = 600;
const H = 150;
const PAD_TOP = 8;
const PAD_BOTTOM = 18;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;
const GAP = 2;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function barPath(x: number, y: number, w: number, bottom: number): string {
  const r = Math.min(4, w / 2, bottom - y);
  return `M${x},${bottom} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${bottom} Z`;
}

/**
 * Daily traffic bars (D-141): sibling of SalesChart with the same mark styling
 * but a single integer series and no segment toggle. Handles 7–366 bars; the
 * gap collapses to a hairline once bars get narrow. Table view for assistive tech.
 */
export function TrafficChart({ points, unit, todayKey }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const n = Math.max(1, points.length);
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((a, p) => a + p.value, 0);
  const slot = W / n;
  const gap = slot > 6 ? GAP : slot > 3 ? 1 : 0.5;
  const barW = Math.max(1, slot - gap);
  const bottom = PAD_TOP + PLOT_H;
  const hovered = hover !== null ? points[hover] : null;
  const mid = Math.floor(n / 2);

  return (
    <div>
      <p className="mb-2 text-xs text-neutral-500" aria-live="polite">
        {hovered ? (
          <>
            <span className="font-medium text-neutral-900">{hovered.label}</span> · {fmt(hovered.value)} {unit}
          </>
        ) : (
          <>
            Total <span className="font-medium text-neutral-900">{fmt(total)}</span> {unit} over {n} {n === 1 ? "day" : "days"}
          </>
        )}
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full"
        role="img"
        aria-label={`Daily ${unit}`}
        onMouseLeave={() => setHover(null)}
      >
        <text x={0} y={PAD_TOP + 4} className="fill-neutral-400 text-[9px]">
          {fmt(max)}
        </text>
        <line x1={0} x2={W} y1={bottom} y2={bottom} className="stroke-neutral-200" strokeWidth={1} />
        {points.map((p, i) => {
          const x = i * slot + gap / 2;
          const h = p.value > 0 ? Math.max(2, (p.value / max) * PLOT_H) : 0;
          const y = bottom - h;
          const isToday = p.key === todayKey;
          return (
            <g key={p.key} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)}>
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {p.value > 0 && (
                <path
                  d={barPath(x, y, barW, bottom)}
                  className={cn(
                    "fill-neutral-800",
                    hover !== null && hover !== i && "fill-neutral-300",
                    isToday && "fill-neutral-950",
                  )}
                />
              )}
              <title>{`${p.label}: ${fmt(p.value)} ${unit}`}</title>
            </g>
          );
        })}
        <text x={0} y={H - 4} className="fill-neutral-400 text-[9px]">
          {points[0]?.label}
        </text>
        {n > 2 && (
          <text x={W / 2} y={H - 4} textAnchor="middle" className="fill-neutral-400 text-[9px]">
            {points[mid]?.label}
          </text>
        )}
        <text x={W} y={H - 4} textAnchor="end" className="fill-neutral-400 text-[9px]">
          {points[n - 1]?.key === todayKey ? "Today" : points[n - 1]?.label}
        </text>
      </svg>

      {total === 0 && <p className="mt-2 text-xs text-neutral-400">No {unit} recorded in this window.</p>}

      <details className="mt-2 text-xs text-neutral-500">
        <summary className="cursor-pointer">Table view</summary>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full">
            <thead className="text-left uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="py-1 font-medium">Day</th>
                <th className="py-1 text-right font-medium">{unit}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.key} className="border-t">
                  <td className="py-1">{p.label}</td>
                  <td className="py-1 text-right tabular-nums">{fmt(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

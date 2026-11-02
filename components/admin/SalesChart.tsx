"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Segment = "all" | "apparel" | "other";

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "all", label: "All" },
  { key: "apparel", label: "Apparel" },
  { key: "other", label: "Other" },
];

interface Props {
  days: { key: string; label: string }[];
  series: Record<Segment, number[]>;
  todayKey: string;
}

const W = 600;
const H = 150;
const PAD_TOP = 8;
const PAD_BOTTOM = 18;
const PLOT_H = H - PAD_TOP - PAD_BOTTOM;
const GAP = 2;

function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Single-series bar path with 4px rounded data-end anchored to the baseline. */
function barPath(x: number, y: number, w: number, bottom: number): string {
  const r = Math.min(4, w / 2, bottom - y);
  return `M${x},${bottom} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${bottom} Z`;
}

/**
 * Sales · last 30 days. Hand-rolled SVG (no chart dependency): one series at
 * a time via the segment toggle, today on the right, per-bar hover tooltip,
 * and a table fallback for assistive tech.
 */
export function SalesChart({ days, series, todayKey }: Props) {
  const [segment, setSegment] = useState<Segment>("all");
  const [hover, setHover] = useState<number | null>(null);
  const values = series[segment];
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  const n = days.length;
  const slot = W / n;
  const barW = Math.max(2, slot - GAP);
  const bottom = PAD_TOP + PLOT_H;
  const hovered = hover !== null ? { day: days[hover], value: values[hover] } : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Segment" className="inline-flex rounded border bg-neutral-50 p-0.5 text-xs">
          {SEGMENTS.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-pressed={segment === s.key}
              onClick={() => setSegment(s.key)}
              className={cn(
                "rounded px-2.5 py-1 font-medium text-neutral-600 hover:text-neutral-900",
                segment === s.key && "bg-white text-neutral-900 shadow-sm",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-500" aria-live="polite">
          {hovered ? (
            <>
              <span className="font-medium text-neutral-900">{hovered.day.label}</span> · {dollars(hovered.value)}
            </>
          ) : (
            <>
              30-day total <span className="font-medium text-neutral-900">{dollars(total)}</span>
            </>
          )}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full"
        role="img"
        aria-label={`Daily ${SEGMENTS.find((s) => s.key === segment)?.label} revenue, last 30 days`}
        onMouseLeave={() => setHover(null)}
      >
        <text x={0} y={PAD_TOP + 4} className="fill-neutral-400 text-[9px]">
          {dollars(max)}
        </text>
        <line x1={0} x2={W} y1={bottom} y2={bottom} className="stroke-neutral-200" strokeWidth={1} />
        {values.map((v, i) => {
          const x = i * slot + GAP / 2;
          const h = v > 0 ? Math.max(2, (v / max) * PLOT_H) : 0;
          const y = bottom - h;
          const isToday = days[i].key === todayKey;
          return (
            <g key={days[i].key} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)}>
              {/* Hit target spans the full column so thin bars are easy to hover. */}
              <rect x={i * slot} y={0} width={slot} height={H} fill="transparent" />
              {v > 0 && (
                <path
                  d={barPath(x, y, barW, bottom)}
                  className={cn(
                    "fill-neutral-800",
                    hover !== null && hover !== i && "fill-neutral-300",
                    isToday && "fill-neutral-950",
                  )}
                />
              )}
              <title>{`${days[i].label}: ${dollars(v)}`}</title>
            </g>
          );
        })}
        <text x={0} y={H - 4} className="fill-neutral-400 text-[9px]">
          {days[0]?.label}
        </text>
        <text x={W / 2} y={H - 4} textAnchor="middle" className="fill-neutral-400 text-[9px]">
          {days[Math.floor(n / 2)]?.label}
        </text>
        <text x={W} y={H - 4} textAnchor="end" className="fill-neutral-400 text-[9px]">
          Today
        </text>
      </svg>

      {total === 0 && <p className="mt-2 text-xs text-neutral-400">No paid orders in this segment in the last 30 days.</p>}

      <details className="mt-2 text-xs text-neutral-500">
        <summary className="cursor-pointer">Table view</summary>
        <table className="mt-2 w-full">
          <thead className="text-left uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 text-right font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d, i) => (
              <tr key={d.key} className="border-t">
                <td className="py-1">{d.label}</td>
                <td className="py-1 text-right tabular-nums">{dollars(values[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

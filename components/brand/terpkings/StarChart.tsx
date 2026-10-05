"use client";

import { useEffect, useRef, useState } from "react";
import {
  KING_WORLDS,
  formatDistance,
  worldLabel,
  type KingDistance,
  type KingId,
} from "@/lib/terpkings/kings";

/**
 * FILE 03 star chart — the five Kings' home worlds relative to Earth, and a
 * second King selector alongside the ▸ tabs and ←/→ (PRD King Origins D7).
 *
 * Two bands with a labelled scale break (D4): the inner band (Venus, Earth,
 * Moon station, Mars) is in light-minutes, the outer band is log light-years.
 * The drawing is one aria-hidden SVG sized 1 unit = 1 CSS px to the measured
 * stage; each world is a real <button> laid over its node, so the chart is
 * keyboard and screen-reader usable. Selecting a world calls `onSelect`
 * immediately and the chart's view never moves or scales (D-115); only the
 * readout's distance counter ticks up, and under prefers-reduced-motion it
 * shows the final value at once.
 *
 * Loaded with next/dynamic from TKDossiers once FILE 03 nears the viewport; the
 * parent reserves the height, so mounting never shifts layout. Silent: it never
 * touches video or audio state.
 */

// The page's existing TerpKings greens (D3) — every world uses these.
const GREEN = "#A8C64E";
const GREEN_BRIGHT = "#D8F26E";
const GREEN_DIM = "#5B6E35";
const SCREEN = "#070A05";
/** EDIT ME: Earth is the only off-color node (D3). Set to GREEN to make it match. */
const EARTH_COLOR = "#FFB000";

/** How long the readout's distance counter takes to tick up to its value. */
const COUNT_MS = 520;
const OUTER_TICKS: [number, string][] = [
  [10, "10"],
  [100, "100"],
  [1000, "1K"],
  [10000, "10K LY"],
];

interface Pt {
  x: number;
  y: number;
}
type Anchor = "start" | "middle" | "end";
interface Label {
  dx: number;
  dy: number;
  anchor: Anchor;
}

// Inner-band x (fraction of width) and every world's y (fraction of height):
// [compact, wide]. Outer-band x comes from the log scale, not from here.
const INNER_X: Partial<Record<KingId, [number, number]>> = {
  "king-haze": [0.1, 0.07],
  "king-floral": [0.33, 0.33],
};
const WORLD_Y: Record<KingId, [number, number]> = {
  "king-haze": [0.25, 0.66],
  "king-floral": [0.78, 0.3],
  "king-fruit": [0.22, 0.27],
  "king-dessert": [0.49, 0.47],
  "king-gas": [0.7, 0.72],
};
const LABELS: Record<KingId, [Label, Label]> = {
  "king-haze": [
    { dx: 0, dy: -14, anchor: "middle" },
    { dx: 0, dy: 30, anchor: "middle" },
  ],
  "king-floral": [
    { dx: 0, dy: 26, anchor: "middle" },
    { dx: 0, dy: -14, anchor: "middle" },
  ],
  "king-fruit": [
    { dx: 14, dy: 5, anchor: "start" },
    { dx: 18, dy: 5, anchor: "start" },
  ],
  "king-dessert": [
    { dx: 0, dy: 24, anchor: "middle" },
    { dx: 30, dy: 30, anchor: "end" },
  ],
  "king-gas": [
    { dx: 20, dy: 5, anchor: "start" },
    { dx: 24, dy: 5, anchor: "start" },
  ],
};

function buildLayout(w: number, h: number, compact: boolean) {
  const i = compact ? 0 : 1;
  const breakX = w * (compact ? 0.42 : 0.44);
  const outerStart = w * 0.5;
  const outerSpan = w * (compact ? 0.43 : 0.45);
  // 10 ly → 10,000 ly across the outer band.
  const outerX = (ly: number) => outerStart + ((Math.log10(ly) - 1) / 3) * outerSpan;

  const earth: Pt = { x: w * (compact ? 0.24 : 0.21), y: h * 0.5 };
  const hubR = compact ? 15 : 24;
  const station: Pt = { x: earth.x + hubR * 0.866, y: earth.y + hubR * 0.5 };
  const garden: Pt = compact
    ? { x: earth.x - 24, y: h * 0.74 }
    : { x: earth.x, y: h * 0.76 };

  const worlds = {} as Record<KingId, Pt>;
  for (const k of KING_WORLDS) {
    const x =
      k.distance.kind === "value"
        ? outerX(k.distance.value)
        : w * (INNER_X[k.id]?.[i] ?? 0.1);
    worlds[k.id] = { x, y: h * WORLD_Y[k.id][i] };
  }
  return { breakX, outerStart, outerSpan, outerX, earth, hubR, station, garden, worlds };
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function scaled(d: KingDistance, e: number): KingDistance {
  if (e >= 1) return d;
  const r = (n: number) => (n >= 100 ? Math.round(n * e) : Math.round(n * e * 10) / 10);
  return d.kind === "range"
    ? { ...d, min: r(d.min), max: r(d.max) }
    : { ...d, value: r(d.value) };
}

/** The observation tag is one line on desktop, split in two on a phone. */
function noteLines(note: string, compact: boolean): string[] {
  const words = note.split(" ");
  if (!compact || words.length < 3) return [note];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}

function zigzag(x: number, top: number, bottom: number): string {
  const pts: string[] = [];
  for (let y = top, n = 0; y <= bottom; y += 8, n++) {
    pts.push(`${(x + (n % 2 ? 3 : -3)).toFixed(1)},${y}`);
  }
  return pts.join(" ");
}

export function StarChart({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: KingId) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [craftTime, setCraftTime] = useState(false);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const shown = KING_WORLDS.find((k) => k.id === selectedId) ?? KING_WORLDS[0];

  const compact = size ? size.w < 480 : true;
  const l = size ? buildLayout(size.w, size.h, compact) : null;

  const toggle = shown.travelToggle;

  return (
    <div
      role="group"
      aria-label="Star chart — select a King by home world"
      className="tk-mono flex h-full w-full flex-col"
    >
      <div ref={stageRef} className="relative min-h-0 flex-1 overflow-hidden">
        {size && l && (
          <div className="absolute inset-0">
            <ChartSvg w={size.w} h={size.h} compact={compact} l={l} shownId={selectedId} />
            {KING_WORLDS.map((k) => {
              const p = l.worlds[k.id];
              return (
                <button
                  key={k.id}
                  type="button"
                  aria-pressed={k.id === selectedId}
                  aria-label={`King ${k.name} — ${worldLabel(k)}, ${formatDistance(k.distance)}`}
                  onClick={() => onSelect(k.id)}
                  className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-transparent hover:bg-[rgba(168,198,78,.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D8F26E]"
                  style={{ left: p.x, top: p.y }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Readout: selected King, ticking distance, Dulcir's light ↔ craft toggle. */}
      <div className="flex h-[56px] shrink-0 items-center justify-between gap-3 border-t border-[#1E2612] px-3 md:px-[26px]">
        <div className="min-w-0 text-[14px] leading-[1.15] tracking-[.04em] md:text-[19px] md:tracking-[.1em]">
          {/* Three lines on a phone; King + world share a line from md up. */}
          <div aria-live="polite" className="md:flex md:gap-[.5em]">
            <div className="truncate text-[#D8F26E]">KING {shown.name.toUpperCase()}</div>
            <div className="truncate text-[#A8C64E]">
              <span className="hidden md:inline">— </span>
              {worldLabel(shown).toUpperCase()}
              {shown.earthMarker && (
                <span className="text-[#5B6E35]"> · {shown.earthMarker.label.toUpperCase()}</span>
              )}
            </div>
          </div>
          <div className="truncate text-[#A8C64E]">
            <DistanceCounter key={shown.id} distance={shown.distance} />
          </div>
        </div>
        {toggle && (
          <button
            type="button"
            aria-pressed={craftTime}
            aria-label={
              craftTime
                ? `Travel time by ${toggle.craftLabel}: ${toggle.craft}. Switch to light time.`
                : `Travel time at light speed: ${toggle.light}. Switch to ${toggle.craftLabel} time.`
            }
            onClick={() => setCraftTime((v) => !v)}
            className="tk-btn-arrow flex h-11 shrink-0 cursor-pointer flex-col items-center justify-center rounded-[3px] px-2 text-[13px] leading-[1.1] tracking-[.04em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D8F26E] md:px-3 md:text-[16px] md:tracking-[.1em]"
          >
            <span className="text-[#5B6E35]">
              {(craftTime ? toggle.craftLabel : "Light").toUpperCase()} ⇄
            </span>
            <span>{(craftTime ? toggle.craft : toggle.light).toUpperCase()}</span>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The selected world's distance, ticking up from zero each time the selection
 * changes (the parent keys this by King). Text only — nothing on the chart
 * moves. Under prefers-reduced-motion it renders the final value immediately.
 */
function DistanceCounter({ distance }: { distance: KingDistance }) {
  const [p, setP] = useState(() => (prefersReducedMotion() ? 1 : 0));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    let t0 = 0; // first frame's timestamp
    const step = (now: number) => {
      if (!t0) t0 = now;
      const next = Math.min(1, (now - t0) / COUNT_MS);
      setP(next);
      if (next < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <>{formatDistance(scaled(distance, ease(p))).toUpperCase()}</>;
}

function ChartSvg({
  w,
  h,
  compact,
  l,
  shownId,
}: {
  w: number;
  h: number;
  compact: boolean;
  l: ReturnType<typeof buildLayout>;
  shownId: string;
}) {
  const i = compact ? 0 : 1;
  const fs = compact ? 13 : 16;
  const fsSmall = compact ? 11 : 14;
  const axisY = h - 20;
  const { earth, station, garden, hubR } = l;

  // Dark halo behind every label so lines never cut through the type.
  const halo = {
    paintOrder: "stroke" as const,
    stroke: SCREEN,
    strokeWidth: 4,
    strokeLinejoin: "round" as const,
  };
  const on = (id: KingId) => id === shownId;
  const stroke = (id: KingId, width: number) => ({
    stroke: on(id) ? GREEN_BRIGHT : GREEN,
    strokeWidth: on(id) ? width + 0.75 : width,
    opacity: on(id) ? 1 : 0.45,
    fill: "none",
    strokeLinecap: "round" as const,
  });
  const fill = (id: KingId) => (on(id) ? GREEN_BRIGHT : GREEN);
  const p = l.worlds;

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="tk-mono absolute inset-0 block"
    >
      <defs>
        <radialGradient id="tk-chart-vapor">
          <stop offset="0%" stopColor={GREEN} stopOpacity="0.55" />
          <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Band headers */}
      <text x={l.breakX / 2} y={compact ? 14 : 20} textAnchor="middle" fontSize={fsSmall} letterSpacing="1.5" fill={GREEN_DIM}>
        {compact ? "LIGHT-MINUTES" : "INNER BAND · LIGHT-MINUTES"}
      </text>
      <text x={(l.breakX + w) / 2} y={compact ? 14 : 20} textAnchor="middle" fontSize={fsSmall} letterSpacing="1.5" fill={GREEN_DIM}>
        {compact ? "LIGHT-YEARS (LOG)" : "OUTER BAND · LIGHT-YEARS (LOG SCALE)"}
      </text>

      {/* Outer-band log axis */}
      <line x1={l.outerStart} y1={axisY} x2={l.outerStart + l.outerSpan} y2={axisY} stroke={GREEN_DIM} strokeWidth="1" opacity="0.7" />
      {OUTER_TICKS.map(([ly, label]) => (
        <g key={ly}>
          <line x1={l.outerX(ly)} y1={axisY - 4} x2={l.outerX(ly)} y2={axisY + 2} stroke={GREEN_DIM} strokeWidth="1" />
          <text x={l.outerX(ly)} y={h - 5} textAnchor="middle" fontSize={fsSmall} fill={GREEN_DIM}>
            {label}
          </text>
        </g>
      ))}

      {/* Lines (PRD §4) — drawn under the scale break and the nodes */}
      <line x1={earth.x} y1={earth.y} x2={p["king-haze"].x} y2={p["king-haze"].y} {...stroke("king-haze", 1)} />
      <line x1={earth.x} y1={earth.y} x2={p["king-floral"].x} y2={p["king-floral"].y} {...stroke("king-floral", 1.5)} />
      <line x1={earth.x} y1={earth.y} x2={garden.x} y2={garden.y} {...stroke("king-floral", 1)} />
      {/* Fruvian: meteor-streak dashes travelling toward Earth (static under reduced motion) */}
      <path
        d={`M${p["king-fruit"].x} ${p["king-fruit"].y} L${earth.x} ${earth.y}`}
        strokeDasharray="10 14"
        className="tk-meteor"
        {...stroke("king-fruit", 1.5)}
      />
      {/* Gaz'Rax: ends at the Moon station */}
      <line x1={p["king-gas"].x} y1={p["king-gas"].y} x2={station.x} y2={station.y} {...stroke("king-gas", 1.5)} />
      {/* Dulcir: routes through the Moon station */}
      <polyline
        points={`${p["king-dessert"].x},${p["king-dessert"].y} ${station.x},${station.y} ${earth.x},${earth.y}`}
        {...stroke("king-dessert", 1.5)}
      />

      {/* Labelled scale break */}
      <rect x={l.breakX - 6} y={24} width={12} height={h - 30} fill={SCREEN} />
      <polyline points={zigzag(l.breakX - 4, 26, h - 8)} fill="none" stroke={GREEN_DIM} strokeWidth="1" />
      <polyline points={zigzag(l.breakX + 4, 26, h - 8)} fill="none" stroke={GREEN_DIM} strokeWidth="1" />
      {compact ? (
        <text x={l.breakX - 10} y={h - 5} textAnchor="end" fontSize={fsSmall} letterSpacing="1" fill={GREEN_DIM} {...halo}>
          SCALE BREAK ›
        </text>
      ) : (
        <text
          transform={`translate(${l.breakX + 18} ${h - 48}) rotate(-90)`}
          textAnchor="middle"
          fontSize={fsSmall}
          letterSpacing="1.5"
          fill={GREEN_DIM}
          {...halo}
        >
          SCALE BREAK
        </text>
      )}

      {/* Earth + Moon station hub ring */}
      <circle cx={earth.x} cy={earth.y} r={hubR} fill="none" stroke={GREEN} strokeWidth="1" strokeDasharray="3 3" opacity="0.8" />
      <circle cx={station.x} cy={station.y} r={3} fill={GREEN_BRIGHT} />
      <circle cx={earth.x} cy={earth.y} r={compact ? 6 : 8} fill={EARTH_COLOR} />
      <text x={earth.x} y={earth.y - hubR - 7} textAnchor="middle" fontSize={fs} letterSpacing="1.5" fill={EARTH_COLOR} {...halo}>
        EARTH
      </text>
      {!compact && (
        <text x={earth.x + 12} y={earth.y + hubR + 20} fontSize={fsSmall} letterSpacing="1" fill={GREEN_DIM} {...halo}>
          MOON STATION
        </text>
      )}

      {/* Floraxa's second marker: the Bermuda seabed garden */}
      <rect
        x={garden.x - 4}
        y={garden.y - 4}
        width={8}
        height={8}
        transform={`rotate(45 ${garden.x} ${garden.y})`}
        fill={fill("king-floral")}
        opacity={on("king-floral") ? 1 : 0.6}
      />
      {!compact && (
        <text x={garden.x} y={garden.y + 20} textAnchor="middle" fontSize={fsSmall} letterSpacing="1" fill={GREEN_DIM} {...halo}>
          BERMUDA SEABED GARDEN
        </text>
      )}

      {/* World nodes */}
      {/* Venus: dim ember with an offset translucent duplicate */}
      <circle cx={p["king-haze"].x + 4} cy={p["king-haze"].y - 3} r={5} fill={fill("king-haze")} opacity="0.25" />
      <circle cx={p["king-haze"].x} cy={p["king-haze"].y} r={5} fill={fill("king-haze")} opacity={on("king-haze") ? 0.9 : 0.55} />
      {/* Mars */}
      <circle cx={p["king-floral"].x} cy={p["king-floral"].y} r={5} fill={fill("king-floral")} />
      {/* Arcturus */}
      <circle cx={p["king-fruit"].x} cy={p["king-fruit"].y} r={5} fill={fill("king-fruit")} />
      <path
        d={`M${p["king-fruit"].x - 10} ${p["king-fruit"].y} h20 M${p["king-fruit"].x} ${p["king-fruit"].y - 10} v20`}
        stroke={fill("king-fruit")}
        strokeWidth="1"
      />
      {/* 55 Cancri e: vapor smudge, no confirmed observation */}
      <ellipse cx={p["king-gas"].x} cy={p["king-gas"].y} rx={18} ry={11} fill="url(#tk-chart-vapor)" opacity={on("king-gas") ? 1 : 0.75} />
      <ellipse cx={p["king-gas"].x + 5} cy={p["king-gas"].y - 3} rx={11} ry={7} fill="url(#tk-chart-vapor)" opacity="0.6" />
      {/* Kepler-51 */}
      <circle cx={p["king-dessert"].x} cy={p["king-dessert"].y} r={4} fill={fill("king-dessert")} />
      <circle cx={p["king-dessert"].x} cy={p["king-dessert"].y} r={9} fill="none" stroke={fill("king-dessert")} strokeWidth="1" opacity="0.5" />

      {/* World labels */}
      {KING_WORLDS.map((k) => {
        const lab = LABELS[k.id][i];
        const x = p[k.id].x + lab.dx;
        const y = p[k.id].y + lab.dy;
        return (
          <g key={k.id}>
            <text x={x} y={y} textAnchor={lab.anchor} fontSize={fs} letterSpacing="1.5" fill={fill(k.id)} {...halo}>
              {(compact ? (k.star ?? k.world) : worldLabel(k)).toUpperCase()}
            </text>
            {k.observationNote &&
              noteLines(k.observationNote, compact).map((line, n) => (
                <text
                  key={line}
                  x={x}
                  y={y + (compact ? 13 : 17) + n * 12}
                  textAnchor={lab.anchor}
                  fontSize={fsSmall}
                  letterSpacing="1"
                  fill={GREEN_DIM}
                  {...halo}
                >
                  {line.toUpperCase()}
                </text>
              ))}
          </g>
        );
      })}
    </svg>
  );
}

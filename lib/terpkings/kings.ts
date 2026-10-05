/**
 * King origins — static chart data for the FILE 03 star chart (PRD King Origins
 * §4/§6). Chart data ONLY: dossier copy, videos and posters stay in
 * lib/terpkings-content.ts (`KINGS`), joined to this file by `id` === `slotId`.
 * How to edit, and how to add a game via `hasGame`: docs/TERPKINGS-KINGS.md.
 */

/** Matches `KingDossier.slotId` in lib/terpkings-content.ts — do not rename one side only. */
export type KingId =
  | "king-gas"
  | "king-haze"
  | "king-dessert"
  | "king-fruit"
  | "king-floral";

/** Inner band (light-minutes) vs. outer band (log light-years) — the D4 scale break. */
export type ChartBand = "inner" | "outer";

export type KingDistance =
  | {
      kind: "range";
      min: number;
      max: number;
      unit: "light-minutes";
      /** Renders a leading "~". */
      approx?: boolean;
    }
  | { kind: "value"; value: number; unit: "light-years" };

/**
 * How the King's line is drawn (PRD §4):
 * - `ember`     thin solid line; dim ember node with an offset translucent duplicate
 * - `solid`     solid line to the world
 * - `meteor`    animated meteor-streak dashes toward Earth
 * - `moon-end`  line ends at the Moon station; world is an unconfirmed vapor smudge
 * - `moon-route` line routes through the Moon station
 */
export type LineTreatment = "ember" | "solid" | "meteor" | "moon-end" | "moon-route";

export interface KingWorld {
  id: KingId;
  /** Short display name, used in the node's aria-label ("King {name} — …"). */
  name: string;
  /** Home world as labelled on the chart. */
  world: string;
  /** Host star / catalogue name when the world is not itself the chart label. */
  star?: string;
  constellation?: string;
  band: ChartBand;
  distance: KingDistance;
  line: LineTreatment;
  /** Extra marker hung off Earth, drawn with a short line from Earth's surface. */
  earthMarker?: { label: string };
  /** Tag shown on a world with no confirmed observation (vapor smudge). */
  observationNote?: string;
  /** Light-time ↔ craft-time toggle shown when this King is selected. */
  travelToggle?: { light: string; craftLabel: string; craft: string };
  /** True shows the game trigger in this King's dossier. Only one game exists (v1). */
  hasGame: boolean;
}

/** Same order as `KINGS` in lib/terpkings-content.ts. */
export const KING_WORLDS: readonly KingWorld[] = [
  {
    id: "king-gas",
    name: "Gaz’Rax",
    world: "Forge Nexus",
    star: "55 Cancri e",
    constellation: "Cancer",
    band: "outer",
    distance: { kind: "value", value: 41, unit: "light-years" },
    line: "moon-end",
    observationNote: "no confirmed observation",
    hasGame: false,
  },
  {
    id: "king-haze",
    name: "Sur’Haze",
    world: "Venus",
    band: "inner",
    distance: { kind: "range", min: 2, max: 14.5, unit: "light-minutes" },
    line: "ember",
    hasGame: true,
  },
  {
    id: "king-dessert",
    name: "Dulcir",
    world: "Velvetreach",
    star: "Kepler-51",
    constellation: "Cygnus",
    band: "outer",
    distance: { kind: "value", value: 2600, unit: "light-years" },
    line: "moon-route",
    travelToggle: { light: "2,600 years", craftLabel: "Afim craft", craft: "20 minutes" },
    hasGame: false,
  },
  {
    id: "king-fruit",
    name: "Fruvian",
    world: "EdenRoot",
    star: "Arcturus",
    constellation: "Boötes",
    band: "outer",
    distance: { kind: "value", value: 36.7, unit: "light-years" },
    line: "meteor",
    hasGame: false,
  },
  {
    id: "king-floral",
    name: "Floraxa",
    world: "Mars",
    band: "inner",
    distance: { kind: "range", min: 3, max: 22, unit: "light-minutes", approx: true },
    line: "solid",
    earthMarker: { label: "Bermuda seabed garden" },
    hasGame: false,
  },
];

export function kingWorld(id: string): KingWorld | undefined {
  return KING_WORLDS.find((k) => k.id === id);
}

const num = (n: number) => n.toLocaleString("en-US");

/** "2–14.5 light-minutes", "~3–22 light-minutes", "2,600 light-years". */
export function formatDistance(d: KingDistance): string {
  if (d.kind === "range") {
    return `${d.approx ? "~" : ""}${num(d.min)}–${num(d.max)} ${d.unit}`;
  }
  return `${num(d.value)} ${d.unit}`;
}

/** Chart label for a world: "Forge Nexus / 55 Cancri e", or just "Venus". */
export function worldLabel(k: KingWorld): string {
  return k.star ? `${k.world} / ${k.star}` : k.world;
}

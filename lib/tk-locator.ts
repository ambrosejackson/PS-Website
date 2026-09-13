/**
 * Shared contract between GET /api/tk-locator and the TKLocator client console
 * (FILE 06 inline results — no more redirect to /store-locator). Types only;
 * keep this file free of imports so the client bundle stays clean.
 */

export interface TkLocatorStore {
  id: string;
  name: string;
  chainName: string | null;
  /** address_line1, city, state, zip joined — display only. */
  address: string;
  /** Great-circle miles from the searched ZIP's centroid, 1 decimal. */
  distanceMi: number;
  menuUrl: string | null;
  mapsUrl: string;
}

export type TkLocatorResponse =
  /** Production still gated on mock data (lib/showRealAvailability.ts). */
  | { mode: "coming_soon" }
  /** Input was not a 5-digit ZIP. */
  | { mode: "invalid_zip" }
  /** 5 digits, but not in the centroid table. */
  | { mode: "unknown_zip" }
  /** No geocoded TerpKings store exists at all. */
  | { mode: "none" }
  /** Every TerpKings store within the radius, nearest first. */
  | { mode: "radius"; stores: TkLocatorStore[] }
  /** Radius empty — the nearest TerpKings stores instead. */
  | { mode: "nearest"; stores: TkLocatorStore[] };

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { chicagoDayKey, chicagoDayStart, dayKeys as keysEndingAt, shiftDayKey } from "@/lib/admin/chicago";
import { brandFromPath } from "@/lib/analytics/schema";

/**
 * web_events → web_events_daily rollup (D-140), lifted out of the cron route in
 * P3 (D-141) so the backfill can call it for an explicit day range. Groups raw
 * events by (Chicago day, brand, path, event_type) with count(*),
 * count(distinct session_id), count(distinct visitor_id) and upserts; a rerun
 * overwrites the same keys. Reads one PostgREST page (1,000 rows) at a time;
 * only the grouped accumulators for the requested days are held in memory.
 */

const PAGE = 1000; // PostgREST response cap
const UPSERT_CHUNK = 500;

/** Largest range one call will roll up (backfill chunks and the ?from/?to route). */
export const MAX_ROLLUP_DAYS = 31;

type Db = ReturnType<typeof createAdminClient>;

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Inclusive day-key range `from..to`, oldest first. Returns null when either
 * key is malformed, the order is reversed, or the span exceeds MAX_ROLLUP_DAYS.
 */
export function dayKeyRange(from: string, to: string): string[] | null {
  if (!DAY_KEY_RE.test(from) || !DAY_KEY_RE.test(to) || from > to) return null;
  const keys: string[] = [];
  for (let k = from; k <= to; k = shiftDayKey(k, 1)) {
    keys.push(k);
    if (keys.length > MAX_ROLLUP_DAYS) return null;
  }
  return keys;
}

/** Yesterday and today-so-far (Chicago): the nightly cron's range. */
export function nightlyDayKeys(now: Date = new Date()): string[] {
  return keysEndingAt(chicagoDayKey(now), 2);
}

interface Group {
  day: string;
  brand: string;
  path: string;
  event_type: string;
  events: number;
  sessions: Set<string>;
  visitors: Set<string>;
}

export async function rollupDays(db: Db, dayKeys: string[]) {
  const wanted = new Set(dayKeys);
  const from = chicagoDayStart(dayKeys[0]).toISOString();
  const to = chicagoDayStart(shiftDayKey(dayKeys[dayKeys.length - 1], 1)).toISOString();
  const groups = new Map<string, Group>();
  let scanned = 0;

  for (let page = 0; page < 500; page++) {
    const { data, error } = await db
      .from("web_events")
      .select("ts, session_id, visitor_id, path, event_type, brand")
      .gte("ts", from)
      .lt("ts", to)
      .order("id", { ascending: true })
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (error) throw new Error(`rollup read: ${error.message}`);
    const rows = data ?? [];
    for (const r of rows) {
      if (!r.event_type) continue;
      const day = chicagoDayKey(new Date(r.ts));
      if (!wanted.has(day)) continue;
      scanned++;
      // Rows written before P2 have no brand column value; derive it from the path.
      const brand = r.brand ?? brandFromPath(r.path) ?? "";
      const path = r.path ?? "";
      const key = `${day}\u0001${brand}\u0001${path}\u0001${r.event_type}`;
      let g = groups.get(key);
      if (!g) {
        g = { day, brand, path, event_type: r.event_type, events: 0, sessions: new Set(), visitors: new Set() };
        groups.set(key, g);
      }
      g.events++;
      if (r.session_id) g.sessions.add(r.session_id);
      if (r.visitor_id) g.visitors.add(r.visitor_id);
    }
    if (rows.length < PAGE) break;
  }

  const out = [...groups.values()].map((g) => ({
    day: g.day,
    brand: g.brand,
    path: g.path,
    event_type: g.event_type,
    events: g.events,
    sessions: g.sessions.size,
    visitors: g.visitors.size,
  }));
  for (let i = 0; i < out.length; i += UPSERT_CHUNK) {
    const { error } = await db
      .from("web_events_daily")
      .upsert(out.slice(i, i + UPSERT_CHUNK), { onConflict: "day,brand,path,event_type" });
    if (error) throw new Error(`rollup upsert: ${error.message}`);
  }
  return { days: dayKeys, events: scanned, rows: out.length };
}

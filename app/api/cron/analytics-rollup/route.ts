import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chicagoDayKey, chicagoDayStart, shiftDayKey } from "@/lib/admin/chicago";
import { brandFromPath } from "@/lib/analytics/schema";

/**
 * Nightly analytics rollup + raw-event purge (D-140). Scheduled in vercel.json
 * at 09:10 UTC (03:10 Chicago on both sides of DST). Vercel sends
 * `Authorization: Bearer <CRON_SECRET>`; the same header lets ops run it by hand.
 *
 *  1. Rollup — for yesterday and today-so-far (America/Chicago), upsert
 *     web_events_daily grouped by (day, brand, path, event_type) with
 *     count(*), count(distinct session_id), count(distinct visitor_id).
 *     Re-running is safe: the upsert overwrites the same keys.
 *  2. Purge — delete web_events older than 90 days in batches of 5,000,
 *     stopping early if the time budget runs out (the next night continues).
 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PAGE = 1000; // PostgREST response cap
const PURGE_DAYS = 90;
const PURGE_BATCH = 5000;
const TIME_BUDGET_MS = 240_000;
const UPSERT_CHUNK = 500;

type Db = ReturnType<typeof createAdminClient>;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (header.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < header.length; i++) diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
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

async function rollupDays(db: Db, dayKeys: string[]) {
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

async function purgeOld(db: Db, deadline: number) {
  const cutoff = new Date(Date.now() - PURGE_DAYS * 86_400_000).toISOString();
  let deleted = 0;
  let batches = 0;
  let complete = false;
  while (Date.now() < deadline) {
    // The 5,000th oldest id bounds one batch; when fewer remain, take the newest.
    const { data: nth, error: nthErr } = await db
      .from("web_events")
      .select("id")
      .lt("ts", cutoff)
      .order("id", { ascending: true })
      .range(PURGE_BATCH - 1, PURGE_BATCH - 1);
    if (nthErr) throw new Error(`purge probe: ${nthErr.message}`);
    let maxId: number | undefined = nth?.[0]?.id;
    let last = false;
    if (maxId === undefined) {
      const { data: top } = await db.from("web_events").select("id").lt("ts", cutoff).order("id", { ascending: false }).limit(1);
      maxId = top?.[0]?.id;
      last = true;
    }
    if (maxId === undefined) {
      complete = true;
      break;
    }
    const { error, count } = await db.from("web_events").delete({ count: "exact" }).lt("ts", cutoff).lte("id", maxId);
    if (error) throw new Error(`purge delete: ${error.message}`);
    deleted += count ?? 0;
    batches++;
    if (last) {
      complete = true;
      break;
    }
  }
  return { cutoff, deleted, batches, complete };
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const started = Date.now();
  const db = createAdminClient();
  const today = chicagoDayKey();
  const out: Record<string, unknown> = {};
  try {
    out.rollup = await rollupDays(db, [shiftDayKey(today, -1), today]);
    out.purge = await purgeOld(db, started + TIME_BUDGET_MS);
    out.ms = Date.now() - started;
    console.log("[analytics-rollup]", JSON.stringify(out));
    return NextResponse.json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[analytics-rollup] failed", message, JSON.stringify(out));
    return NextResponse.json({ ...out, error: message }, { status: 500 });
  }
}

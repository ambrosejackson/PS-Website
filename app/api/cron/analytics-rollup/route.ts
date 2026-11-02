import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dayKeyRange, MAX_ROLLUP_DAYS, nightlyDayKeys, rollupDays } from "@/lib/analytics/rollup";

/**
 * Nightly analytics rollup + raw-event purge (D-140). Scheduled in vercel.json
 * at 09:10 UTC (03:10 Chicago on both sides of DST). Vercel sends
 * `Authorization: Bearer <CRON_SECRET>`; the same header lets ops run it by hand.
 *
 *  1. Rollup — for yesterday and today-so-far (America/Chicago), upsert
 *     web_events_daily grouped by (day, brand, path, event_type) with
 *     count(*), count(distinct session_id), count(distinct visitor_id).
 *     Re-running is safe: the upsert overwrites the same keys. The grouping
 *     lives in lib/analytics/rollup.ts.
 *  2. Purge — delete web_events older than 90 days in batches of 5,000,
 *     stopping early if the time budget runs out (the next night continues).
 *
 * Backfill (D-141): `?from=YYYY-MM-DD&to=YYYY-MM-DD` (Chicago day keys,
 * inclusive, at most 31 days) rolls up only those days and skips the purge.
 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const PURGE_DAYS = 90;
const PURGE_BATCH = 5000;
const TIME_BUDGET_MS = 240_000;

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
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const backfill = from !== null || to !== null;

  let keys: string[];
  if (backfill) {
    const range = from && to ? dayKeyRange(from, to) : null;
    if (!range) {
      return NextResponse.json(
        { error: `from and to must be YYYY-MM-DD Chicago day keys, from <= to, spanning at most ${MAX_ROLLUP_DAYS} days` },
        { status: 400 },
      );
    }
    keys = range;
  } else {
    keys = nightlyDayKeys();
  }

  const db = createAdminClient();
  const out: Record<string, unknown> = { mode: backfill ? "backfill" : "nightly" };
  try {
    out.rollup = await rollupDays(db, keys);
    out.daysWritten = keys.length;
    // Backfill calls roll up only; the nightly run also purges.
    if (!backfill) out.purge = await purgeOld(db, started + TIME_BUDGET_MS);
    out.ms = Date.now() - started;
    console.log("[analytics-rollup]", JSON.stringify(out));
    return NextResponse.json(out);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[analytics-rollup] failed", message, JSON.stringify(out));
    return NextResponse.json({ ...out, error: message }, { status: 500 });
  }
}

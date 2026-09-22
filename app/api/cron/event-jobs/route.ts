import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDueReminders } from "@/lib/events/reminders";
import { refreshDispensaries, retryUnsynced } from "@/lib/events/psm";

/**
 * Event background jobs, every 10 minutes (D-093). Vercel Hobby crons only run
 * daily, so the trigger is pg_cron + pg_net in the WEBSITE Supabase project,
 * calling this route with `Authorization: Bearer <CRON_SECRET>` (secret kept in
 * Supabase Vault; see docs/EVENTS-RUNBOOK.md). The same header lets ops run it
 * by hand. Jobs:
 *   1. send due reminders
 *   2. retry RSVPs that haven't reached the PSM CRM yet
 *   3. refresh the dispensary list from PSM once a day
 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

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

async function run() {
  const admin = createAdminClient();
  const out: Record<string, unknown> = {};
  try {
    out.reminders = await runDueReminders(admin);
  } catch (e) {
    out.reminders = { error: e instanceof Error ? e.message : String(e) };
  }
  out.psmSync = await retryUnsynced(admin);

  const { data: newest } = await admin
    .from("dispensaries")
    .select("refreshed_at")
    .order("refreshed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const age = newest ? Date.now() - new Date(newest.refreshed_at).getTime() : Infinity;
  if (age > 23 * 3600_000) out.dispensaries = await refreshDispensaries(admin);
  return out;
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await run());
}

export const POST = GET;

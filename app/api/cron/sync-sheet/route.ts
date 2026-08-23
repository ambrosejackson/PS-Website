import { NextResponse } from "next/server";
import { runSheetSync } from "@/lib/sheet-sync/run";

/**
 * Daily iHeartJane sheet sync (vercel.json cron). Vercel calls this with
 * `Authorization: Bearer <CRON_SECRET>`; the same header lets ops trigger it
 * by hand. Admin-initiated syncs use the server action in /admin/products.
 */
export const maxDuration = 120;
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

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  const summary = await runSheetSync({ dryRun });
  return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
}

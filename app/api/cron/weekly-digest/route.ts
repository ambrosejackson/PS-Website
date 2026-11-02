import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/admin/cron-auth";
import { buildWeeklyDigest, digestSubject, sendWeeklyDigest } from "@/lib/admin/digest";

/**
 * Monday digest email (D-142). Scheduled in vercel.json at 13:37 UTC every
 * Monday (07:37 Chicago; off the hour on purpose — Hobby crons fire within the
 * hour). Bearer-checked with CRON_SECRET like the rollup route; the same
 * header lets ops send one by hand. `?dry=1` returns the numbers without
 * sending. This is the second and final Hobby cron slot.
 */
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const started = Date.now();
  try {
    if (dry) {
      const digest = await buildWeeklyDigest();
      return NextResponse.json({ mode: "dry", subject: digestSubject(digest), digest, ms: Date.now() - started });
    }
    const { digest, subject, result } = await sendWeeklyDigest();
    const out = { mode: "send", subject, weekOf: digest.weekOf, result, ms: Date.now() - started };
    console.log("[weekly-digest]", JSON.stringify(out));
    return NextResponse.json(out, { status: result.ok ? 200 : 502 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[weekly-digest] failed", message);
    return NextResponse.json({ error: message, ms: Date.now() - started }, { status: 500 });
  }
}

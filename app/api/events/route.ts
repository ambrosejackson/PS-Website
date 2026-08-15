import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** First-party analytics sink → web_events. Fire-and-forget from the client. */

const MAX_EVENTS = 20;
const MAX_LEN = 512;

interface IncomingEvent {
  sessionId?: string;
  path?: string;
  eventType?: string;
  element?: string | null;
  referrer?: string | null;
  utm?: Record<string, string> | null;
}

const clip = (v: unknown): string | null =>
  typeof v === "string" ? v.slice(0, MAX_LEN) : null;

export async function POST(request: Request) {
  let body: { events?: IncomingEvent[] };
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const events = Array.isArray(body.events)
    ? body.events.slice(0, MAX_EVENTS)
    : [];
  if (events.length === 0) return new NextResponse(null, { status: 204 });

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  await supabase.from("web_events").insert(
    events.map((e) => ({
      session_id: clip(e.sessionId),
      path: clip(e.path),
      event_type: clip(e.eventType),
      element: clip(e.element),
      referrer: clip(e.referrer),
      utm: e.utm && typeof e.utm === "object" ? e.utm : null,
    })),
  );

  return new NextResponse(null, { status: 204 });
}

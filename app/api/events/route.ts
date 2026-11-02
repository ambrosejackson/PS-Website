import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  EVENT_TYPE_RE,
  ID_MAX_LEN,
  isAnalyticsBrand,
  isDevice,
  validateProps,
  type Props,
} from "@/lib/analytics/schema";
import type { Json } from "@/lib/database.types";

/**
 * First-party analytics sink → web_events. Fire-and-forget from the client.
 * P2 (D-140) adds visitor_id / device / brand / props and validates every
 * field: a batch with any malformed event is rejected whole (400) and nothing
 * is inserted. No PII is accepted — props values that look like an email or a
 * phone number fail validation.
 */

const MAX_EVENTS = 20;
const MAX_LEN = 512;

interface IncomingEvent {
  sessionId?: unknown;
  visitorId?: unknown;
  device?: unknown;
  brand?: unknown;
  path?: unknown;
  eventType?: unknown;
  element?: unknown;
  referrer?: unknown;
  utm?: unknown;
  props?: unknown;
}

interface CleanEvent {
  session_id: string | null;
  visitor_id: string | null;
  device: string | null;
  brand: string | null;
  path: string | null;
  event_type: string;
  element: string | null;
  referrer: string | null;
  utm: Json | null;
  props: Json | null;
}

const clip = (v: unknown): string | null => (typeof v === "string" ? v.slice(0, MAX_LEN) : null);

function optionalId(v: unknown): string | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string" || v.length === 0 || v.length > ID_MAX_LEN) return undefined;
  return v;
}

function utmOf(v: unknown): Json | null | undefined {
  if (v === undefined || v === null) return null;
  if (typeof v !== "object" || Array.isArray(v)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (!k.startsWith("utm_") || typeof val !== "string") return undefined;
    out[k] = val.slice(0, MAX_LEN);
  }
  return out;
}

/** Returns the row to insert, or null when the event is malformed. */
function clean(e: IncomingEvent): CleanEvent | null {
  if (typeof e.eventType !== "string" || !EVENT_TYPE_RE.test(e.eventType)) return null;
  const session_id = optionalId(e.sessionId);
  const visitor_id = optionalId(e.visitorId);
  if (session_id === undefined || visitor_id === undefined) return null;
  if (e.device !== undefined && e.device !== null && !isDevice(e.device)) return null;
  if (e.brand !== undefined && e.brand !== null && !isAnalyticsBrand(e.brand)) return null;
  const utm = utmOf(e.utm);
  if (utm === undefined) return null;
  const props: Props | null | undefined = validateProps(e.props);
  if (props === null) return null;
  return {
    session_id,
    visitor_id,
    device: isDevice(e.device) ? e.device : null,
    brand: isAnalyticsBrand(e.brand) ? e.brand : null,
    path: clip(e.path),
    event_type: e.eventType,
    element: clip(e.element),
    referrer: clip(e.referrer),
    utm,
    props: props ?? null,
  };
}

export async function POST(request: Request) {
  let body: { events?: IncomingEvent[] };
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  if (events.length === 0) return new NextResponse(null, { status: 204 });

  const rows: CleanEvent[] = [];
  for (const e of events) {
    const row = clean(e ?? {});
    if (!row) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
    rows.push(row);
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  await supabase.from("web_events").insert(rows);

  return new NextResponse(null, { status: 204 });
}

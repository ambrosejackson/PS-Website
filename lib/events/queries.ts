import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DispensaryOption, EventRow } from "./types";

/** Server-only reads (service role; every events table is RLS-on with no policies). */

export const getEventBySlug = cache(async (slug: string): Promise<EventRow | null> => {
  const admin = createAdminClient();
  const { data } = await admin.from("events").select("*").eq("slug", slug).maybeSingle();
  return data ?? null;
});

export async function getDispensaryOptions(): Promise<DispensaryOption[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("dispensaries")
    .select("psm_account_id, name, city")
    .eq("is_active", true)
    .order("name");
  return (data ?? []).map((d) => ({ id: d.psm_account_id, name: d.name, city: d.city ?? "" }));
}

export interface PlateStats {
  cap: number;
  confirmed: number;
  waitlisted: number;
  left: number;
}

export async function getPlateStats(ev: EventRow): Promise<PlateStats> {
  const admin = createAdminClient();
  const count = async (plate: "confirmed" | "waitlisted") => {
    const { count: n } = await admin
      .from("event_rsvps")
      .select("id", { count: "exact", head: true })
      .eq("event_id", ev.id)
      .eq("status", "confirmed")
      .eq("plate_status", plate);
    return n ?? 0;
  };
  const [confirmed, waitlisted] = await Promise.all([count("confirmed"), count("waitlisted")]);
  return { cap: ev.plate_cap, confirmed, waitlisted, left: Math.max(0, ev.plate_cap - confirmed) };
}

export function rsvpIsOpen(ev: EventRow, now = new Date()): boolean {
  if (!ev.rsvp_open) return false;
  if (ev.rsvp_closes_at && now > new Date(ev.rsvp_closes_at)) return false;
  return now <= new Date(ev.ends_at);
}

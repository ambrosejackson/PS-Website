import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventDate, eventTimeRange } from "@/lib/events/format";
import { psmConfigured } from "@/lib/events/psm";
import { EventSettingsForm } from "./EventSettingsForm";
import { RsvpTable } from "./RsvpTable";

export const dynamic = "force-dynamic";

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

/** /admin/events/[slug] — counts, settings, full RSVP list with actions (D-095). */
export default async function AdminEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: ev } = await admin.from("events").select("*").eq("slug", slug).maybeSingle();
  if (!ev) notFound();
  const [{ data: rsvps }, { data: reminders }, { count: dispCount }] = await Promise.all([
    admin.from("event_rsvps").select("*").eq("event_id", ev.id).order("created_at", { ascending: false }),
    admin.from("event_reminders").select("name, status, enabled, resolved_send_at").eq("event_id", ev.id).order("resolved_send_at"),
    admin.from("dispensaries").select("psm_account_id", { count: "exact", head: true }).eq("is_active", true),
  ]);
  const all = rsvps ?? [];
  const live = all.filter((r) => r.status === "confirmed");
  const budtenders = live.filter((r) => r.is_budtender);
  const platesConfirmed = live.filter((r) => r.plate_status === "confirmed").length;
  const waitlisted = live.filter((r) => r.plate_status === "waitlisted").length;
  const redeemed = live.filter((r) => r.plate_redeemed_at).length;
  const checkedIn = live.filter((r) => r.checked_in_at).length;
  const unsynced = all.filter((r) => !r.psm_synced_at).length;
  const optedIn = live.filter((r) => r.marketing_opt_in).length;
  const next = (reminders ?? []).find((r) => r.status === "scheduled" && r.enabled);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">
            {ev.name}
            {ev.tagline && <span className="text-neutral-500">: {ev.tagline}</span>}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {eventDate(ev)}, {eventTimeRange(ev)} · {ev.address}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/events/${slug}`} target="_blank" className="rounded border bg-white px-3 py-2 hover:bg-neutral-50">Public page ↗</Link>
          <Link href={`/admin/events/${slug}/reminders`} className="rounded border bg-white px-3 py-2 hover:bg-neutral-50">Reminders</Link>
          <Link href={`/checkin/${slug}`} className="rounded bg-neutral-900 px-3 py-2 text-white">Check-in screen</Link>
        </div>
      </div>

      {!psmConfigured() && (
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          PSM_INGEST_TOKEN is not set, so RSVPs are saved here but not synced to the PS Management CRM yet. They&apos;ll sync automatically once it&apos;s configured.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="RSVPs" value={live.length} sub={`${all.length - live.length} cancelled`} />
        <Stat label="Budtenders" value={budtenders.length} />
        <Stat label="Plates reserved" value={`${platesConfirmed} / ${ev.plate_cap}`} sub={`${Math.max(0, ev.plate_cap - platesConfirmed)} free · ${waitlisted} waitlisted`} />
        <Stat label="Checked in" value={checkedIn} sub={`${redeemed} plates redeemed`} />
        <Stat label="Marketing opt-ins" value={optedIn} />
        <Stat label="Not in CRM yet" value={unsynced} sub={unsynced ? "retries every 10 min" : "all synced"} />
        <Stat label="Dispensary list" value={dispCount ?? 0} sub="from PS Management" />
        <Stat
          label="Next reminder"
          value={next ? next.name : "—"}
          sub={next?.resolved_send_at ? new Date(next.resolved_send_at).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" }) + " CT" : undefined}
        />
      </div>

      <EventSettingsForm
        slug={slug}
        initial={{ plate_cap: ev.plate_cap, rsvp_open: ev.rsvp_open, weather_note: ev.weather_note ?? "", psm_qr_code_id: ev.psm_qr_code_id ?? "" }}
        freePlates={Math.max(0, ev.plate_cap - platesConfirmed)}
        waitlisted={waitlisted}
      />

      <RsvpTable slug={slug} rows={all} platesFree={Math.max(0, ev.plate_cap - platesConfirmed)} />
    </div>
  );
}

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { eventDate, eventTimeRange } from "@/lib/events/format";

export const dynamic = "force-dynamic";

/** /admin/events — every event with its RSVP count. */
export default async function AdminEventsPage() {
  const admin = createAdminClient();
  const { data: events } = await admin.from("events").select("*").order("starts_at", { ascending: false });
  const counts = await Promise.all(
    (events ?? []).map(async (e) => {
      const { count } = await admin.from("event_rsvps").select("id", { count: "exact", head: true }).eq("event_id", e.id).eq("status", "confirmed");
      return count ?? 0;
    }),
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Events</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">RSVPs, plates, reminders and check-in. New events are added in the database for now (one row in <code>events</code>).</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {(events ?? []).map((e, i) => (
          <Link key={e.id} href={`/admin/events/${e.slug}`} className="block rounded border bg-white p-5 hover:border-neutral-400">
            <p className="font-condensed text-xl font-bold uppercase">{e.name}</p>
            {e.tagline && <p className="text-sm text-neutral-500">{e.tagline}</p>}
            <p className="mt-2 text-sm">{eventDate(e)}, {eventTimeRange(e)}</p>
            <p className="mt-3 text-sm font-semibold">{counts[i]} RSVPs</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

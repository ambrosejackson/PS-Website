import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { countRecipients } from "@/lib/events/reminders";
import type { ReminderAudience } from "@/lib/events/types";
import { MERGE_FIELDS } from "@/lib/events/emails";
import { ReminderList } from "./ReminderList";

export const dynamic = "force-dynamic";

/** /admin/events/[slug]/reminders — scheduled reminder emails (D-093, D-015). */
export default async function RemindersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();
  const { data: ev } = await admin.from("events").select("*").eq("slug", slug).maybeSingle();
  if (!ev) notFound();
  const { data: reminders } = await admin.from("event_reminders").select("*").eq("event_id", ev.id).order("resolved_send_at");
  const withCounts = await Promise.all(
    (reminders ?? []).map(async (r) => {
      const { data: sends } = await admin.from("event_reminder_sends").select("status").eq("reminder_id", r.id);
      const tally: Record<string, number> = {};
      for (const s of sends ?? []) tally[s.status] = (tally[s.status] ?? 0) + 1;
      const audienceNow = r.status === "sent" ? null : await countRecipients(admin, ev.id, r.audience as ReminderAudience, r.is_marketing);
      return { ...r, tally, audienceNow };
    }),
  );
  const eventLocalDate = new Intl.DateTimeFormat("en-CA", { timeZone: ev.timezone }).format(new Date(ev.starts_at));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/events/${slug}`} className="text-xs text-neutral-500 underline">← {ev.name}</Link>
        <h1 className="mt-1 font-condensed text-2xl font-bold uppercase tracking-tight">Reminders</h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          Emails go out automatically at the scheduled time (checked every 10 minutes, Chicago time) from{" "}
          <code>{ev.email_from}</code>, replies to <code>{ev.email_reply_to}</code>. The guest list is pulled at send
          time, so late RSVPs are included. Text messages are off for this event (no cannabis-compliant SMS provider).
        </p>
      </div>
      <ReminderList slug={slug} eventLocalDate={eventLocalDate} reminders={withCounts} mergeFields={MERGE_FIELDS.map(([k, d]) => ({ key: k, desc: d }))} />
    </div>
  );
}

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { send, sendBatch, type EmailMessage } from "@/lib/email";
import { reminderEmail } from "./emails";
import type { EventRow, ReminderAudience, ReminderRow, RsvpRow } from "./types";

type Admin = SupabaseClient<Database>;

/**
 * Scheduled reminders (D-093). /api/cron/event-jobs runs every 10 minutes
 * (pg_cron in the website project, see docs/EVENTS-RUNBOOK.md) and calls
 * runDueReminders():
 *   1. reminders stuck in 'sending' for 20+ minutes go back to 'scheduled'
 *      (a crashed run resumes; recipients already sent are skipped);
 *   2. claim_due_reminders() atomically flips due rows to 'sending';
 *   3. recipients are resolved at send time, so late RSVPs are included;
 *   4. one event_reminder_sends row per recipient — unique (reminder, rsvp,
 *      channel) is the no-duplicate guarantee — then Resend batches of 100.
 * SMS: not in v1 (D-014). 'both' sends the email half; 'sms' fails loudly.
 */

interface Filterable<T> {
  eq(column: string, value: string | boolean): T;
  not(column: string, operator: "is", value: null): T;
  is(column: string, value: null): T;
}

export function audienceFilter<T extends Filterable<T>>(
  q: T,
  audience: ReminderAudience,
  isMarketing: boolean,
): T {
  let x = q.eq("status", "confirmed").eq("email_bounced", false);
  switch (audience) {
    case "budtenders": x = x.eq("is_budtender", true); break;
    case "plate_holders": x = x.eq("plate_status", "confirmed"); break;
    case "plate_waitlist": x = x.eq("plate_status", "waitlisted"); break;
    case "checked_in": x = x.not("checked_in_at", "is", null); break;
    case "not_checked_in": x = x.is("checked_in_at", null); break;
    case "opted_in": x = x.eq("marketing_opt_in", true); break;
    default: break;
  }
  if (isMarketing) x = x.eq("marketing_opt_in", true);
  return x;
}

export async function countRecipients(admin: Admin, eventId: string, audience: ReminderAudience, isMarketing: boolean): Promise<number> {
  const base = admin.from("event_rsvps").select("id", { count: "exact", head: true }).eq("event_id", eventId);
  const { count } = await audienceFilter(base, audience, isMarketing);
  return count ?? 0;
}

async function recipients(admin: Admin, r: ReminderRow): Promise<RsvpRow[]> {
  const out: RsvpRow[] = [];
  for (let from = 0; ; from += 1000) {
    const base = admin.from("event_rsvps").select("*").eq("event_id", r.event_id);
    const { data, error } = await audienceFilter(base, r.audience as ReminderAudience, r.is_marketing)
      .order("created_at")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function sendOne(admin: Admin, ev: EventRow, r: ReminderRow): Promise<{ sent: number; error?: string }> {
  if (r.channel === "sms") return { sent: 0, error: "SMS is not enabled (no cannabis-compliant SMS provider configured)." };

  const list = await recipients(admin, r);
  const { data: done } = await admin
    .from("event_reminder_sends")
    .select("rsvp_id")
    .eq("reminder_id", r.id)
    .eq("channel", "email")
    .in("status", ["sent", "delivered", "bounced", "complained"]);
  const already = new Set((done ?? []).map((d) => d.rsvp_id));
  const todo = list.filter((x) => !already.has(x.id));

  if (todo.length) {
    const { error } = await admin
      .from("event_reminder_sends")
      .upsert(todo.map((x) => ({ reminder_id: r.id, rsvp_id: x.id, channel: "email", status: "queued" })), {
        onConflict: "reminder_id,rsvp_id,channel",
        ignoreDuplicates: true,
      });
    if (error) return { sent: 0, error: error.message };
  }

  let sent = 0;
  for (let i = 0; i < todo.length; i += 100) {
    const chunk = todo.slice(i, i + 100);
    const msgs: EmailMessage[] = chunk.map((x) => reminderEmail(ev, x, r));
    const res = await sendBatch(msgs, `rem-${r.id}-${chunk[0].id}-${chunk.length}`);
    const now = new Date().toISOString();
    if (res.skipped) return { sent, error: "RESEND_API_KEY is not set; nothing was sent." };
    if (!res.ok) {
      await admin
        .from("event_reminder_sends")
        .update({ status: "failed", error: res.error ?? "send failed", updated_at: now })
        .eq("reminder_id", r.id)
        .in("rsvp_id", chunk.map((x) => x.id));
      return { sent, error: res.error ?? "send failed" };
    }
    await Promise.all(
      chunk.map((x, j) =>
        admin
          .from("event_reminder_sends")
          .update({ status: "sent", provider_message_id: res.ids[j] ?? null, sent_at: now, updated_at: now, error: null })
          .eq("reminder_id", r.id)
          .eq("rsvp_id", x.id)
          .eq("channel", "email"),
      ),
    );
    sent += chunk.length;
  }
  return { sent: sent + already.size };
}

export async function runDueReminders(admin: Admin): Promise<{ processed: number; results: { id: string; sent: number; error?: string }[] }> {
  const stale = new Date(Date.now() - 20 * 60_000).toISOString();
  await admin.from("event_reminders").update({ status: "scheduled" }).eq("status", "sending").lt("updated_at", stale);

  const { data: due, error } = await admin.rpc("claim_due_reminders");
  if (error) throw new Error(error.message);
  const results: { id: string; sent: number; error?: string }[] = [];
  for (const r of due ?? []) {
    const { data: ev } = await admin.from("events").select("*").eq("id", r.event_id).single();
    if (!ev) continue;
    let outcome: { sent: number; error?: string };
    try {
      outcome = await sendOne(admin, ev, r);
    } catch (e) {
      outcome = { sent: 0, error: e instanceof Error ? e.message : "unknown error" };
    }
    await admin
      .from("event_reminders")
      .update(
        outcome.error
          ? { status: "failed", last_error: outcome.error.slice(0, 500), recipient_count: outcome.sent }
          : { status: "sent", sent_at: new Date().toISOString(), recipient_count: outcome.sent, last_error: null },
      )
      .eq("id", r.id);
    results.push({ id: r.id, ...outcome });
  }
  return { processed: results.length, results };
}

/** "Send test to me": renders against the admin's own RSVP if one exists, else a sample budtender with a reserved plate. */
export async function sendTestReminder(admin: Admin, reminderId: string, to: string) {
  const { data: r } = await admin.from("event_reminders").select("*").eq("id", reminderId).single();
  if (!r) throw new Error("Reminder not found");
  const { data: ev } = await admin.from("events").select("*").eq("id", r.event_id).single();
  if (!ev) throw new Error("Event not found");
  const { data: own } = await admin.from("event_rsvps").select("*").eq("event_id", ev.id).eq("email", to).maybeSingle();
  const sample: RsvpRow = own ?? {
    id: "00000000-0000-0000-0000-000000000000",
    event_id: ev.id,
    first_name: "Sample",
    last_name: "Guest",
    email: to,
    phone: null,
    confirmed_21: true,
    marketing_opt_in: true,
    marketing_opt_in_at: null,
    is_budtender: true,
    dispensary_psm_account_id: null,
    dispensary_name: "Parkway Dispensary Tilton",
    dispensary_city: "Tilton",
    plate_status: "confirmed",
    plate_waitlist_position: null,
    status: "confirmed",
    cancelled_at: null,
    source: "web",
    ticket_token: "sample-ticket",
    checked_in_at: null,
    checked_in_by: null,
    badge_verified_at: null,
    badge_verified_by: null,
    plate_redeemed_at: null,
    plate_redeemed_by: null,
    email_bounced: false,
    confirmation_sent_at: null,
    psm_contact_id: null,
    psm_synced_at: null,
    psm_sync_error: null,
    psm_sync_attempts: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const msg = reminderEmail(ev, { ...sample, email: to }, r);
  return send({ ...msg, subject: `[TEST] ${msg.subject}` });
}

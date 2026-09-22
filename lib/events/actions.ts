"use server";

import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { send } from "@/lib/email";
import { subscribeEmail } from "@/lib/newsletter/subscribe";
import { confirmationEmail } from "./emails";
import { normalizePhone } from "./format";
import { syncRsvp } from "./psm";
import type { EventRow, PlateStatus, RsvpRow } from "./types";

/**
 * Public RSVP server actions (D-092). All writes use the service role behind
 * this validation; the race-safe work (duplicate check, plate cap, waitlist
 * position) happens inside claim_rsvp() in Postgres.
 */

export type RsvpFormState =
  | { status: "idle" }
  | { status: "error"; message: string; fields?: Record<string, string>; values?: Record<string, string> }
  | {
      status: "done";
      firstName: string;
      email: string;
      ticketToken: string;
      plateStatus: PlateStatus;
      waitlistPosition: number | null;
      duplicate: boolean;
      isBudtender: boolean;
    };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Humans take longer than this to fill the form; bots usually don't. */
const MIN_FILL_MS = 2500;

function str(fd: FormData, k: string, max = 200): string {
  return String(fd.get(k) ?? "").trim().slice(0, max);
}

export async function rsvpAction(_prev: RsvpFormState, fd: FormData): Promise<RsvpFormState> {
  // Honeypot + minimum fill time: pretend success-shaped error with no detail.
  if (str(fd, "website")) return { status: "error", message: "Something went wrong. Please try again." };
  const startedAt = Number(fd.get("startedAt"));
  if (Number.isFinite(startedAt) && startedAt > 0 && Date.now() - startedAt < MIN_FILL_MS) {
    return { status: "error", message: "Please take a second to check your details, then submit again.", values: Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)])) };
  }

  const slug = str(fd, "slug", 60);
  const firstName = str(fd, "firstName", 80);
  const lastName = str(fd, "lastName", 80);
  const email = str(fd, "email", 254).toLowerCase();
  const phoneRaw = str(fd, "phone", 30);
  const is21 = fd.get("confirm21") === "on";
  const optIn = fd.get("marketingOptIn") === "on";
  const isBudtender = fd.get("isBudtender") === "on";
  const dispensaryId = str(fd, "dispensaryId", 40) || null;
  const dispensaryName = str(fd, "dispensaryName", 120);
  const dispensaryCity = str(fd, "dispensaryCity", 80);
  const source = str(fd, "source", 20) === "walk_up" ? "walk_up" : "web";

  const fields: Record<string, string> = {};
  if (!firstName) fields.firstName = "Enter your first name.";
  if (!lastName) fields.lastName = "Enter your last name.";
  if (!EMAIL_RE.test(email)) fields.email = "Enter a valid email address.";
  const phone = normalizePhone(phoneRaw);
  if (phone === "invalid") fields.phone = "Enter a 10-digit US mobile number, or leave it blank.";
  if (!is21) fields.confirm21 = "You must be 21 or older to attend.";
  if (isBudtender) {
    if (!dispensaryName) fields.dispensaryName = "Enter your dispensary.";
    if (!dispensaryCity) fields.dispensaryCity = "Enter the town or city.";
  }
  if (dispensaryId && !/^[0-9a-f-]{36}$/i.test(dispensaryId)) fields.dispensaryName = "Pick your dispensary from the list, or choose Other.";
  const values = {
    firstName, lastName, email, phone: phoneRaw, dispensaryName, dispensaryCity,
    isBudtender: isBudtender ? "on" : "", marketingOptIn: optIn ? "on" : "", confirm21: is21 ? "on" : "",
  };
  if (Object.keys(fields).length) {
    return { status: "error", message: "Please fix the highlighted fields.", fields, values };
  }

  const admin = createAdminClient();
  const { data: ev } = await admin.from("events").select("*").eq("slug", slug).maybeSingle();
  if (!ev) return { status: "error", message: "This event isn't taking RSVPs." };

  // A picked dispensary must exist in the mirrored PSM directory; otherwise treat as "Other".
  let psmAccountId: string | null = null;
  if (isBudtender && dispensaryId) {
    const { data: d } = await admin.from("dispensaries").select("psm_account_id").eq("psm_account_id", dispensaryId).maybeSingle();
    psmAccountId = d?.psm_account_id ?? null;
  }

  const { data: claim, error } = await admin.rpc("claim_rsvp", {
    p_event_id: ev.id,
    p_first_name: firstName,
    p_last_name: lastName,
    p_email: email,
    p_phone: phone,
    p_marketing_opt_in: optIn,
    p_is_budtender: isBudtender,
    p_dispensary_psm_account_id: isBudtender ? psmAccountId : null,
    p_dispensary_name: isBudtender ? dispensaryName : null,
    p_dispensary_city: isBudtender ? dispensaryCity : null,
    p_source: source,
  });
  if (error) {
    if (error.message.includes("rsvp_closed")) return { status: "error", message: "RSVPs for this event are closed." };
    console.error("[rsvp] claim_rsvp failed:", error.message);
    return { status: "error", message: "We couldn't save your RSVP. Please try again in a minute.", values };
  }
  const c = claim as { id: string; ticket_token: string; plate_status: PlateStatus; plate_waitlist_position: number | null; duplicate: boolean };

  const { data: row } = await admin.from("event_rsvps").select("*").eq("id", c.id).single();

  if (row) {
    // Confirmation (re-sent on duplicates so a guest who lost the email gets it again).
    const msg = confirmationEmail(ev, row);
    // A duplicate submit is a "send it again" request: fresh idempotency key (Resend dedupes keys for 24h).
    const res = await send(c.duplicate ? { ...msg, idempotencyKey: `${msg.idempotencyKey}-again-${Date.now()}` } : msg);
    if (res.ok && !("skipped" in res)) {
      await admin.from("event_rsvps").update({ confirmation_sent_at: new Date().toISOString() }).eq("id", row.id);
    }
    // CRM sync + newsletter after the response is sent; failures are retried by cron.
    if (!c.duplicate) {
      after(async () => {
        await syncRsvp(admin, ev as EventRow, row as RsvpRow);
        if (optIn) await subscribeEmail(admin, { email, sourcePath: `/events/${ev.slug}` });
      });
    }
  }

  return {
    status: "done",
    firstName,
    email,
    ticketToken: c.ticket_token,
    plateStatus: c.plate_status,
    waitlistPosition: c.plate_waitlist_position,
    duplicate: c.duplicate,
    isBudtender,
  };
}

export type TicketActionState = { status: "idle" } | { status: "done"; message: string } | { status: "error"; message: string };

export async function cancelRsvpAction(_prev: TicketActionState, fd: FormData): Promise<TicketActionState> {
  const token = String(fd.get("token") ?? "");
  if (!/^[0-9a-f]{48}$/.test(token)) return { status: "error", message: "That ticket link isn't valid." };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("cancel_rsvp", { p_ticket_token: token });
  const r = data as { ok: boolean } | null;
  if (error || !r?.ok) return { status: "error", message: "This RSVP is already cancelled or checked in." };
  const { data: row } = await admin.from("event_rsvps").select("*, events(*)").eq("ticket_token", token).single();
  if (row) {
    const { events: ev, ...rsvp } = row as RsvpRow & { events: EventRow };
    after(() => syncRsvp(admin, ev, rsvp));
  }
  return { status: "done", message: "Your RSVP is cancelled. Thanks for letting us know." };
}

export async function unsubscribeAction(_prev: TicketActionState, fd: FormData): Promise<TicketActionState> {
  const token = String(fd.get("token") ?? "");
  if (!/^[0-9a-f]{48}$/.test(token)) return { status: "error", message: "That link isn't valid." };
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("event_rsvps")
    .update({ marketing_opt_in: false })
    .eq("ticket_token", token)
    .select("*, events(*)")
    .maybeSingle();
  if (!row) return { status: "error", message: "That link isn't valid." };
  const { events: ev, ...rsvp } = row as RsvpRow & { events: EventRow };
  // One unsubscribe covers the site newsletter too (same address).
  await admin.from("subscribers").update({ consent_marketing: false }).eq("email", rsvp.email.toLowerCase());
  after(() => syncRsvp(admin, ev, rsvp, { unsubscribed: true }));
  return { status: "done", message: "You're unsubscribed from marketing emails. You'll still get reminders about this event unless you cancel your RSVP." };
}

"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { send } from "@/lib/email";
import { confirmationEmail, plateReleasedEmail } from "./emails";
import { refreshDispensaries, syncRsvp } from "./psm";
import { sendTestReminder } from "./reminders";
import { requireAdmin, requireCheckIn } from "./staff";
import type { EventRow, ReminderAudience, RsvpRow } from "./types";
import { REMINDER_AUDIENCES } from "./types";

/** Admin + check-in server actions (D-095, D-096). Every action re-checks the caller's role. */

export type ActionResult = { ok: true; message?: string } | { ok: false; message: string };

async function rsvpWithEvent(id: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("event_rsvps").select("*, events(*)").eq("id", id).single();
  if (!data) throw new Error("RSVP not found");
  const { events: ev, ...rsvp } = data as RsvpRow & { events: EventRow };
  return { admin, ev, rsvp };
}

function refresh(slug: string) {
  revalidatePath(`/admin/events/${slug}`);
  revalidatePath(`/events/${slug}`);
}

// ----------------------------------------------------------------- RSVPs (admin)

export async function adminCancelRsvp(id: string): Promise<ActionResult> {
  await requireAdmin();
  const { admin, ev, rsvp } = await rsvpWithEvent(id);
  if (rsvp.checked_in_at) return { ok: false, message: "Already checked in; can't cancel." };
  const { data } = await admin.rpc("cancel_rsvp", { p_ticket_token: rsvp.ticket_token });
  if (!(data as { ok: boolean } | null)?.ok) return { ok: false, message: "Already cancelled." };
  await syncRsvp(admin, ev, { ...rsvp, status: "cancelled" });
  refresh(ev.slug);
  return { ok: true, message: "RSVP cancelled." };
}

export async function adminResendConfirmation(id: string): Promise<ActionResult> {
  await requireAdmin();
  const { ev, rsvp } = await rsvpWithEvent(id);
  const msg = confirmationEmail(ev, rsvp);
  const res = await send({ ...msg, idempotencyKey: `${msg.idempotencyKey}-resend-${Date.now()}` });
  return res.ok ? { ok: true, message: "Confirmation re-sent." } : { ok: false, message: res.error };
}

export async function adminReleasePlate(id: string): Promise<ActionResult> {
  await requireAdmin();
  const { admin, ev } = await rsvpWithEvent(id);
  const { data } = await admin.rpc("release_waitlisted_plate", { p_rsvp_id: id });
  const r = data as { ok: boolean; reason?: string } | null;
  if (!r?.ok) {
    return { ok: false, message: r?.reason === "no_plates_free" ? "No plates are free. Raise the cap in event settings or wait for a cancellation." : "This guest isn't on the plate waitlist." };
  }
  const { data: fresh } = await admin.from("event_rsvps").select("*").eq("id", id).single();
  if (fresh) await send(plateReleasedEmail(ev, fresh));
  refresh(ev.slug);
  return { ok: true, message: "Plate released and the guest was emailed." };
}

export async function adminRetrySync(id: string): Promise<ActionResult> {
  await requireAdmin();
  const { admin, ev, rsvp } = await rsvpWithEvent(id);
  const ok = await syncRsvp(admin, ev, rsvp);
  refresh(ev.slug);
  return ok ? { ok: true, message: "Synced to PS Management." } : { ok: false, message: "Sync failed; see the error on the row." };
}

// ----------------------------------------------------------------- Event settings

export async function adminUpdateEvent(slug: string, fd: FormData): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const cap = Number(fd.get("plate_cap"));
  if (!Number.isInteger(cap) || cap < 0 || cap > 5000) return { ok: false, message: "Plate cap must be a whole number." };
  const qr = String(fd.get("psm_qr_code_id") ?? "").trim();
  if (qr && !/^[0-9a-f-]{36}$/i.test(qr)) return { ok: false, message: "PSM QR code id must be a UUID." };
  const { error } = await admin
    .from("events")
    .update({
      plate_cap: cap,
      rsvp_open: fd.get("rsvp_open") === "on",
      weather_note: String(fd.get("weather_note") ?? "").trim() || null,
      psm_qr_code_id: qr || null,
    })
    .eq("slug", slug);
  if (error) return { ok: false, message: error.message };
  refresh(slug);
  return { ok: true, message: "Event settings saved." };
}

export async function adminRefreshDispensaries(): Promise<ActionResult> {
  await requireAdmin();
  const r = await refreshDispensaries(createAdminClient());
  revalidatePath("/events", "layout");
  return r.ok ? { ok: true, message: `Dispensary list refreshed (${r.count}).` } : { ok: false, message: r.error ?? "Refresh failed." };
}

// ----------------------------------------------------------------- Reminders

const AUDIENCES = new Set<string>(REMINDER_AUDIENCES.map((a) => a.value));

export async function adminSaveReminder(slug: string, fd: FormData): Promise<ActionResult> {
  const who = await requireAdmin();
  const admin = createAdminClient();
  const { data: ev } = await admin.from("events").select("id").eq("slug", slug).single();
  if (!ev) return { ok: false, message: "Event not found." };

  const id = String(fd.get("id") ?? "") || null;
  const name = String(fd.get("name") ?? "").trim();
  const subject = String(fd.get("subject") ?? "").trim();
  const body = String(fd.get("body_html") ?? "").trim();
  const audience = String(fd.get("audience") ?? "all");
  const channel = String(fd.get("channel") ?? "email");
  const mode = String(fd.get("send_mode") ?? "relative");
  if (!name || !subject || !body) return { ok: false, message: "Name, subject and message are required." };
  if (!AUDIENCES.has(audience)) return { ok: false, message: "Pick an audience." };
  if (channel !== "email") return { ok: false, message: "Only email is enabled for this event (D-014)." };

  let timing: { send_mode: "absolute" | "relative"; send_at: string | null; offset_days: number | null; local_time: string | null };
  if (mode === "absolute") {
    const local = String(fd.get("send_at_local") ?? ""); // "2026-10-24T10:00" in Chicago time
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return { ok: false, message: "Pick a date and time." };
    timing = { send_mode: "absolute", send_at: chicagoToUtc(local), offset_days: null, local_time: null };
  } else {
    const days = Number(fd.get("offset_days"));
    const time = String(fd.get("local_time") ?? "");
    if (!Number.isInteger(days) || days < -60 || days > 30) return { ok: false, message: "Days must be between -60 and 30." };
    if (!/^\d{2}:\d{2}$/.test(time)) return { ok: false, message: "Pick a time." };
    timing = { send_mode: "relative", send_at: null, offset_days: days, local_time: time };
  }

  const row = {
    event_id: ev.id,
    name,
    subject,
    body_html: body,
    audience: audience as ReminderAudience,
    channel: "email",
    is_marketing: fd.get("is_marketing") === "on",
    enabled: fd.get("enabled") === "on",
    ...timing,
  };
  if (id) {
    const { data: cur } = await admin.from("event_reminders").select("status").eq("id", id).single();
    if (cur?.status === "sent" || cur?.status === "sending") return { ok: false, message: "This reminder already went out; duplicate it instead." };
    const { error } = await admin.from("event_reminders").update({ ...row, status: "scheduled" }).eq("id", id);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await admin.from("event_reminders").insert({ ...row, created_by: who });
    if (error) return { ok: false, message: error.message };
  }
  revalidatePath(`/admin/events/${slug}/reminders`);
  return { ok: true, message: "Reminder saved." };
}

/** "2026-10-24T10:00" as America/Chicago wall time → UTC ISO. */
function chicagoToUtc(local: string): string {
  const guess = new Date(`${local}:00Z`);
  const asChicago = new Date(guess.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const asUtc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() + (asUtc.getTime() - asChicago.getTime())).toISOString();
}

export async function adminToggleReminder(id: string, slug: string, enabled: boolean): Promise<ActionResult> {
  await requireAdmin();
  const { error } = await createAdminClient().from("event_reminders").update({ enabled }).eq("id", id);
  revalidatePath(`/admin/events/${slug}/reminders`);
  return error ? { ok: false, message: error.message } : { ok: true };
}

export async function adminRetryReminder(id: string, slug: string): Promise<ActionResult> {
  await requireAdmin();
  const { error } = await createAdminClient()
    .from("event_reminders")
    .update({ status: "scheduled", last_error: null })
    .eq("id", id)
    .eq("status", "failed");
  revalidatePath(`/admin/events/${slug}/reminders`);
  return error ? { ok: false, message: error.message } : { ok: true, message: "Queued; goes out on the next 10-minute run. Guests already sent are skipped." };
}

export async function adminDeleteReminder(id: string, slug: string): Promise<ActionResult> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: cur } = await admin.from("event_reminders").select("status").eq("id", id).single();
  if (cur?.status === "sent" || cur?.status === "sending") return { ok: false, message: "Sent reminders are kept for the record; disable instead." };
  const { error } = await admin.from("event_reminders").delete().eq("id", id);
  revalidatePath(`/admin/events/${slug}/reminders`);
  return error ? { ok: false, message: error.message } : { ok: true, message: "Reminder deleted." };
}

export async function adminSendTest(id: string): Promise<ActionResult> {
  const who = await requireAdmin();
  const res = await sendTestReminder(createAdminClient(), id, who);
  if (!res.ok) return { ok: false, message: res.error };
  return { ok: true, message: "skipped" in res ? "RESEND_API_KEY is not set; nothing sent." : `Test sent to ${who}.` };
}

// ----------------------------------------------------------------- Check-in staff

export async function adminAddCheckinStaff(fd: FormData): Promise<ActionResult> {
  const who = await requireAdmin();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "Enter a valid email." };
  if (password.length < 10) return { ok: false, message: "Password must be at least 10 characters." };
  const admin = createAdminClient();
  const { error: createErr } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (createErr && !/already|registered|exists/i.test(createErr.message)) return { ok: false, message: createErr.message };
  const { error } = await admin.from("staff_roles").upsert({ email, role: "checkin", created_by: who });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/staff");
  return {
    ok: true,
    message: createErr
      ? `${email} already had an account; check-in access added (their existing password is unchanged).`
      : `${email} can now sign in at /admin/login and use check-in.`,
  };
}

export async function adminRemoveCheckinStaff(email: string): Promise<ActionResult> {
  await requireAdmin();
  const { error } = await createAdminClient().from("staff_roles").delete().eq("email", email);
  revalidatePath("/admin/staff");
  return error ? { ok: false, message: error.message } : { ok: true, message: `Check-in access removed for ${email}.` };
}

// ----------------------------------------------------------------- Check-in (admins + check-in staff)

export interface CheckinRecord {
  id: string;
  name: string;
  email: string;
  status: string;
  isBudtender: boolean;
  dispensary: string | null;
  plateStatus: string;
  waitlistPosition: number | null;
  checkedInAt: string | null;
  badgeVerifiedAt: string | null;
  plateRedeemedAt: string | null;
}

function toRecord(r: RsvpRow): CheckinRecord {
  return {
    id: r.id,
    name: `${r.first_name} ${r.last_name}`,
    email: r.email,
    status: r.status,
    isBudtender: r.is_budtender,
    dispensary: r.is_budtender ? `${r.dispensary_name ?? ""}${r.dispensary_city ? `, ${r.dispensary_city}` : ""}` : null,
    plateStatus: r.plate_status,
    waitlistPosition: r.plate_waitlist_position,
    checkedInAt: r.checked_in_at,
    badgeVerifiedAt: r.badge_verified_at,
    plateRedeemedAt: r.plate_redeemed_at,
  };
}

export async function checkinLookup(slug: string, query: string): Promise<CheckinRecord[]> {
  await requireCheckIn();
  const admin = createAdminClient();
  const { data: ev } = await admin.from("events").select("id").eq("slug", slug).single();
  if (!ev) return [];
  const q = query.trim();
  // A scanned QR is the full ticket URL; pull the 48-hex token out of it.
  const token = q.match(/[0-9a-f]{48}/)?.[0];
  if (token) {
    const { data } = await admin.from("event_rsvps").select("*").eq("event_id", ev.id).eq("ticket_token", token).limit(1);
    return (data ?? []).map(toRecord);
  }
  if (q.length < 2) return [];
  const safe = q.replace(/[%_,()]/g, " ").trim();
  const parts = safe.split(/\s+/).filter(Boolean);
  let req = admin.from("event_rsvps").select("*").eq("event_id", ev.id);
  if (parts.length >= 2) {
    req = req.ilike("first_name", `${parts[0]}%`).ilike("last_name", `${parts.slice(1).join(" ")}%`);
  } else {
    req = req.or(`first_name.ilike.${safe}%,last_name.ilike.${safe}%,email.ilike.${safe}%`);
  }
  const { data } = await req.order("last_name").limit(25);
  return (data ?? []).map(toRecord);
}

type Step = "check_in" | "verify_badge" | "redeem_plate";

export async function checkinStep(id: string, step: Step): Promise<{ ok: boolean; message: string; record?: CheckinRecord }> {
  const who = await requireCheckIn();
  const admin = createAdminClient();
  const { data: r } = await admin.from("event_rsvps").select("*").eq("id", id).single();
  if (!r) return { ok: false, message: "RSVP not found." };
  if (r.status !== "confirmed") return { ok: false, message: "This RSVP was cancelled." };
  const now = new Date().toISOString();
  let patch: Partial<RsvpRow> = {};
  if (step === "check_in") {
    if (r.checked_in_at) return { ok: false, message: "Already checked in.", record: toRecord(r) };
    patch = { checked_in_at: now, checked_in_by: who };
  } else if (step === "verify_badge") {
    if (!r.is_budtender) return { ok: false, message: "Not registered as a budtender." };
    if (r.badge_verified_at) return { ok: false, message: "Badge already verified.", record: toRecord(r) };
    patch = { badge_verified_at: now, badge_verified_by: who, ...(r.checked_in_at ? {} : { checked_in_at: now, checked_in_by: who }) };
  } else {
    if (r.plate_status !== "confirmed") return { ok: false, message: r.plate_status === "waitlisted" ? "Waitlisted: no plate reserved." : "No plate on this RSVP." };
    if (!r.badge_verified_at) return { ok: false, message: "Verify the IDFPR badge first." };
    if (r.plate_redeemed_at) return { ok: false, message: "Plate already redeemed.", record: toRecord(r) };
    patch = { plate_redeemed_at: now, plate_redeemed_by: who };
  }
  // Guard against a double tap on two phones: only update if the field is still empty.
  const field = step === "check_in" ? "checked_in_at" : step === "verify_badge" ? "badge_verified_at" : "plate_redeemed_at";
  const { data: updated } = await admin.from("event_rsvps").update(patch).eq("id", id).is(field, null).select("*").maybeSingle();
  if (!updated) return { ok: false, message: "Someone else just did that." };
  return { ok: true, message: "Done.", record: toRecord(updated) };
}

export async function checkinStats(slug: string) {
  await requireCheckIn();
  const admin = createAdminClient();
  const { data: ev } = await admin.from("events").select("id").eq("slug", slug).single();
  if (!ev) return null;
  const c = async (f: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => (await f(base())).count ?? 0;
  const base = () => admin.from("event_rsvps").select("id", { count: "exact", head: true }).eq("event_id", ev.id).eq("status", "confirmed");
  const [rsvps, checkedIn, plates, redeemed] = await Promise.all([
    c((q) => q),
    c((q) => q.not("checked_in_at", "is", null)),
    c((q) => q.eq("plate_status", "confirmed")),
    c((q) => q.not("plate_redeemed_at", "is", null)),
  ]);
  return { rsvps, checkedIn, plates, redeemed };
}

// ----------------------------------------------------------------- CSV export

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formulas (=, +, -, @) from guest-typed fields.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function adminExportRsvpsCsv(slug: string): Promise<{ ok: true; csv: string; count: number } | { ok: false; message: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: ev } = await admin.from("events").select("id").eq("slug", slug).single();
  if (!ev) return { ok: false, message: "Event not found." };
  const { data } = await admin.from("event_rsvps").select("*").eq("event_id", ev.id).order("created_at");
  const cols: (keyof RsvpRow)[] = [
    "created_at", "status", "first_name", "last_name", "email", "phone", "is_budtender", "dispensary_name", "dispensary_city",
    "plate_status", "plate_waitlist_position", "marketing_opt_in", "source", "checked_in_at", "badge_verified_at",
    "plate_redeemed_at", "psm_synced_at", "psm_sync_error",
  ];
  const lines = [cols.join(","), ...(data ?? []).map((r) => cols.map((c) => csvCell(r[c])).join(","))];
  return { ok: true, csv: lines.join("\n"), count: data?.length ?? 0 };
}

import "server-only";
import type { EmailMessage } from "@/lib/email";
import type { EventRow, RsvpRow } from "./types";
import { eventDate, eventTimeRange, siteUrl, ticketUrl } from "./format";

/**
 * Event emails (D-094): the RSVP confirmation and every scheduled reminder.
 * Reminder bodies are admin-edited templates with {merge_fields}; text values
 * are HTML-escaped, the *_block fields are trusted HTML built here.
 * All event mail goes from events.email_from with reply-to events.email_reply_to (D-023).
 */

const INK = "#111318";
const MUTED = "#6b7280";
const RULE = "#e7e7e7";
const GOLD = "#f5c518";

export function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Shown in the reminder editor. */
export const MERGE_FIELDS = [
  ["{first_name}", "Guest first name"],
  ["{event_name}", "The Kickback"],
  ["{event_tagline}", "Bud, Bombing & BBQ"],
  ["{event_date}", "Sunday, October 25"],
  ["{event_time}", "1–6 PM"],
  ["{address}", "Venue address"],
  ["{map_link}", "Google Maps link"],
  ["{ticket_link}", "Guest's ticket page (QR)"],
  ["{cancel_link}", "Cancel-RSVP link"],
  ["{dispensary_name}", "Budtender's dispensary"],
  ["{plate_block}", "Plate status box (budtenders only; empty for others)"],
  ["{weather_note}", "Weather note from event settings (empty if unset)"],
  ["{rewards_block}", "Rewards sign-up nudge (opted-in guests only)"],
] as const;

export function plateBlockHtml(rsvp: Pick<RsvpRow, "is_budtender" | "plate_status" | "plate_waitlist_position">): string {
  if (!rsvp.is_budtender) return "";
  if (rsvp.plate_status === "confirmed") {
    return `<div style="margin:20px 0;padding:16px 18px;border:2px solid ${INK};background:${GOLD}">
<p style="margin:0 0 6px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">Your free BBQ plate is reserved</p>
<p style="margin:0">Bring your <strong>valid IDFPR dispensary agent badge</strong> and a government photo ID. Your plate is released at check-in after we verify your badge.</p>
</div>`;
  }
  if (rsvp.plate_status === "waitlisted") {
    const pos = rsvp.plate_waitlist_position ? ` #${rsvp.plate_waitlist_position}` : "";
    return `<div style="margin:20px 0;padding:16px 18px;border:1px solid ${RULE};background:#fafafa">
<p style="margin:0 0 6px;font-weight:700;text-transform:uppercase;letter-spacing:.04em">You're${pos} on the free-plate waitlist</p>
<p style="margin:0">All comped plates are claimed right now. If one opens up we'll email you. Your RSVP is confirmed either way. Bring your valid IDFPR dispensary agent badge just in case.</p>
</div>`;
  }
  return "";
}

function rewardsBlockHtml(rsvp: Pick<RsvpRow, "marketing_opt_in">): string {
  if (!rsvp.marketing_opt_in) return "";
  return `<p style="margin:20px 0">Want perks for shopping Private Stock brands? <a href="${siteUrl()}/signup" style="color:${INK}">Join Private Stock Rewards, free</a>.</p>`;
}

export function mergeVars(ev: EventRow, rsvp: RsvpRow): Record<string, { value: string; html?: boolean }> {
  const ticket = ticketUrl(ev.slug, rsvp.ticket_token);
  return {
    first_name: { value: rsvp.first_name },
    event_name: { value: ev.name },
    event_tagline: { value: ev.tagline ?? "" },
    event_date: { value: eventDate(ev) },
    event_time: { value: eventTimeRange(ev) },
    address: { value: ev.address },
    map_link: { value: ev.map_url ?? "" },
    ticket_link: { value: ticket },
    cancel_link: { value: `${ticket}?cancel=1` },
    dispensary_name: { value: rsvp.dispensary_name ?? "" },
    plate_block: { value: plateBlockHtml(rsvp), html: true },
    weather_note: {
      value: ev.weather_note ? `<p>${esc(ev.weather_note)}</p>` : "",
      html: true,
    },
    rewards_block: { value: rewardsBlockHtml(rsvp), html: true },
  };
}

export function renderTemplate(template: string, vars: Record<string, { value: string; html?: boolean }>): string {
  return template.replace(/\{([a-z_]+)\}/g, (whole, key: string) => {
    const v = vars[key];
    if (!v) return whole; // unknown field stays visible so the preview shows the typo
    return v.html ? v.value : esc(v.value);
  });
}

/** Subjects are plain text: merge without escaping. */
export function renderSubject(template: string, vars: Record<string, { value: string; html?: boolean }>): string {
  return template.replace(/\{([a-z_]+)\}/g, (whole, key: string) => {
    const v = vars[key];
    return v && !v.html ? v.value : whole;
  });
}

export function layout(ev: EventRow, inner: string, footerNote: string): string {
  const title = ev.tagline ? `${esc(ev.name)}: ${esc(ev.tagline)}` : esc(ev.name);
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f5">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;color:${INK};font-size:15px;line-height:1.55">
<div style="background:${INK};color:#fff;padding:18px 22px">
<p style="margin:0;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:${GOLD}">Private Stock × Renegades of Funk</p>
<p style="margin:6px 0 0;font-size:22px;font-weight:700;text-transform:uppercase">${title}</p>
</div>
<div style="background:#fff;padding:22px;border:1px solid ${RULE};border-top:0">${inner}</div>
<p style="margin:16px 4px 0;font-size:12px;color:${MUTED}">${footerNote}<br>Private Stock Cannabis Co. · Chicago, IL · <a href="${siteUrl()}" style="color:${MUTED}">privatestock.co</a><br>21+ only. No cannabis is sold at this event.</p>
</div></body></html>`;
}

function detailsTable(ev: EventRow): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:${MUTED};vertical-align:top;white-space:nowrap">${k}</td><td style="padding:4px 0">${v}</td></tr>`;
  return `<table style="border-collapse:collapse;margin:14px 0">${row("When", `${esc(eventDate(ev))}, ${esc(eventTimeRange(ev))}`)}${row(
    "Where",
    `${esc(ev.address)}${ev.venue_name ? ` (${esc(ev.venue_name)})` : ""}${ev.map_url ? ` · <a href="${esc(ev.map_url)}" style="color:${INK}">map</a>` : ""}`,
  )}${row("Entry", "Free with RSVP · Free parking lot · 21+ with valid ID")}</table>`;
}

export function confirmationEmail(ev: EventRow, rsvp: RsvpRow): EmailMessage {
  const ticket = ticketUrl(ev.slug, rsvp.ticket_token);
  const qr = `${siteUrl()}/api/rsvp/qr/${rsvp.ticket_token}`;
  const ics = `${siteUrl()}/api/rsvp/ics/${ev.slug}`;
  const inner = `<p style="margin:0 0 10px">You're on the list, ${esc(rsvp.first_name)}.</p>
${detailsTable(ev)}
${plateBlockHtml(rsvp)}
<p style="margin:18px 0 6px;font-weight:700">Your ticket</p>
<p style="margin:0 0 8px">Show this QR code at the gate.</p>
<p style="margin:0"><a href="${ticket}"><img src="${qr}" width="200" height="200" alt="Ticket QR code" style="display:block;border:1px solid ${RULE}"></a></p>
<p style="margin:12px 0 0"><a href="${ticket}" style="color:${INK}">Open your ticket</a> · <a href="${ics}" style="color:${INK}">Add to calendar</a></p>
<p style="margin:18px 0 0;color:${MUTED};font-size:13px">Can't make it? <a href="${ticket}?cancel=1" style="color:${MUTED}">Cancel your RSVP</a>${rsvp.is_budtender ? " so another budtender can get a plate" : ""}.</p>`;
  return {
    to: rsvp.email,
    from: ev.email_from,
    replyTo: ev.email_reply_to,
    subject: `You're in: ${ev.name}, ${eventDate(ev)}`,
    html: layout(ev, inner, "You're getting this because you RSVP'd."),
    idempotencyKey: `rsvp-confirm-${rsvp.id}-${rsvp.plate_status}`,
  };
}

export function plateReleasedEmail(ev: EventRow, rsvp: RsvpRow): EmailMessage {
  const inner = `<p style="margin:0 0 10px">Good news, ${esc(rsvp.first_name)}: a free BBQ plate opened up and it's yours.</p>
${plateBlockHtml({ ...rsvp, plate_status: "confirmed" })}
${detailsTable(ev)}
<p style="margin:12px 0 0"><a href="${ticketUrl(ev.slug, rsvp.ticket_token)}" style="color:${INK}">Open your ticket</a></p>`;
  return {
    to: rsvp.email,
    from: ev.email_from,
    replyTo: ev.email_reply_to,
    subject: `A free plate opened up for you: ${ev.name}`,
    html: layout(ev, inner, "You're getting this because you RSVP'd."),
    idempotencyKey: `plate-released-${rsvp.id}`,
  };
}

export function reminderEmail(
  ev: EventRow,
  rsvp: RsvpRow,
  tpl: { subject: string; body_html: string; is_marketing: boolean },
): EmailMessage {
  const vars = mergeVars(ev, rsvp);
  const footer = tpl.is_marketing
    ? `You're getting this because you opted in to Private Stock emails. <a href="${ticketUrl(ev.slug, rsvp.ticket_token)}?unsubscribe=1" style="color:${MUTED}">Unsubscribe</a>.`
    : `You're getting this because you RSVP'd. <a href="${ticketUrl(ev.slug, rsvp.ticket_token)}?cancel=1" style="color:${MUTED}">Cancel your RSVP</a>.`;
  return {
    to: rsvp.email,
    from: ev.email_from,
    replyTo: ev.email_reply_to,
    subject: renderSubject(tpl.subject, vars),
    html: layout(ev, renderTemplate(tpl.body_html, vars), footer),
  };
}

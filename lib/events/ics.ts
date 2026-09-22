import type { EventRow } from "./types";
import { eventUrl } from "./format";

function stamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** RFC 5545 calendar file for "Add to calendar". UTC times, so no VTIMEZONE block is needed. */
export function eventIcs(ev: EventRow): string {
  const title = ev.tagline ? `${ev.name}: ${ev.tagline}` : ev.name;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Private Stock Cannabis Co.//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.id}@privatestock.co`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(ev.starts_at)}`,
    `DTEND:${stamp(ev.ends_at)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc([ev.venue_name, ev.address].filter(Boolean).join(", "))}`,
    `DESCRIPTION:${esc(`21+ with a valid ID. Your ticket: ${eventUrl(ev.slug)}`)}`,
    `URL:${eventUrl(ev.slug)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

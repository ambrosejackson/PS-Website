import type { EventRow } from "./types";

/** "Sunday, October 25" in the event's own timezone. */
export function eventDate(ev: Pick<EventRow, "starts_at" | "timezone">): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: ev.timezone,
  }).format(new Date(ev.starts_at));
}

function hour(d: Date, tz: string, withPeriod: boolean): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value ?? "";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  const period = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
  return `${h}${m === "00" ? "" : `:${m}`}${withPeriod ? ` ${period}` : ""}`;
}

/** "1–6 PM" (or "11 AM–6 PM" across the meridiem). */
export function eventTimeRange(ev: Pick<EventRow, "starts_at" | "ends_at" | "timezone">): string {
  const s = new Date(ev.starts_at);
  const e = new Date(ev.ends_at);
  const period = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: true, timeZone: ev.timezone })
      .formatToParts(d)
      .find((p) => p.type === "dayPeriod")?.value;
  const same = period(s) === period(e);
  return `${hour(s, ev.timezone, !same)}–${hour(e, ev.timezone, true)}`;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://privatestock.co").replace(/\/$/, "");
}

export function ticketUrl(slug: string, token: string): string {
  return `${siteUrl()}/events/${slug}/ticket/${token}`;
}

export function eventUrl(slug: string): string {
  return `${siteUrl()}/events/${slug}`;
}

/** Digits only, US numbers normalised to +1XXXXXXXXXX. Returns null for blank, "invalid" for junk. */
export function normalizePhone(raw: string): string | null | "invalid" {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return "invalid";
}

export function prettyPhone(p: string | null): string {
  if (!p) return "";
  const m = p.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p;
}

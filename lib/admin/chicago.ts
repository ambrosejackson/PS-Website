/**
 * America/Chicago day arithmetic for the admin dashboard and nav badges.
 * Day buckets, "today" and the greeting all follow Chicago, not the server
 * (Vercel runs UTC). Pure functions — no DB, no React.
 */

export const CHICAGO_TZ = "America/Chicago";

const DAY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: CHICAGO_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const HOUR_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: CHICAGO_TZ,
  hour: "numeric",
  hour12: false,
});

/** Chicago calendar date of an instant as YYYY-MM-DD (en-CA formats ISO order). */
export function chicagoDayKey(at: Date = new Date()): string {
  return DAY_FMT.format(at);
}

/** Chicago hour of day, 0–23. */
export function chicagoHour(at: Date = new Date()): number {
  return Number(HOUR_FMT.format(at)) % 24;
}

/** Add `days` (may be negative) to a YYYY-MM-DD key. */
export function shiftDayKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10);
}

/** `n` consecutive day keys ending at `endKey`, oldest first. */
export function dayKeys(endKey: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => shiftDayKey(endKey, i - (n - 1)));
}

/**
 * The UTC instant at which a Chicago calendar day starts. Chicago is UTC-6
 * (CST) or UTC-5 (CDT): 06:00Z is local midnight under CST and 01:00 under
 * CDT, so step back an hour when the probe lands at 01:00.
 */
export function chicagoDayStart(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 6));
  return chicagoHour(probe) === 1 ? new Date(probe.getTime() - 3_600_000) : probe;
}

export function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** "Nov 2" style label for a day key. */
export function shortDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}

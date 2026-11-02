/**
 * Minimal CSV writer for admin exports (D-141). RFC 4180 quoting, CRLF line
 * ends, no BOM. The two older per-feature `csvCell` helpers (subscribers,
 * RSVPs) predate this file and are left as they are.
 */

export type CsvValue = string | number | boolean | null | undefined;

export function csvCell(v: CsvValue): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  // Neutralise spreadsheet formula injection as well as quoting.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toCsv(header: string[], rows: CsvValue[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

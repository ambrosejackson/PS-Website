import { csvToRecords } from "./csv";

/**
 * iHeartJane master sheet (link-accessible; no Google auth). Each tab is
 * fetched by NAME through the gviz CSV endpoint with `headers=1` so exactly one
 * header row is used (the plain /export?format=csv endpoint needs gids, which
 * the sheet doesn't expose without the API).
 */

export const DEFAULT_SHEET_ID = "1vYYvhaWUPfqAe1NmKihdxNeBs-AizutQG0Bbnoyffao";

export function sheetId(): string {
  return process.env.IHEARTJANE_SHEET_ID?.trim() || DEFAULT_SHEET_ID;
}

/** Product tabs in the PCT workbook (Intructions / Product Card are docs). */
export const PRODUCT_TABS = [
  "Flower",
  "Pre-Roll",
  "Vape",
  "Edible",
  "Extract",
  "Tincture",
  "Topical",
  "Gear",
  "Merch.",
] as const;
export type SheetTab = (typeof PRODUCT_TABS)[number];

export interface TabData {
  tab: SheetTab;
  headers: string[];
  records: Record<string, string>[];
}

export async function fetchTab(tab: SheetTab, id = sheetId()): Promise<TabData> {
  const url = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(tab)}`;
  const res = await fetch(url, { cache: "no-store", redirect: "follow" });
  if (!res.ok) throw new Error(`Sheet tab "${tab}" → HTTP ${res.status}`);
  const text = await res.text();
  if (text.trimStart().startsWith("<")) {
    throw new Error(`Sheet tab "${tab}" returned HTML — is the sheet still link-accessible?`);
  }
  const { headers, records } = csvToRecords(text);
  return { tab, headers, records };
}

export async function fetchAllTabs(id = sheetId()): Promise<TabData[]> {
  return Promise.all(PRODUCT_TABS.map((t) => fetchTab(t, id)));
}

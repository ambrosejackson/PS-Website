import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { chicagoDayKey, chicagoDayStart, shiftDayKey, shortDayLabel } from "@/lib/admin/chicago";
import {
  ANALYTICS_BRANDS,
  brandFromPath,
  EVENT,
  isAnalyticsBrand,
  isOwnHost,
  referrerHost,
  type AnalyticsBrand,
} from "@/lib/analytics/schema";
import type { Json } from "@/lib/database.types";

/**
 * /admin/analytics data layer (D-141). Service role, dynamic rendering, same
 * pattern as lib/admin/dashboard.ts. Chicago days throughout.
 *
 * Source rule:
 *  - window entirely within the last 90 days → raw web_events, every panel.
 *  - window reaching further back → web_events_daily (rollups). Only the daily
 *    series, totals, top pages, funnel and engagement totals exist there, and
 *    session counts are sums across (brand, path) rows, so a session that hit
 *    several pages is counted once per page. Those outputs carry
 *    `approximate: true`; referrers, UTM, devices and new-vs-returning are null.
 *
 * Distinct counts: PostgREST has no count(distinct) without an RPC and this
 * phase adds no migrations, so raw rows are streamed one 1,000-row page at a
 * time and only compact accumulators (per-day and per-step id sets) are held.
 */

export const RANGE_KEYS = ["7d", "30d", "90d", "custom"] as const;
export type RangeKey = (typeof RANGE_KEYS)[number];
export type BrandFilter = "all" | AnalyticsBrand | "landing";
export const BRAND_FILTERS: BrandFilter[] = ["all", ...ANALYTICS_BRANDS, "landing"];

/** Raw rows are purged after this many days; older windows come from rollups. */
export const RAW_RETENTION_DAYS = 90;
/** visitor_id exists from the P2 deploy; earlier windows cannot split new vs returning. */
export const VISITOR_ID_SINCE = "2026-11-02";
const MAX_CUSTOM_DAYS = 366;
const PAGE = 1000;
const MAX_PAGES = 400;
const TOP_N = 20;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface AnalyticsParams {
  range: RangeKey;
  from: string;
  to: string;
  brand: BrandFilter;
}

/**
 * URL params → validated window. `from`+`to` (YYYY-MM-DD, from <= to <= today,
 * at most 366 days) select a custom range; otherwise `range` picks a preset
 * ending today, defaulting to 30d. Unknown brands fall back to "all".
 */
export function parseAnalyticsParams(
  sp: { range?: string; from?: string; to?: string; brand?: string },
  today = chicagoDayKey(),
): AnalyticsParams {
  const brand: BrandFilter = sp.brand && (BRAND_FILTERS as string[]).includes(sp.brand) ? (sp.brand as BrandFilter) : "all";
  const from = sp.from ?? "";
  const to = sp.to ?? "";
  if (DAY_KEY_RE.test(from) && DAY_KEY_RE.test(to) && from <= to && to <= today && from >= shiftDayKey(to, -(MAX_CUSTOM_DAYS - 1))) {
    return { range: "custom", from, to, brand };
  }
  const range: RangeKey = sp.range === "7d" || sp.range === "90d" ? sp.range : "30d";
  const n = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  return { range, from: shiftDayKey(today, -(n - 1)), to: today, brand };
}

/** Query-string form of the params, for links that must keep the current view. */
export function analyticsSearch(p: AnalyticsParams, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams(extra);
  if (p.range === "custom") {
    q.set("from", p.from);
    q.set("to", p.to);
  } else {
    q.set("range", p.range);
  }
  if (p.brand !== "all") q.set("brand", p.brand);
  return q.toString();
}

export interface DailyPoint {
  day: string;
  label: string;
  pageviews: number;
  sessions: number;
  visitors: number;
}

export interface FunnelStep {
  key: "product_view" | "add_to_cart" | "checkout_start" | "purchase";
  label: string;
  sessions: number;
  /** Share of the previous step's sessions lost at this step; null for step 1 or when the previous step is 0. */
  dropOffPct: number | null;
}

export interface AnalyticsData {
  params: AnalyticsParams;
  source: "raw" | "rollup";
  /** True when counts come from rollups (sessions summed across pages). */
  approximate: boolean;
  days: number;
  daily: DailyPoint[];
  totals: {
    pageviews: number;
    sessions: number;
    visitors: number;
    newVisitors: number | null;
    returningVisitors: number | null;
  };
  conversion: { purchaseSessions: number; pageviewSessions: number; rate: number | null };
  topPages: { path: string; pageviews: number; sessions: number }[];
  topReferrers: { host: string; pageviews: number; sessions: number }[] | null;
  utmCampaigns: { source: string; medium: string; campaign: string; pageviews: number; sessions: number }[] | null;
  devices: { mobile: number; tablet: number; desktop: number; unknown: number } | null;
  funnel: FunnelStep[];
  engagement: {
    kingSelects: number;
    /** Per-king breakdown; null from rollups (element is not rolled up). */
    kings: { king: string; count: number }[] | null;
    comicPreviewOpen: number;
    comicPreviewComplete: number;
  };
}

type Db = ReturnType<typeof createAdminClient>;

async function streamPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  onRows: (rows: T[]) => void,
): Promise<void> {
  for (let i = 0; i < MAX_PAGES; i++) {
    const { data, error } = await page(i * PAGE, (i + 1) * PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    onRows(rows);
    if (rows.length < PAGE) break;
  }
}

function dayList(from: string, to: string): string[] {
  const out: string[] = [];
  for (let k = from; k <= to; k = shiftDayKey(k, 1)) out.push(k);
  return out;
}

function matchesBrand(filter: BrandFilter, brand: string | null, path: string | null): boolean {
  if (filter === "all") return true;
  if (filter === "landing") return brand === null && (path ?? "") === "/";
  return brand === filter;
}

function top<T>(m: Map<string, T>, score: (v: T) => number, n = TOP_N): [string, T][] {
  return [...m.entries()].sort((a, b) => score(b[1]) - score(a[1])).slice(0, n);
}

function finishFunnel(sessions: Record<FunnelStep["key"], number>): FunnelStep[] {
  const order: { key: FunnelStep["key"]; label: string }[] = [
    { key: "product_view", label: "Product view" },
    { key: "add_to_cart", label: "Add to cart" },
    { key: "checkout_start", label: "Checkout start" },
    { key: "purchase", label: "Purchase" },
  ];
  return order.map((s, i) => {
    const prev = i === 0 ? null : sessions[order[i - 1].key];
    const cur = sessions[s.key];
    return {
      key: s.key,
      label: s.label,
      sessions: cur,
      dropOffPct: prev === null || prev === 0 ? null : Math.max(0, Math.round(((prev - cur) / prev) * 1000) / 10),
    };
  });
}

function utmField(utm: Json | null, key: string): string {
  if (!utm || typeof utm !== "object" || Array.isArray(utm)) return "";
  const v = (utm as Record<string, unknown>)[key];
  return typeof v === "string" ? v.slice(0, 80) : "";
}

function kingOf(element: string | null): string | null {
  if (!element) return null;
  try {
    const v = JSON.parse(element) as { king?: unknown };
    return typeof v.king === "string" ? v.king : null;
  } catch {
    return null;
  }
}

interface RawRow {
  ts: string;
  session_id: string | null;
  visitor_id: string | null;
  path: string | null;
  event_type: string | null;
  element: string | null;
  referrer: string | null;
  utm: Json | null;
  device: string | null;
  brand: string | null;
}

interface SetAgg {
  pageviews: number;
  sessions: Set<string>;
}

async function fromRaw(db: Db, p: AnalyticsParams): Promise<AnalyticsData> {
  const days = dayList(p.from, p.to);
  const start = chicagoDayStart(p.from).toISOString();
  const end = chicagoDayStart(shiftDayKey(p.to, 1)).toISOString();

  const perDay = new Map<string, { pageviews: number; sessions: Set<string>; visitors: Set<string> }>();
  for (const d of days) perDay.set(d, { pageviews: 0, sessions: new Set(), visitors: new Set() });
  const allSessions = new Set<string>();
  const allVisitors = new Set<string>();
  const pageviewSessions = new Set<string>();
  const pages = new Map<string, SetAgg>();
  const referrers = new Map<string, SetAgg>();
  const utm = new Map<string, SetAgg & { source: string; medium: string; campaign: string }>();
  const devices: Record<"mobile" | "tablet" | "desktop" | "unknown", Set<string>> = {
    mobile: new Set(),
    tablet: new Set(),
    desktop: new Set(),
    unknown: new Set(),
  };
  const funnel: Record<FunnelStep["key"], Set<string>> = {
    product_view: new Set(),
    add_to_cart: new Set(),
    checkout_start: new Set(),
    purchase: new Set(),
  };
  const kings = new Map<string, number>();
  let kingSelects = 0;
  let comicOpen = 0;
  let comicComplete = 0;
  let pageviews = 0;

  await streamPages<RawRow>(
    (a, b) =>
      db
        .from("web_events")
        .select("ts, session_id, visitor_id, path, event_type, element, referrer, utm, device, brand")
        .gte("ts", start)
        .lt("ts", end)
        .order("id", { ascending: true })
        .range(a, b),
    (rows) => {
      for (const r of rows) {
        const brand = r.brand ?? brandFromPath(r.path);
        if (!matchesBrand(p.brand, brand, r.path)) continue;
        const day = chicagoDayKey(new Date(r.ts));
        const bucket = perDay.get(day);
        if (!bucket) continue;
        const sid = r.session_id;
        const type = r.event_type;

        if (sid) {
          bucket.sessions.add(sid);
          allSessions.add(sid);
        }
        if (r.visitor_id) {
          bucket.visitors.add(r.visitor_id);
          allVisitors.add(r.visitor_id);
        }

        if (type === EVENT.pageview) {
          pageviews++;
          bucket.pageviews++;
          if (sid) pageviewSessions.add(sid);
          const path = r.path ?? "";
          const pg = pages.get(path) ?? { pageviews: 0, sessions: new Set<string>() };
          pg.pageviews++;
          if (sid) pg.sessions.add(sid);
          pages.set(path, pg);

          const host = r.referrer ? referrerHost(r.referrer) : null;
          if (host && !isOwnHost(host)) {
            const rf = referrers.get(host) ?? { pageviews: 0, sessions: new Set<string>() };
            rf.pageviews++;
            if (sid) rf.sessions.add(sid);
            referrers.set(host, rf);
          }

          const source = utmField(r.utm, "utm_source");
          const medium = utmField(r.utm, "utm_medium");
          const campaign = utmField(r.utm, "utm_campaign");
          if (source || medium || campaign) {
            const key = `${source}\u0001${medium}\u0001${campaign}`;
            const u = utm.get(key) ?? { source, medium, campaign, pageviews: 0, sessions: new Set<string>() };
            u.pageviews++;
            if (sid) u.sessions.add(sid);
            utm.set(key, u);
          }

          if (sid) {
            const dev = r.device === "mobile" || r.device === "tablet" || r.device === "desktop" ? r.device : "unknown";
            devices[dev].add(sid);
          }
        } else if (type === EVENT.productView || type === EVENT.addToCart || type === EVENT.checkoutStart || type === EVENT.purchase) {
          // server:<order id> sessions reach only the purchase step.
          if (sid) funnel[type].add(sid);
        } else if (type === "king_select") {
          kingSelects++;
          const king = kingOf(r.element);
          if (king) kings.set(king, (kings.get(king) ?? 0) + 1);
        } else if (type === "comic_preview_open") {
          comicOpen++;
        } else if (type === "comic_preview_complete") {
          comicComplete++;
        }
      }
    },
  );

  // New vs returning: a visitor is returning if any event with that visitor_id
  // precedes the window. Only meaningful once visitor ids exist (P2 deploy).
  let newVisitors: number | null = null;
  let returningVisitors: number | null = null;
  if (p.from >= VISITOR_ID_SINCE && allVisitors.size > 0) {
    const prior = new Set<string>();
    const priorStart = chicagoDayStart(shiftDayKey(p.from, -RAW_RETENTION_DAYS)).toISOString();
    await streamPages<{ visitor_id: string | null }>(
      (a, b) =>
        db
          .from("web_events")
          .select("visitor_id")
          .gte("ts", priorStart)
          .lt("ts", start)
          .not("visitor_id", "is", null)
          .order("id", { ascending: true })
          .range(a, b),
      (rows) => {
        for (const r of rows) if (r.visitor_id) prior.add(r.visitor_id);
      },
    );
    returningVisitors = [...allVisitors].filter((v) => prior.has(v)).length;
    newVisitors = allVisitors.size - returningVisitors;
  }

  const funnelCounts = {
    product_view: funnel.product_view.size,
    add_to_cart: funnel.add_to_cart.size,
    checkout_start: funnel.checkout_start.size,
    purchase: funnel.purchase.size,
  };

  return {
    params: p,
    source: "raw",
    approximate: false,
    days: days.length,
    daily: days.map((day) => {
      const b = perDay.get(day)!;
      return { day, label: shortDayLabel(day), pageviews: b.pageviews, sessions: b.sessions.size, visitors: b.visitors.size };
    }),
    totals: { pageviews, sessions: allSessions.size, visitors: allVisitors.size, newVisitors, returningVisitors },
    conversion: {
      purchaseSessions: funnelCounts.purchase,
      pageviewSessions: pageviewSessions.size,
      rate: pageviewSessions.size > 0 ? funnelCounts.purchase / pageviewSessions.size : null,
    },
    topPages: top(pages, (v) => v.pageviews).map(([path, v]) => ({ path, pageviews: v.pageviews, sessions: v.sessions.size })),
    topReferrers: top(referrers, (v) => v.pageviews).map(([host, v]) => ({ host, pageviews: v.pageviews, sessions: v.sessions.size })),
    utmCampaigns: top(utm, (v) => v.pageviews).map(([, v]) => ({
      source: v.source,
      medium: v.medium,
      campaign: v.campaign,
      pageviews: v.pageviews,
      sessions: v.sessions.size,
    })),
    devices: {
      mobile: devices.mobile.size,
      tablet: devices.tablet.size,
      desktop: devices.desktop.size,
      unknown: devices.unknown.size,
    },
    funnel: finishFunnel(funnelCounts),
    engagement: {
      kingSelects,
      kings: [...kings.entries()].map(([king, count]) => ({ king, count })).sort((a, b) => b.count - a.count),
      comicPreviewOpen: comicOpen,
      comicPreviewComplete: comicComplete,
    },
  };
}

interface DailyRow {
  day: string;
  brand: string;
  path: string;
  event_type: string;
  events: number;
  sessions: number;
  visitors: number;
}

async function fromRollups(db: Db, p: AnalyticsParams): Promise<AnalyticsData> {
  const days = dayList(p.from, p.to);
  const perDay = new Map<string, { pageviews: number; sessions: number; visitors: number }>();
  for (const d of days) perDay.set(d, { pageviews: 0, sessions: 0, visitors: 0 });
  const pages = new Map<string, { pageviews: number; sessions: number }>();
  const funnel: Record<FunnelStep["key"], number> = { product_view: 0, add_to_cart: 0, checkout_start: 0, purchase: 0 };
  let pageviews = 0;
  let sessions = 0;
  let visitors = 0;
  let kingSelects = 0;
  let comicOpen = 0;
  let comicComplete = 0;

  await streamPages<DailyRow>(
    (a, b) =>
      db
        .from("web_events_daily")
        .select("day, brand, path, event_type, events, sessions, visitors")
        .gte("day", p.from)
        .lte("day", p.to)
        .order("day", { ascending: true })
        .order("path", { ascending: true })
        .order("event_type", { ascending: true })
        .range(a, b),
    (rows) => {
      for (const r of rows) {
        if (!matchesBrand(p.brand, r.brand === "" ? null : r.brand, r.path)) continue;
        const bucket = perDay.get(r.day);
        if (!bucket) continue;
        if (r.event_type === EVENT.pageview) {
          pageviews += r.events;
          sessions += r.sessions;
          visitors += r.visitors;
          bucket.pageviews += r.events;
          bucket.sessions += r.sessions;
          bucket.visitors += r.visitors;
          const pg = pages.get(r.path) ?? { pageviews: 0, sessions: 0 };
          pg.pageviews += r.events;
          pg.sessions += r.sessions;
          pages.set(r.path, pg);
        } else if (r.event_type in funnel) {
          funnel[r.event_type as FunnelStep["key"]] += r.sessions;
        } else if (r.event_type === "king_select") kingSelects += r.events;
        else if (r.event_type === "comic_preview_open") comicOpen += r.events;
        else if (r.event_type === "comic_preview_complete") comicComplete += r.events;
      }
    },
  );

  return {
    params: p,
    source: "rollup",
    approximate: true,
    days: days.length,
    daily: days.map((day) => ({ day, label: shortDayLabel(day), ...perDay.get(day)! })),
    totals: { pageviews, sessions, visitors, newVisitors: null, returningVisitors: null },
    conversion: { purchaseSessions: funnel.purchase, pageviewSessions: sessions, rate: sessions > 0 ? funnel.purchase / sessions : null },
    topPages: top(pages, (v) => v.pageviews).map(([path, v]) => ({ path, ...v })),
    topReferrers: null,
    utmCampaigns: null,
    devices: null,
    funnel: finishFunnel(funnel),
    engagement: { kingSelects, kings: null, comicPreviewOpen: comicOpen, comicPreviewComplete: comicComplete },
  };
}

export async function getAnalytics(p: AnalyticsParams, today = chicagoDayKey()): Promise<AnalyticsData> {
  const db = createAdminClient();
  const rawFloor = shiftDayKey(today, -(RAW_RETENTION_DAYS - 1));
  return p.from >= rawFloor ? fromRaw(db, p) : fromRollups(db, p);
}

/**
 * Dashboard card: purchase sessions ÷ sessions with at least one pageview,
 * last 30 Chicago days, raw web_events. Streams only those two event types.
 */
export async function conversionLast30(db: Db, today = chicagoDayKey()) {
  const start = chicagoDayStart(shiftDayKey(today, -29)).toISOString();
  const pageviewSessions = new Set<string>();
  const purchaseSessions = new Set<string>();
  await streamPages<{ session_id: string | null; event_type: string | null }>(
    (a, b) =>
      db
        .from("web_events")
        .select("session_id, event_type")
        .in("event_type", [EVENT.pageview, EVENT.purchase])
        .gte("ts", start)
        .order("id", { ascending: true })
        .range(a, b),
    (rows) => {
      for (const r of rows) {
        if (!r.session_id) continue;
        if (r.event_type === EVENT.purchase) purchaseSessions.add(r.session_id);
        else pageviewSessions.add(r.session_id);
      }
    },
  );
  const sessions = pageviewSessions.size;
  return { purchases: purchaseSessions.size, sessions, rate: sessions > 0 ? purchaseSessions.size / sessions : null };
}

export const BRAND_FILTER_LABEL: Record<BrandFilter, string> = {
  all: "All traffic",
  terpkings: "TerpKings",
  outfitters: "Outfitters",
  higherself: "Higher Self",
  savagesquadstrains: "Savage Squad Strains",
  apparel: "Apparel",
  landing: "Landing page",
};

export function isBrandFilter(v: unknown): v is BrandFilter {
  return v === "all" || v === "landing" || isAnalyticsBrand(v);
}

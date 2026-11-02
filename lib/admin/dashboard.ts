import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  chicagoDayKey,
  chicagoDayStart,
  chicagoHour,
  dayKeys,
  greetingFor,
  shortDayLabel,
} from "@/lib/admin/chicago";
import { countOrdersToShip, countUnreadMessages, type Db } from "@/lib/admin/nav-counts";
import { isCategory } from "@/lib/merchCategories";
import { isOwnHost, referrerHost } from "@/lib/analytics/schema";
import { conversionLast30 } from "@/lib/admin/analytics";

/**
 * /admin dashboard queries (admin dashboard PRD, P1). Service-role reads,
 * dynamic rendering, no caching — the same pattern as /admin/orders.
 * All day buckets are America/Chicago calendar days.
 *
 * Definitions (PRD §3, amended 2026-11-02):
 * - paid order: status = 'paid' AND fulfillment_status <> 'canceled'
 * - bucket instant: paid_at, falling back to created_at
 * - orders to ship: paid, fulfillment_status IN ('new','packed'),
 *   ships_after IS NULL OR ships_after <= today
 * - pre-orders pending: paid, fulfillment_status = 'new', ships_after > today
 */

export interface DashboardData {
  greeting: string;
  kpis: {
    today: { cents: number; orders: number };
    d7: { cents: number; orders: number };
    d30: { cents: number; orders: number };
    /** null when there were no paid orders in 30 days. */
    avgOrderCents: number | null;
    visitors7: number;
    pageviews7: number;
    subscribers7: number;
    /** null when no event starts today or later (card is omitted). */
    rsvps: number | null;
    preordersPending: number;
    /** Purchase sessions ÷ pageview sessions, last 30 Chicago days (D-141); rate null at zero sessions. */
    conversion30: { purchases: number; sessions: number; rate: number | null };
  };
  sales: {
    days: { key: string; label: string }[];
    series: { all: number[]; apparel: number[]; other: number[] };
  };
  todo: {
    ordersToShip: number;
    preordersReady: number;
    withProvider: number;
    unreadMessages: number;
    productsNoImage: number;
    lowStock: number;
  };
  recentOrders: RecentOrder[];
  topProducts: { title: string; qty: number }[];
  topReferrers: { host: string; count: number }[];
}

export interface RecentOrder {
  id: string;
  created_at: string;
  customer_name: string | null;
  email: string | null;
  total_cents: number | null;
  status: string;
  fulfillment_status: string;
}

interface PaidOrderRow {
  id: string;
  created_at: string;
  paid_at: string | null;
  total_cents: number | null;
  refunded_cents: number;
  ships_after: string | null;
}

/** Net revenue for one paid order: total less the cumulative Stripe refund (D-140). */
export function orderRevenueCents(o: { total_cents: number | null; refunded_cents: number | null }): number {
  return (o.total_cents ?? 0) - (o.refunded_cents ?? 0);
}

/** Chicago day key an order is bucketed on: paid_at, else created_at. */
function orderDayKey(o: { paid_at: string | null; created_at: string }): string {
  return chicagoDayKey(new Date(o.paid_at ?? o.created_at));
}

/**
 * PostgREST caps a response at 1,000 rows, so anything that can grow past that
 * (orders, pageviews) is read in pages. `maxPages` bounds the worst case.
 */
async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000,
  maxPages = 30,
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < maxPages; i++) {
    const { data, error } = await page(i * pageSize, (i + 1) * pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

async function headCount(q: PromiseLike<{ count: number | null }>): Promise<number> {
  return (await q).count ?? 0;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function paidOrdersSince(db: Db, since: Date): Promise<PaidOrderRow[]> {
  const iso = since.toISOString();
  return fetchAll<PaidOrderRow>((from, to) =>
    db
      .from("orders")
      .select("id, created_at, paid_at, total_cents, refunded_cents, ships_after")
      .eq("status", "paid")
      .neq("fulfillment_status", "canceled")
      // Superset of the window; exact bucketing happens in JS on paid_at ?? created_at.
      .or(`paid_at.gte.${iso},created_at.gte.${iso}`)
      .order("created_at", { ascending: true })
      .range(from, to),
  );
}

async function salesAndTopProducts(db: Db, orders: PaidOrderRow[], keyIndex: Map<string, number>, nDays: number) {
  const all = new Array<number>(nDays).fill(0);
  const apparel = new Array<number>(nDays).fill(0);
  const other = new Array<number>(nDays).fill(0);
  const dayOf = new Map<string, number>();
  for (const o of orders) {
    const idx = keyIndex.get(orderDayKey(o));
    if (idx === undefined) continue;
    dayOf.set(o.id, idx);
    all[idx] += orderRevenueCents(o);
  }

  // Line items for the in-window orders: Apparel = parent merch_products.category
  // is one of the apparel categories (lib/merchCategories.ts); Other = anything
  // else (uncategorized merch such as the TerpKings print issue). Segment bars
  // are item subtotals (qty × unit price), so they exclude shipping, tax and
  // discounts and will not sum to "All".
  const qtyByTitle = new Map<string, number>();
  const ids = [...dayOf.keys()];
  for (const batch of chunk(ids, 200)) {
    const { data, error } = await db
      .from("order_items")
      .select("order_id, title, qty, unit_price_cents, merch_products(category)")
      .in("order_id", batch);
    if (error) throw new Error(error.message);
    for (const it of data ?? []) {
      const idx = dayOf.get(it.order_id);
      if (idx === undefined) continue;
      const line = it.qty * it.unit_price_cents;
      if (isCategory(it.merch_products?.category)) apparel[idx] += line;
      else other[idx] += line;
      const title = it.title ?? "Untitled";
      qtyByTitle.set(title, (qtyByTitle.get(title) ?? 0) + it.qty);
    }
  }
  const topProducts = [...qtyByTitle.entries()]
    .map(([title, qty]) => ({ title, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);

  return { series: { all, apparel, other }, topProducts };
}

async function trafficLast7(db: Db, since: Date) {
  const rows = await fetchAll<{ session_id: string | null; referrer: string | null }>((from, to) =>
    db
      .from("web_events")
      .select("session_id, referrer")
      .eq("event_type", "pageview")
      .gte("ts", since.toISOString())
      .order("id", { ascending: true })
      .range(from, to),
  );
  const sessions = new Set<string>();
  const hosts = new Map<string, number>();
  for (const r of rows) {
    if (r.session_id) sessions.add(r.session_id);
    const host = r.referrer ? referrerHost(r.referrer) : null;
    if (host && !isOwnHost(host)) hosts.set(host, (hosts.get(host) ?? 0) + 1);
  }
  const topReferrers = [...hosts.entries()]
    .map(([host, count]) => ({ host, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  return { visitors7: sessions.size, pageviews7: rows.length, topReferrers };
}

async function upcomingRsvps(db: Db, todayStart: Date): Promise<number | null> {
  const { data: events } = await db.from("events").select("id").gte("starts_at", todayStart.toISOString());
  const ids = (events ?? []).map((e) => e.id);
  if (ids.length === 0) return null;
  return headCount(
    db.from("event_rsvps").select("id", { count: "exact", head: true }).in("event_id", ids).eq("status", "confirmed"),
  );
}

/** Active variants with tracked stock at or below the parent product's low_stock_threshold. */
async function lowStockCount(db: Db): Promise<number> {
  const { data, error } = await db
    .from("merch_variants")
    .select("stock_qty, merch_products!inner(low_stock_threshold, is_active)")
    .eq("is_active", true)
    .eq("merch_products.is_active", true)
    .not("stock_qty", "is", null);
  if (error) throw new Error(error.message);
  return (data ?? []).filter((v) => v.stock_qty !== null && v.stock_qty <= v.merch_products.low_stock_threshold).length;
}

export async function getDashboardData(now: Date = new Date()): Promise<DashboardData> {
  const db = createAdminClient();
  const today = chicagoDayKey(now);
  const keys30 = dayKeys(today, 30);
  const keys7 = keys30.slice(-7);
  const keyIndex = new Map(keys30.map((k, i) => [k, i]));
  const start30 = chicagoDayStart(keys30[0]);
  const start7 = chicagoDayStart(keys7[0]);
  const todayStart = chicagoDayStart(today);

  const paidQ = () => db.from("orders").select("id", { count: "exact", head: true }).eq("status", "paid");

  const [
    orders,
    traffic,
    subscribers7,
    rsvps,
    preordersPending,
    ordersToShip,
    preordersReady,
    withProvider,
    unreadMessages,
    productsNoImage,
    lowStock,
    recent,
    conversion30,
  ] = await Promise.all([
    paidOrdersSince(db, start30),
    trafficLast7(db, start7),
    headCount(
      db.from("subscribers").select("id", { count: "exact", head: true }).gte("consented_at", start7.toISOString()),
    ),
    upcomingRsvps(db, todayStart),
    headCount(paidQ().eq("fulfillment_status", "new").gt("ships_after", today)),
    countOrdersToShip(db, today),
    headCount(paidQ().eq("fulfillment_status", "new").not("ships_after", "is", null).lte("ships_after", today)),
    headCount(paidQ().eq("fulfillment_status", "placed_with_provider")),
    countUnreadMessages(db),
    // Live products only: hidden rows do not need an image.
    headCount(
      db.from("catalog_products").select("id", { count: "exact", head: true }).eq("image_missing", true).eq("is_active", true),
    ),
    lowStockCount(db),
    db
      .from("orders")
      .select("id, created_at, customer_name, email, total_cents, status, fulfillment_status")
      .not("status", "in", "(pending,failed)")
      .order("created_at", { ascending: false })
      .limit(10),
    conversionLast30(db, today),
  ]);

  const { series, topProducts } = await salesAndTopProducts(db, orders, keyIndex, keys30.length);

  const sum = (from: number) => {
    let cents = 0;
    let n = 0;
    for (let i = from; i < keys30.length; i++) cents += series.all[i];
    for (const o of orders) {
      const idx = keyIndex.get(orderDayKey(o));
      if (idx !== undefined && idx >= from) n++;
    }
    return { cents, orders: n };
  };
  const d30 = sum(0);
  const d7 = sum(keys30.length - 7);
  const todayTotals = sum(keys30.length - 1);

  return {
    greeting: greetingFor(chicagoHour(now)),
    kpis: {
      today: todayTotals,
      d7,
      d30,
      avgOrderCents: d30.orders > 0 ? Math.round(d30.cents / d30.orders) : null,
      visitors7: traffic.visitors7,
      pageviews7: traffic.pageviews7,
      subscribers7,
      rsvps,
      preordersPending,
      conversion30,
    },
    sales: {
      days: keys30.map((key) => ({ key, label: shortDayLabel(key) })),
      series,
    },
    todo: { ordersToShip, preordersReady, withProvider, unreadMessages, productsNoImage, lowStock },
    recentOrders: (recent.data ?? []) as RecentOrder[],
    topProducts,
    topReferrers: traffic.topReferrers,
  };
}

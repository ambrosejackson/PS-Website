import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDashboardData } from "@/lib/admin/dashboard";
import { getAnalytics, parseAnalyticsParams } from "@/lib/admin/analytics";
import { countOrdersToShip } from "@/lib/admin/nav-counts";
import { chicagoDayKey, chicagoDayStart, shiftDayKey, CHICAGO_TZ } from "@/lib/admin/chicago";
import { notifyStaff, type SendResult } from "@/lib/email";

/**
 * Monday digest (D-142): the seven full Chicago days Mon–Sun ending yesterday
 * versus the seven before, from the dashboard and analytics data layers — no
 * queries of its own beyond one "orders to ship" count for the real today.
 * Sent through the existing Resend helper to the staff notification address.
 * A quiet week still sends: zeros are information.
 */

export interface DigestData {
  /** First day of the reported week (the Monday when the cron fires on schedule). */
  weekOf: string;
  from: string;
  to: string;
  revenue: { cents: number; prevCents: number; changePct: number | null };
  orders: { n: number; prev: number };
  avgOrderCents: number | null;
  visitors: number;
  sessions: number;
  conversion: { rate: number | null; purchases: number; sessions: number };
  topProducts: { title: string; qty: number }[];
  todo: { ordersToShip: number; withProvider: number; unreadMessages: number; productsNoImage: number; lowStock: number };
}

export function changePct(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}

export async function buildWeeklyDigest(now: Date = new Date()): Promise<DigestData> {
  const today = chicagoDayKey(now);
  const yesterday = shiftDayKey(today, -1);
  const from = shiftDayKey(yesterday, -6);
  // Dashboard windows end "today"; anchoring its now at the last instant of
  // yesterday makes d7 = the seven full days and prev7 = the seven before.
  const asOf = new Date(chicagoDayStart(today).getTime() - 1);
  const db = createAdminClient();
  const [dash, analytics, ordersToShip] = await Promise.all([
    getDashboardData(asOf),
    getAnalytics(parseAnalyticsParams({ range: "7d" }, yesterday), yesterday),
    countOrdersToShip(db, today),
  ]);
  return {
    weekOf: from,
    from,
    to: yesterday,
    revenue: { cents: dash.kpis.d7.cents, prevCents: dash.kpis.prev7.cents, changePct: changePct(dash.kpis.d7.cents, dash.kpis.prev7.cents) },
    orders: { n: dash.kpis.d7.orders, prev: dash.kpis.prev7.orders },
    avgOrderCents: dash.kpis.d7.orders > 0 ? Math.round(dash.kpis.d7.cents / dash.kpis.d7.orders) : null,
    visitors: analytics.totals.visitors,
    sessions: analytics.totals.sessions,
    conversion: { rate: analytics.conversion.rate, purchases: analytics.conversion.purchaseSessions, sessions: analytics.conversion.pageviewSessions },
    topProducts: dash.topProducts7.slice(0, 3),
    todo: {
      ordersToShip,
      withProvider: dash.todo.withProvider,
      unreadMessages: dash.todo.unreadMessages,
      productsNoImage: dash.todo.productsNoImage,
      lowStock: dash.todo.lowStock,
    },
  };
}

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://privatestock.co";
const BLACK = "#111318";
const MUTED = "#6b7280";
const RULE = "#e7e7e7";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function usd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function dayLabel(key: string, withYear = false): string {
  return chicagoDayStart(key).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}), timeZone: CHICAGO_TZ });
}

export function digestSubject(d: DigestData): string {
  return `privatestock.co · week of ${dayLabel(d.weekOf)}`;
}

function pctText(p: number | null): string {
  if (p === null) return "no prior-week baseline";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(0)}% vs prior week`;
}

export function digestHtml(d: DigestData): string {
  const site = SITE();
  const row = (label: string, value: string, note?: string) =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid ${RULE};color:${MUTED};font-size:13px;vertical-align:top">${esc(label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${RULE};text-align:right;font-size:15px;font-weight:600;color:${BLACK};vertical-align:top">${value}${note ? `<div style="font-size:12px;font-weight:400;color:${MUTED}">${note}</div>` : ""}</td>
    </tr>`;
  const link = (path: string, text: string) => `<a href="${site}${path}" style="color:${BLACK}">${esc(text)}</a>`;
  const todoRow = (n: number, label: string, path: string) =>
    `<li style="padding:4px 0;${n === 0 ? `color:${MUTED}` : ""}">${n.toLocaleString("en-US")} ${esc(label)} — ${link(path, "open")}</li>`;
  const conv = d.conversion.rate === null ? "—" : `${(d.conversion.rate * 100).toFixed(1)}%`;
  const top =
    d.topProducts.length === 0
      ? `<p style="margin:0;color:${MUTED};font-size:13px">No items sold this week.</p>`
      : `<ol style="margin:0;padding-left:18px;font-size:14px">${d.topProducts.map((p) => `<li style="padding:2px 0">${esc(p.title)} <span style="color:${MUTED}">· ${p.qty}</span></li>`).join("")}</ol>`;

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f6f6;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${BLACK}">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid ${RULE};padding:24px">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${MUTED}">privatestock.co · weekly digest</p>
  <h1 style="margin:0 0 16px;font-size:20px">Week of ${esc(dayLabel(d.weekOf, true))}</h1>
  <p style="margin:0 0 16px;font-size:13px;color:${MUTED}">${esc(dayLabel(d.from))} – ${esc(dayLabel(d.to))} (America/Chicago), compared with the seven days before.</p>
  <table style="width:100%;border-collapse:collapse">
    ${row("Revenue", usd(d.revenue.cents), `${esc(pctText(d.revenue.changePct))} · prior ${usd(d.revenue.prevCents)}`)}
    ${row("Paid orders", d.orders.n.toLocaleString("en-US"), `prior week ${d.orders.prev.toLocaleString("en-US")}`)}
    ${row("Average order", d.avgOrderCents === null ? "—" : usd(d.avgOrderCents))}
    ${row("Visitors", d.visitors.toLocaleString("en-US"), `${d.sessions.toLocaleString("en-US")} sessions`)}
    ${row("Conversion", conv, `${d.conversion.purchases.toLocaleString("en-US")} of ${d.conversion.sessions.toLocaleString("en-US")} sessions`)}
  </table>
  <h2 style="margin:20px 0 8px;font-size:14px">Top products</h2>
  ${top}
  <h2 style="margin:20px 0 8px;font-size:14px">To do</h2>
  <ul style="margin:0;padding-left:18px;font-size:14px">
    ${todoRow(d.todo.ordersToShip, "orders to ship", "/admin/orders?status=new")}
    ${todoRow(d.todo.withProvider, "with provider", "/admin/orders?status=placed_with_provider")}
    ${todoRow(d.todo.unreadMessages, "unread messages", "/admin/messages?status=new")}
    ${todoRow(d.todo.productsNoImage, "live products without an image", "/admin/products")}
    ${todoRow(d.todo.lowStock, "low-stock variants", "/admin/apparel")}
  </ul>
  <p style="margin:24px 0 0;font-size:12px;color:${MUTED}">${link("/admin", "Open the dashboard")} · ${link("/admin/analytics?range=7d", "Analytics, last 7 days")}</p>
</div>
</body></html>`;
}

/** Build and send; the Resend idempotency key is per reported week so a retry cannot double-send. */
export async function sendWeeklyDigest(now: Date = new Date()): Promise<{ digest: DigestData; subject: string; result: SendResult }> {
  const digest = await buildWeeklyDigest(now);
  const subject = digestSubject(digest);
  const result = await notifyStaff(subject, digestHtml(digest), { idempotencyKey: `digest-${digest.weekOf}` });
  return { digest, subject, result };
}

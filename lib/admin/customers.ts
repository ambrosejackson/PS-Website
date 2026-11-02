import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/admin/paged";

/**
 * Customers (D-142): one row per lowercased email across four tables — paid
 * orders, subscribers, event_rsvps and customer_profiles (whose login email is
 * read from auth.users through the service-role admin API; personal_email is
 * never used for identity). No table of its own: the index is built per
 * request with paged reads, which is fine at the current scale (hundreds of
 * rows per table). Read-only in P4.
 */

/** "Actually paid for" (same set as /admin/orders and /account), minus canceled fulfillment. */
export const PAID_ORDER_STATUSES = ["paid", "submitted_to_provider", "shipped", "delivered", "refunded"] as const;

export const CUSTOMERS_PAGE_SIZE = 50;

type Db = ReturnType<typeof createAdminClient>;

export interface CustomerOrder {
  id: string;
  created_at: string;
  paid_at: string | null;
  customer_name: string | null;
  total_cents: number | null;
  refunded_cents: number;
  status: string;
  fulfillment_status: string;
}

export interface CustomerRsvp {
  id: string;
  created_at: string;
  status: string;
  first_name: string;
  last_name: string;
  event: { name: string; slug: string; starts_at: string } | null;
}

export interface CustomerSubscriber {
  id: string;
  persona: string;
  brand_context: string | null;
  source_path: string;
  consented_at: string;
  synced_to_psm_at: string | null;
}

export interface CustomerProfile {
  id: string;
  first_name: string;
  last_name: string;
  zip: string | null;
  marketing_opt_in_at: string | null;
  created_at: string;
}

export interface CustomerRow {
  email: string;
  name: string | null;
  paidOrders: number;
  netRevenueCents: number;
  lastOrderAt: string | null;
  subscriber: { brand: string | null } | null;
  hasAccount: boolean;
  rsvps: number;
}

export interface CustomerDetail extends CustomerRow {
  orders: CustomerOrder[];
  rsvpRows: CustomerRsvp[];
  subscriberRow: CustomerSubscriber | null;
  profile: CustomerProfile | null;
}

interface Bucket {
  email: string;
  orders: CustomerOrder[];
  rsvps: CustomerRsvp[];
  subscriber: CustomerSubscriber | null;
  profile: CustomerProfile | null;
}

function norm(email: string | null | undefined): string | null {
  const e = (email ?? "").trim().toLowerCase();
  return e ? e : null;
}

function fullName(first: string | null | undefined, last: string | null | undefined): string | null {
  const n = [first, last].map((s) => (s ?? "").trim()).filter(Boolean).join(" ");
  return n || null;
}

/** Name precedence: profile → latest paid order's customer_name → RSVP name. */
function nameFor(b: Bucket): string | null {
  if (b.profile) return fullName(b.profile.first_name, b.profile.last_name);
  for (const o of b.orders) if (o.customer_name?.trim()) return o.customer_name.trim();
  for (const r of b.rsvps) {
    const n = fullName(r.first_name, r.last_name);
    if (n) return n;
  }
  return null;
}

function toRow(b: Bucket): CustomerRow {
  let net = 0;
  for (const o of b.orders) net += (o.total_cents ?? 0) - (o.refunded_cents ?? 0);
  return {
    email: b.email,
    name: nameFor(b),
    paidOrders: b.orders.length,
    netRevenueCents: net,
    lastOrderAt: b.orders[0]?.paid_at ?? b.orders[0]?.created_at ?? null,
    subscriber: b.subscriber ? { brand: b.subscriber.brand_context } : null,
    hasAccount: b.profile !== null,
    rsvps: b.rsvps.filter((r) => r.status === "confirmed").length,
  };
}

/** auth user id → lowercased login email, for every user (paged, 1,000 per call). */
async function authEmailsById(db: Db): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`auth users: ${error.message}`);
    for (const u of data.users) {
      const e = norm(u.email);
      if (e) out.set(u.id, e);
    }
    if (data.users.length < 1000) break;
  }
  return out;
}

async function buildIndex(db: Db, onlyEmail?: string): Promise<Map<string, Bucket>> {
  const buckets = new Map<string, Bucket>();
  const bucket = (email: string): Bucket => {
    let b = buckets.get(email);
    if (!b) {
      b = { email, orders: [], rsvps: [], subscriber: null, profile: null };
      buckets.set(email, b);
    }
    return b;
  };

  const ordersQ = (from: number, to: number) => {
    let q = db
      .from("orders")
      .select("id, email, created_at, paid_at, customer_name, total_cents, refunded_cents, status, fulfillment_status")
      .in("status", [...PAID_ORDER_STATUSES])
      .neq("fulfillment_status", "canceled")
      .not("email", "is", null)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (onlyEmail) q = q.eq("email", onlyEmail);
    return q;
  };
  const subsQ = (from: number, to: number) => {
    let q = db
      .from("subscribers")
      .select("id, email, persona, brand_context, source_path, consented_at, synced_to_psm_at")
      .order("consented_at", { ascending: false })
      .range(from, to);
    if (onlyEmail) q = q.eq("email", onlyEmail);
    return q;
  };
  const rsvpQ = (from: number, to: number) => {
    let q = db
      .from("event_rsvps")
      .select("id, email, created_at, status, first_name, last_name, events(name, slug, starts_at)")
      .order("created_at", { ascending: false })
      .range(from, to);
    if (onlyEmail) q = q.eq("email", onlyEmail);
    return q;
  };

  const [orders, subs, rsvps, profiles, emailsById] = await Promise.all([
    fetchAll((a, b) => ordersQ(a, b)),
    fetchAll((a, b) => subsQ(a, b)),
    fetchAll((a, b) => rsvpQ(a, b)),
    fetchAll((a, b) =>
      db.from("customer_profiles").select("id, first_name, last_name, zip, marketing_opt_in_at, created_at").order("created_at", { ascending: false }).range(a, b),
    ),
    authEmailsById(db),
  ]);

  for (const o of orders) {
    const e = norm(o.email);
    if (!e) continue;
    bucket(e).orders.push({
      id: o.id,
      created_at: o.created_at,
      paid_at: o.paid_at,
      customer_name: o.customer_name,
      total_cents: o.total_cents,
      refunded_cents: o.refunded_cents ?? 0,
      status: o.status,
      fulfillment_status: o.fulfillment_status,
    });
  }
  for (const s of subs) {
    const e = norm(s.email);
    if (!e) continue;
    const b = bucket(e);
    // Newest consent wins if an address somehow has two rows.
    if (!b.subscriber) b.subscriber = { id: s.id, persona: s.persona, brand_context: s.brand_context, source_path: s.source_path, consented_at: s.consented_at, synced_to_psm_at: s.synced_to_psm_at };
  }
  for (const r of rsvps) {
    const e = norm(r.email);
    if (!e) continue;
    const ev = (Array.isArray(r.events) ? r.events[0] : r.events) as { name: string; slug: string; starts_at: string } | null | undefined;
    bucket(e).rsvps.push({ id: r.id, created_at: r.created_at, status: r.status, first_name: r.first_name, last_name: r.last_name, event: ev ?? null });
  }
  for (const p of profiles) {
    const e = emailsById.get(p.id);
    if (!e || (onlyEmail && e !== onlyEmail)) continue;
    const b = bucket(e);
    if (!b.profile) b.profile = { id: p.id, first_name: p.first_name, last_name: p.last_name, zip: p.zip, marketing_opt_in_at: p.marketing_opt_in_at, created_at: p.created_at };
  }
  return buckets;
}

export interface CustomerFilters {
  q?: string;
  page?: number;
}

export interface CustomerList {
  rows: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
}

function matches(row: CustomerRow, needle: string): boolean {
  if (!needle) return true;
  return row.email.includes(needle) || (row.name ?? "").toLowerCase().includes(needle);
}

/** Every customer matching the search, net revenue desc then email; used by the CSV export. */
export async function listAllCustomers(q?: string): Promise<CustomerRow[]> {
  const db = createAdminClient();
  const needle = (q ?? "").trim().toLowerCase();
  const rows = [...(await buildIndex(db)).values()].map(toRow).filter((r) => matches(r, needle));
  rows.sort((a, b) => b.netRevenueCents - a.netRevenueCents || a.email.localeCompare(b.email));
  return rows;
}

export async function listCustomers(f: CustomerFilters): Promise<CustomerList> {
  const page = Math.max(1, Math.floor(f.page ?? 1));
  const all = await listAllCustomers(f.q);
  return {
    rows: all.slice((page - 1) * CUSTOMERS_PAGE_SIZE, page * CUSTOMERS_PAGE_SIZE),
    total: all.length,
    page,
    pageSize: CUSTOMERS_PAGE_SIZE,
  };
}

export async function getCustomerDetail(emailRaw: string): Promise<CustomerDetail | null> {
  const email = norm(emailRaw);
  if (!email) return null;
  const db = createAdminClient();
  const b = (await buildIndex(db, email)).get(email);
  if (!b) return null;
  return { ...toRow(b), orders: b.orders, rsvpRows: b.rsvps, subscriberRow: b.subscriber, profile: b.profile };
}

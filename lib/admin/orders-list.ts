import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The /admin/orders list filter, shared by the page and its CSV export
 * (D-142) so both see the same rows: paid-ish statuses unless `all`, an
 * optional fulfillment status, and a search by email or id prefix.
 */

export const ORDER_LIST_STATUSES = ["paid", "submitted_to_provider", "shipped", "delivered", "refunded"] as const;

export interface OrdersFilters {
  q: string;
  status: string;
  all: boolean;
}

export function parseOrdersFilters(sp: { q?: string; status?: string; all?: string }): OrdersFilters {
  return { q: (sp.q ?? "").trim(), status: (sp.status ?? "").trim(), all: Boolean(sp.all) };
}

export function ordersSearch(f: OrdersFilters): string {
  const u = new URLSearchParams();
  if (f.q) u.set("q", f.q);
  if (f.status) u.set("status", f.status);
  if (f.all) u.set("all", "1");
  return u.toString();
}

type Db = ReturnType<typeof createAdminClient>;

/** The slice of the PostgREST filter builder the orders filter needs. */
interface Filterable {
  in(column: string, values: readonly string[]): this;
  eq(column: string, value: string): this;
  ilike(column: string, pattern: string): this;
}

/** Apply the list filters to an orders select; the caller picks columns and paging. */
export function applyOrdersFilters<Q extends Filterable>(query: Q, f: OrdersFilters): Q {
  let q = query;
  // Default view hides abandoned pending/failed checkouts; `all` shows them.
  if (!f.all) q = q.in("status", [...ORDER_LIST_STATUSES]);
  if (f.status) q = q.eq("fulfillment_status", f.status);
  const needle = f.q.toLowerCase();
  if (needle) {
    q = needle.length >= 8 && /^[0-9a-f-]+$/.test(needle) ? q.ilike("id", `${needle}%`) : q.ilike("email", `%${needle}%`);
  }
  return q;
}

export const ORDER_EXPORT_COLUMNS =
  "id, created_at, paid_at, email, customer_name, status, fulfillment_status, subtotal_cents, discount_cents, shipping_cents, tax_cents, total_cents, refunded_cents, promo_code, payment_provider, tracking";

export function ordersExportQuery(db: Db, f: OrdersFilters, from: number, to: number) {
  return applyOrdersFilters(
    db.from("orders").select(ORDER_EXPORT_COLUMNS).order("created_at", { ascending: false }).range(from, to),
    f,
  );
}

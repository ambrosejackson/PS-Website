import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/events/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { money } from "@/lib/commerce/config";
import { shortOrderId } from "@/components/site/OrderSummary";

/**
 * Live search behind the admin ⌘K palette (D-142). POST { q } with q ≥ 2
 * chars; re-checks the admin allowlist via requireAdmin() because API routes
 * do not inherit the (protected) layout. Five hits per group, label + href
 * only — nothing the linked admin page does not already show.
 */
export const dynamic = "force-dynamic";

const LIMIT = 5;

interface SearchItem {
  label: string;
  hint?: string;
  href: string;
}

interface SearchGroup {
  key: "products" | "apparel" | "orders" | "customers" | "discounts";
  label: string;
  items: SearchItem[];
}

type Db = ReturnType<typeof createAdminClient>;

const PAID_LIKE = "(pending,failed)";

async function products(db: Db, pattern: string): Promise<SearchItem[]> {
  const { data } = await db
    .from("catalog_products")
    .select("id, name, brand, is_active")
    .or(`name.ilike.${pattern},brand.ilike.${pattern}`)
    .order("name")
    .limit(LIMIT);
  return (data ?? []).map((p) => ({ label: p.name, hint: `${p.brand}${p.is_active ? "" : " · hidden"}`, href: `/admin/products/${p.id}` }));
}

async function apparel(db: Db, pattern: string): Promise<SearchItem[]> {
  const [byName, bySku] = await Promise.all([
    db.from("merch_products").select("id, name, is_active").ilike("name", pattern).order("name").limit(LIMIT),
    db.from("merch_variants").select("product_id, sku, merch_products(name, is_active)").ilike("sku", pattern).limit(LIMIT),
  ]);
  const seen = new Set<string>();
  const out: SearchItem[] = [];
  for (const p of byName.data ?? []) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({ label: p.name, hint: p.is_active ? undefined : "hidden", href: `/admin/apparel/${p.id}` });
  }
  for (const v of bySku.data ?? []) {
    if (seen.has(v.product_id)) continue;
    const mp = (Array.isArray(v.merch_products) ? v.merch_products[0] : v.merch_products) as { name: string; is_active: boolean } | null;
    seen.add(v.product_id);
    out.push({ label: mp?.name ?? v.sku, hint: `SKU ${v.sku}`, href: `/admin/apparel/${v.product_id}` });
  }
  return out.slice(0, LIMIT);
}

async function orders(db: Db, needle: string, pattern: string): Promise<SearchItem[]> {
  let q = db
    .from("orders")
    .select("id, email, customer_name, total_cents, fulfillment_status")
    .not("status", "in", PAID_LIKE)
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  q = /^[0-9a-f-]{4,}$/i.test(needle) ? q.ilike("id", `${needle.toLowerCase()}%`) : q.or(`email.ilike.${pattern},customer_name.ilike.${pattern}`);
  const { data } = await q;
  return (data ?? []).map((o) => ({
    label: `#${shortOrderId(o.id)} · ${o.customer_name ?? o.email ?? "—"}`,
    hint: `${money(o.total_cents ?? 0)} · ${o.fulfillment_status.replaceAll("_", " ")}`,
    href: `/admin/orders/${o.id}`,
  }));
}

async function customers(db: Db, pattern: string): Promise<SearchItem[]> {
  const { data } = await db
    .from("orders")
    .select("email")
    .not("status", "in", PAID_LIKE)
    .not("email", "is", null)
    .ilike("email", pattern)
    .order("created_at", { ascending: false })
    .limit(50);
  const seen = new Set<string>();
  const out: SearchItem[] = [];
  for (const r of data ?? []) {
    const e = r.email?.toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    out.push({ label: e, href: `/admin/customers/${encodeURIComponent(e)}` });
    if (out.length >= LIMIT) break;
  }
  return out;
}

async function discounts(db: Db, pattern: string): Promise<SearchItem[]> {
  const { data } = await db.from("discount_codes").select("code, pct, redeemed_at, expires_at").ilike("code", pattern).order("code").limit(LIMIT);
  return (data ?? []).map((d) => ({
    label: d.code,
    hint: `${d.pct}% · ${d.redeemed_at ? "redeemed" : d.expires_at && new Date(d.expires_at) <= new Date() ? "expired" : "open"}`,
    href: `/admin/discounts?q=${encodeURIComponent(d.code)}`,
  }));
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let q = "";
  try {
    const body = (await request.json()) as { q?: unknown };
    q = typeof body.q === "string" ? body.q : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  // Strip PostgREST filter syntax so the needle cannot break the or() expression.
  const needle = q.trim().replace(/[%_,()\\]/g, "").slice(0, 80);
  if (needle.length < 2) return NextResponse.json({ groups: [] });
  const pattern = `%${needle}%`;
  const db = createAdminClient();
  try {
    const [p, a, o, c, d] = await Promise.all([products(db, pattern), apparel(db, pattern), orders(db, needle, pattern), customers(db, pattern), discounts(db, pattern)]);
    const groups: SearchGroup[] = [
      { key: "orders", label: "Orders", items: o },
      { key: "customers", label: "Customers", items: c },
      { key: "products", label: "Products", items: p },
      { key: "apparel", label: "Apparel", items: a },
      { key: "discounts", label: "Discounts", items: d },
    ].filter((g) => g.items.length > 0) as SearchGroup[];
    return NextResponse.json({ groups }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Search failed." }, { status: 500 });
  }
}

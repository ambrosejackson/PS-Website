import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/events/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAll } from "@/lib/admin/paged";
import { ordersExportQuery, parseOrdersFilters } from "@/lib/admin/orders-list";
import { toCsv } from "@/lib/csv";

/**
 * CSV of /admin/orders with the current filter applied (D-142). Same
 * ?q/?status/?all params as the page, every matching row (paged reads, not the
 * page's 200 cap). Re-checks the admin allowlist via requireAdmin().
 */
export const dynamic = "force-dynamic";

interface ExportRow {
  id: string;
  created_at: string;
  paid_at: string | null;
  email: string | null;
  customer_name: string | null;
  status: string;
  fulfillment_status: string;
  subtotal_cents: number | null;
  discount_cents: number | null;
  shipping_cents: number | null;
  tax_cents: number;
  total_cents: number | null;
  refunded_cents: number;
  promo_code: string | null;
  payment_provider: string;
  tracking: unknown;
}

const dollars = (cents: number | null | undefined) => (cents == null ? "" : (cents / 100).toFixed(2));

function trackingSummary(t: unknown): string {
  if (!t || typeof t !== "object") return "";
  const { carrier, number } = t as { carrier?: string; number?: string };
  return [carrier, number].filter(Boolean).join(" ");
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sp = new URL(request.url).searchParams;
  const filters = parseOrdersFilters({ q: sp.get("q") ?? undefined, status: sp.get("status") ?? undefined, all: sp.get("all") ?? undefined });
  const db = createAdminClient();
  const rows = await fetchAll<ExportRow>((a, b) => ordersExportQuery(db, filters, a, b));
  const csv = toCsv(
    ["date", "id", "email", "customer_name", "status", "fulfillment_status", "subtotal", "discount", "shipping", "tax", "total", "refunded", "promo_code", "payment_provider", "tracking"],
    rows.map((o) => [
      o.paid_at ?? o.created_at,
      o.id,
      o.email,
      o.customer_name,
      o.status,
      o.fulfillment_status,
      dollars(o.subtotal_cents),
      dollars(o.discount_cents ?? 0),
      dollars(o.shipping_cents),
      dollars(o.tax_cents),
      dollars(o.total_cents),
      dollars(o.refunded_cents),
      o.promo_code,
      o.payment_provider,
      trackingSummary(o.tracking),
    ]),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

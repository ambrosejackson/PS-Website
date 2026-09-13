import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { stockBadge } from "@/lib/merchStock";
import { Button } from "@/components/ui/button";
import { ApparelTable, type ApparelListRow, type CollectionFilterOption } from "./ApparelTable";
import { ApparelTabs } from "./ApparelTabs";

export const dynamic = "force-dynamic";

/** /admin/apparel — merch_products + merch_variants CRUD (D-039/D-040, D-071..D-080). */
export default async function AdminApparelPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  let rows: ApparelListRow[] = [];
  let collections: CollectionFilterOption[] = [];
  let loadError: string | null = null;
  try {
    const db = createAdminClient();
    const [p, c] = await Promise.all([
      db
        .from("merch_products")
        .select("*, merch_collections(name), merch_variants(id, size, color, price_cents, stock_qty, is_active)")
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true }),
      db.from("merch_collections").select("id, name, slug").order("sort_order", { ascending: true }),
    ]);
    if (p.error) loadError = p.error.message;
    else
      rows = (p.data ?? []).map((row) => {
        const { merch_variants: variants, merch_collections: collection, ...product } = row;
        const active = (variants ?? []).filter((v) => v.is_active);
        const prices = active.map((v) => v.price_cents);
        return {
          ...product,
          collectionName: collection?.name ?? null,
          variantCount: (variants ?? []).length,
          activeVariantCount: active.length,
          fromCents: prices.length ? Math.min(...prices) : null,
          badge: stockBadge(variants ?? [], product.low_stock_threshold),
        };
      });
    collections = (c.data ?? []).filter((x) => x.slug !== "all").map((x) => ({ id: x.id, name: x.name }));
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load apparel.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Apparel</h1>
          <p className="mt-2 max-w-prose text-sm text-neutral-600">
            Merch & apparel sold through Stripe / PayPal. Each product carries who fulfills it
            (self / Printify / Tapstitch — you place provider orders by hand, D-040), its collection and
            category, and its size/color variants with prices and optional tracked stock.
          </p>
        </div>
        <Button render={<Link href="/admin/apparel/new">New apparel product</Link>} />
      </div>
      <ApparelTabs />
      {saved && (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Saved <code>{saved}</code>. /apparel, /apparel/shop and the landing grid revalidated.
        </p>
      )}
      {loadError ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>
      ) : (
        <ApparelTable rows={rows} collections={collections} />
      )}
    </div>
  );
}

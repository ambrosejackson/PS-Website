import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "./ProductsTable";
import type { ProductRow } from "./actions";

export const dynamic = "force-dynamic";

/**
 * /admin/products — the source of truth for the catalog (D-130). Filters by
 * brand / category / visibility / image, bulk hide-show-apply-image,
 * drag-to-reorder within a brand, inline hide/restore, duplicate.
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  let rows: ProductRow[] = [];
  // Distinct stores per (brand, strain_key) from the published menu data (D-118),
  // so a product that matches nothing stands out here before it does on the site.
  const storeCounts: Record<string, number> = {};
  let loadError: string | null = null;
  try {
    const db = createAdminClient();
    const [{ data, error }, { data: avail }] = await Promise.all([
      db
        .from("catalog_products")
        .select("*")
        .order("brand", { ascending: true })
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true }),
      db.from("product_availability").select("brand, strain_key, store_id"),
    ]);
    if (error) loadError = error.message;
    else rows = data ?? [];
    const seen = new Set<string>();
    for (const a of avail ?? []) {
      if (!a.strain_key) continue;
      const k = `${a.brand}|${a.strain_key}`;
      const pair = `${k}|${a.store_id}`;
      if (seen.has(pair)) continue;
      seen.add(pair);
      storeCounts[k] = (storeCounts[k] ?? 0) + 1;
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load products.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Products</h1>
          <p className="mt-2 max-w-prose text-sm text-neutral-600">
            This list is the catalog. Every field and image is edited here; hiding a product
            takes it off the site without deleting it. No prices here — ever (guardrail #2).
          </p>
        </div>
        <Button render={<Link href="/admin/products/new">New product</Link>} />
      </div>

      {saved && (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Saved <code>{saved}</code>. Public pages revalidated.
        </p>
      )}

      {loadError ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>
      ) : (
        <ProductsTable rows={rows} storeCounts={storeCounts} />
      )}
    </div>
  );
}

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { SyncButton } from "./SyncButton";
import { ProductsTable } from "./ProductsTable";
import type { ProductRow } from "./actions";

export const dynamic = "force-dynamic";

/**
 * /admin/products — hybrid catalog (D-038): sheet-synced + manual rows.
 * List with brand / source / visibility filters, "Hidden — awaiting review"
 * preset, drag-to-reorder within a brand, inline SHOW/HIDE, sync badges.
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  let rows: ProductRow[] = [];
  let loadError: string | null = null;
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("catalog_products")
      .select("*")
      .order("brand", { ascending: true })
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });
    if (error) loadError = error.message;
    else rows = data ?? [];
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load products.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Products</h1>
          <p className="mt-2 max-w-prose text-sm text-neutral-600">
            Hybrid catalog: synced from the iHeartJane sheet plus manual products. The
            sheet owns name/brand/category/format/weight/image on synced rows; you own
            visibility, description, terpenes, terp category and order (D-038). No prices
            here — ever (guardrail #2).
          </p>
        </div>
        <Button render={<Link href="/admin/products/new">New manual product</Link>} />
      </div>

      {saved && (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Saved <code>{saved}</code>. Public pages revalidated.
        </p>
      )}

      <SyncButton />

      {loadError ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>
      ) : (
        <ProductsTable rows={rows} />
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductEditor } from "../ProductEditor";
import type { ProductRow } from "../actions";

export const dynamic = "force-dynamic";

/** /admin/products/[id] — "new" creates a manual product; otherwise edits. */
export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let product: ProductRow | null = null;
  if (id !== "new") {
    const db = createAdminClient();
    const { data } = await db.from("catalog_products").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    product = data;
  }
  const synced = product?.source === "sheet";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="text-xs text-neutral-500 hover:underline">
          ← Products
        </Link>
        <h1 className="mt-1 font-condensed text-2xl font-bold uppercase tracking-tight">
          {product ? product.name : "New manual product"}
        </h1>
        {synced ? (
          <p className="mt-2 max-w-prose rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            Synced from the iHeartJane sheet (<code>{product!.sheet_row_ref}</code>). Name, brand,
            category, format, weight, strain type and image are <strong>managed by the sheet — edit
            there and re-sync</strong>. Description, terpene profile, terp category, THC range, order
            and the Hide toggle are yours.
          </p>
        ) : (
          <p className="mt-2 max-w-prose text-sm text-neutral-600">
            Manual product — every field is editable. No prices anywhere (guardrail #2).
          </p>
        )}
      </div>
      <ProductEditor product={product} />
    </div>
  );
}

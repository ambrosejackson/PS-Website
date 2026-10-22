import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductEditor } from "../ProductEditor";
import type { ProductRow } from "../actions";

export const dynamic = "force-dynamic";

/** /admin/products/[id] — "new" creates a product; otherwise edits every field (D-130). */
export default async function AdminProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ id }, { created }] = await Promise.all([params, searchParams]);
  let product: ProductRow | null = null;
  if (id !== "new") {
    const db = createAdminClient();
    const { data } = await db.from("catalog_products").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    product = data;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/products" className="text-xs text-neutral-500 hover:underline">
          ← Products
        </Link>
        <h1 className="mt-1 font-condensed text-2xl font-bold uppercase tracking-tight">
          {product ? product.name : "New product"}
        </h1>
        {created && product ? (
          <p className="mt-2 max-w-prose rounded border border-green-200 bg-green-50 p-3 text-sm text-green-900">
            Created <code>{product.slug}</code>. Add its image on the right, then show it when it is ready.
          </p>
        ) : (
          <p className="mt-2 max-w-prose text-sm text-neutral-600">
            Every field is editable. No prices anywhere (guardrail #2).
          </p>
        )}
      </div>
      <ProductEditor product={product} />
    </div>
  );
}

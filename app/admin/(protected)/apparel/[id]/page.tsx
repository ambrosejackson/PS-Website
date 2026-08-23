import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApparelEditor } from "../ApparelEditor";
import type { MerchRow, VariantRow } from "../actions";

export const dynamic = "force-dynamic";

/** /admin/apparel/[id] — "new" creates; otherwise edits product + variants. */
export default async function AdminApparelEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let product: MerchRow | null = null;
  let variants: VariantRow[] = [];
  if (id !== "new") {
    const db = createAdminClient();
    const { data } = await db.from("merch_products").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    product = data;
    const { data: vs } = await db
      .from("merch_variants")
      .select("*")
      .eq("product_id", id)
      .order("size", { ascending: true })
      .order("color", { ascending: true });
    variants = vs ?? [];
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/apparel" className="text-xs text-neutral-500 hover:underline">
          ← Apparel
        </Link>
        <h1 className="mt-1 font-condensed text-2xl font-bold uppercase tracking-tight">
          {product ? product.name : "New apparel product"}
        </h1>
        <p className="mt-2 max-w-prose text-sm text-neutral-600">
          First image is the cover. Prices are entered in dollars and stored in cents. Stripe
          price IDs are attached when checkout ships.
        </p>
      </div>
      <ApparelEditor product={product} variants={variants} />
    </div>
  );
}

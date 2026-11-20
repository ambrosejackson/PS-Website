import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApparelEditor, type CollectionOption } from "../ApparelEditor";
import type { MerchRow, VariantRow } from "../actions";

export const dynamic = "force-dynamic";

/** /admin/apparel/[id] — "new" creates; otherwise edits product + variants. */
export default async function AdminApparelEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  const { saved } = await searchParams;
  const db = createAdminClient();
  let product: MerchRow | null = null;
  let variants: VariantRow[] = [];
  if (id !== "new") {
    const { data } = await db.from("merch_products").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    product = data;
    const { data: vs } = await db
      .from("merch_variants")
      .select("*")
      .eq("product_id", id)
      .order("color", { ascending: true })
      .order("size", { ascending: true });
    variants = vs ?? [];
  }
  const { data: cols } = await db.from("merch_collections").select("id, name, slug").order("sort_order", { ascending: true });
  const collections: CollectionOption[] = (cols ?? []).filter((c) => c.slug !== "all");

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
          First image is the main photo everywhere; tag images with a colour and, optionally, hover per docs/MERCH-MEDIA.md.
          Prices are entered in dollars and stored in cents. Stock blank = made to order (never badged); a number = tracked.
        </p>
      </div>
      {saved && product && (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Saved. /apparel, /apparel/shop and this product&apos;s page were refreshed.{" "}
          <a href={`/apparel/${product.slug}`} target="_blank" rel="noreferrer" className="font-semibold underline">
            View on site →
          </a>
        </p>
      )}
      {/* D-144: remount on every save so the form holds the saved rows (new variants get their ids). */}
      <ApparelEditor key={product?.updated_at ?? "new"} product={product} variants={variants} collections={collections} />
    </div>
  );
}

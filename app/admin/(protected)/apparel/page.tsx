import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { ApparelTable, type ApparelListRow } from "./ApparelTable";

export const dynamic = "force-dynamic";

/** /admin/apparel — merch_products + merch_variants CRUD (D-039/D-040). */
export default async function AdminApparelPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  let rows: ApparelListRow[] = [];
  let loadError: string | null = null;
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("merch_products")
      .select("*, merch_variants(id, price_cents, is_active)")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name", { ascending: true });
    if (error) loadError = error.message;
    else
      rows = (data ?? []).map((p) => {
        const { merch_variants: variants, ...product } = p;
        const active = (variants ?? []).filter((v) => v.is_active);
        const prices = active.map((v) => v.price_cents);
        return {
          ...product,
          variantCount: (variants ?? []).length,
          activeVariantCount: active.length,
          fromCents: prices.length ? Math.min(...prices) : null,
        };
      });
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
            (self / Printify / Tapstitch — you place provider orders by hand, D-040) and its
            size/color variants with prices.
          </p>
        </div>
        <Button render={<Link href="/admin/apparel/new">New apparel product</Link>} />
      </div>
      {saved && (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Saved <code>{saved}</code>. /apparel and the landing grid revalidated.
        </p>
      )}
      {loadError ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>
      ) : (
        <ApparelTable rows={rows} />
      )}
    </div>
  );
}

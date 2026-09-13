import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { ApparelTabs } from "../ApparelTabs";
import { CollectionsTable, type CollectionListRow } from "./CollectionsTable";

export const dynamic = "force-dynamic";

/** /admin/apparel/collections — merch_collections list (D-063/D-070). */
export default async function AdminCollectionsPage() {
  let rows: CollectionListRow[] = [];
  let loadError: string | null = null;
  try {
    const db = createAdminClient();
    const [c, p, b, h] = await Promise.all([
      db.from("merch_collections").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }),
      db.from("merch_products").select("collection_id"),
      db.from("merch_collection_banners").select("collection_id"),
      db.from("content_heroes").select("page, media_url").eq("is_default", true).eq("is_active", true).like("page", "/apparel/%"),
    ]);
    const err = c.error ?? p.error ?? b.error ?? h.error;
    if (err) loadError = err.message;
    const products = new Map<string, number>();
    for (const r of p.data ?? []) if (r.collection_id) products.set(r.collection_id, (products.get(r.collection_id) ?? 0) + 1);
    const banners = new Map<string, number>();
    for (const r of b.data ?? []) banners.set(r.collection_id, (banners.get(r.collection_id) ?? 0) + 1);
    const heroReal = new Set((h.data ?? []).filter((x) => !x.media_url.startsWith("/placeholders/")).map((x) => x.page));
    rows = (c.data ?? []).map((r) => ({
      ...r,
      productCount: products.get(r.id) ?? 0,
      bannerCount: banners.get(r.id) ?? 0,
      heroSet: heroReal.has(r.hero_page),
    }));
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load collections.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-condensed text-2xl font-bold uppercase tracking-tight">Apparel</h1>
          <p className="mt-2 max-w-prose text-sm text-neutral-600">
            Collections group products for <code>/apparel/collections/{"{slug}"}</code>, the home-page carousel and the
            featured block. The reserved <strong>All apparel</strong> row is the shop-all grid: it only carries the
            interstitial banners for <code>/apparel/shop</code>.
          </p>
        </div>
        <Button render={<Link href="/admin/apparel/collections/new">New collection</Link>} />
      </div>
      <ApparelTabs />
      {loadError ? (
        <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>
      ) : (
        <CollectionsTable rows={rows} />
      )}
    </div>
  );
}

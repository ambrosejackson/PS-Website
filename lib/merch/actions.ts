"use server";

import { createPublicClient } from "@/lib/supabase/public";
import { getCollectionBySlug, getProductsRange, PAGE_SIZE, SHOP_ALL_SLUG, type ShopProduct } from "@/lib/merch/queries";

/**
 * "Load more" for the grid pages (§6.7): fetch page N (1-based) with the same
 * filters the page rendered with. Public data only — no auth needed.
 */
export async function loadMoreProducts(input: {
  slug: string;
  tab?: string | null;
  brand?: string | null;
  page: number;
}): Promise<{ products: ShopProduct[]; hasMore: boolean }> {
  const page = Math.max(1, Math.min(50, Math.floor(Number(input.page) || 1)));
  const slug = typeof input.slug === "string" ? input.slug.slice(0, 120) : SHOP_ALL_SLUG;
  const collection = await getCollectionBySlug(slug);
  if (!collection) return { products: [], hasMore: false };
  const from = (page - 1) * PAGE_SIZE;
  const { products, total } = await getProductsRange(
    { slug, tab: input.tab ?? null, brand: input.brand ?? null },
    from,
    from + PAGE_SIZE - 1,
    collection.id,
  );
  return { products, hasMore: total > page * PAGE_SIZE };
}

/**
 * Cart drawer "Pair with" (§6.6): up to three active products from the
 * collection of the item just added, excluding products already in the cart.
 */
export async function pairWithProducts(input: { productId: string; excludeProductIds: string[] }): Promise<ShopProduct[]> {
  const supabase = createPublicClient();
  if (!supabase || typeof input.productId !== "string") return [];
  const { data: source } = await supabase.from("merch_products").select("collection_id").eq("id", input.productId).maybeSingle();
  if (!source?.collection_id) return [];
  const exclude = new Set([input.productId, ...(input.excludeProductIds ?? []).filter((x) => typeof x === "string")]);
  const { data } = await supabase
    .from("merch_products")
    .select("*, merch_variants(*)")
    .eq("is_active", true)
    .eq("collection_id", source.collection_id)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("released_at", { ascending: false })
    .limit(12);
  return ((data ?? []) as ShopProduct[]).filter((p) => !exclude.has(p.id) && p.merch_variants.some((v) => v.is_active)).slice(0, 3);
}

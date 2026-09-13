"use server";

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

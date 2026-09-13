import { createPublicClient } from "@/lib/supabase/public";
import { FALLBACK_HERO, getHeroesForPage, type HeroAsset, type MerchListing } from "@/lib/data";
import { brandBySlug } from "@/lib/brands";
import { categoriesForTab, isTab } from "@/lib/merchCategories";
import type { Database } from "@/lib/database.types";

/**
 * Server-side reads for the apparel shop (D-063..D-073). Public client (RLS:
 * active rows only), ISR pages + revalidatePath from admin actions.
 *
 * Category rule (Ambrose, 2026-09-13): products with NO category still appear
 * in Shop all, New Releases and their collection — they are only absent when a
 * `?tab=` filter is active (the tab expands to a category IN-list).
 */

type Tables = Database["public"]["Tables"];
export type ShopProduct = MerchListing;
export type ShopCollection = Tables["merch_collections"]["Row"];
export type ShopBanner = Tables["merch_collection_banners"]["Row"];
export type ShopTile = Tables["merch_tab_tiles"]["Row"];
export type ShopSettings = Tables["merch_settings"]["Row"];

export const PAGE_SIZE = 24;
export const FEATURED_LIMIT = 16;
export const SHOP_ALL_SLUG = "all";
/** `?brand=` value for house-branded products (merch_products.brand IS NULL). */
export const HOUSE_BRAND_SLUG = "private-stock";

const PRODUCT_SELECT = "*, merch_variants(*)";

function nowIso() {
  return new Date().toISOString();
}

/** Active collections inside their start/end window, carousel order. */
export async function getActiveCollections(): Promise<ShopCollection[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const now = nowIso();
  const { data } = await supabase
    .from("merch_collections")
    .select("*")
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return data ?? [];
}

export async function getCollectionBySlug(slug: string): Promise<ShopCollection | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const now = nowIso();
  const { data } = await supabase
    .from("merch_collections")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .maybeSingle();
  return data ?? null;
}

export interface ProductFilter {
  /** Collection slug; `all` = every active product. */
  slug: string;
  /** Sub-nav tab slug → expands to its categories. Unknown/empty = no filter. */
  tab?: string | null;
  /** Brand route slug (lib/brands) or `private-stock` for house merch. */
  brand?: string | null;
}

/** Resolve `?brand=` to a query predicate: a brand NAME, `null` for house, or undefined = no filter. */
export function brandFilter(brand?: string | null): string | null | undefined {
  if (!brand) return undefined;
  if (brand === HOUSE_BRAND_SLUG) return null;
  return brandBySlug(brand.toLowerCase())?.name ?? undefined;
}

/** One page of products, plus whether more exist. `from`/`to` are 0-based inclusive row offsets. */
export async function getProductsRange(
  filter: ProductFilter,
  from: number,
  to: number,
  collectionId?: string | null,
): Promise<{ products: ShopProduct[]; total: number }> {
  const supabase = createPublicClient();
  if (!supabase) return { products: [], total: 0 };
  let q = supabase
    .from("merch_products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("released_at", { ascending: false })
    .range(from, to);
  if (filter.slug !== SHOP_ALL_SLUG) {
    if (!collectionId) return { products: [], total: 0 };
    q = q.eq("collection_id", collectionId);
  }
  if (filter.tab && isTab(filter.tab)) {
    q = q.in("category", categoriesForTab(filter.tab));
  }
  const brand = brandFilter(filter.brand);
  if (brand === null) q = q.is("brand", null);
  else if (brand) q = q.eq("brand", brand);
  const { data, count, error } = await q;
  if (error || !data) return { products: [], total: 0 };
  return { products: data as ShopProduct[], total: count ?? data.length };
}

export interface CollectionPage {
  collection: ShopCollection;
  hero: HeroAsset[];
  products: ShopProduct[];
  banners: ShopBanner[];
  /** Pages rendered so far (initial render with ?page=N renders 1..N). */
  page: number;
  hasMore: boolean;
  total: number;
}

/** `/apparel/shop` (slug `all`) and `/apparel/collections/{slug}`. Returns null when the collection is unknown/inactive/out of window. */
export async function getCollectionPage(filter: ProductFilter & { page?: number }): Promise<CollectionPage | null> {
  const collection = await getCollectionBySlug(filter.slug);
  if (!collection) return null;
  const page = Math.max(1, Math.min(50, Math.floor(filter.page ?? 1)));
  const supabase = createPublicClient();
  const [heroes, { products, total }, bannersRes] = await Promise.all([
    getHeroesForPage(collection.hero_page),
    getProductsRange(filter, 0, page * PAGE_SIZE - 1, collection.id),
    supabase
      ? supabase
          .from("merch_collection_banners")
          .select("*")
          .eq("collection_id", collection.id)
          .eq("is_active", true)
          .order("insert_after", { ascending: true })
      : Promise.resolve({ data: [] as ShopBanner[] }),
  ]);
  return {
    collection,
    hero: heroes.length ? heroes : [FALLBACK_HERO],
    products,
    banners: (bannersRes.data ?? []) as ShopBanner[],
    page,
    hasMore: total > page * PAGE_SIZE,
    total,
  };
}

export interface ApparelHome {
  settings: ShopSettings | null;
  hero: HeroAsset[];
  newReleases: ShopProduct[];
  featured: { collection: ShopCollection; products: ShopProduct[] } | null;
  collections: ShopCollection[];
  tiles: ShopTile[];
}

/** Everything the `/apparel` showcase renders (§6.2). */
export async function getApparelHome(): Promise<ApparelHome> {
  const supabase = createPublicClient();
  const empty: ApparelHome = { settings: null, hero: [FALLBACK_HERO], newReleases: [], featured: null, collections: [], tiles: [] };
  if (!supabase) return empty;

  const [settingsRes, heroes, collections, tilesRes] = await Promise.all([
    supabase.from("merch_settings").select("*").eq("id", true).maybeSingle(),
    getHeroesForPage("/apparel"),
    getActiveCollections(),
    supabase.from("merch_tab_tiles").select("*").eq("is_active", true).order("sort_order", { ascending: true }),
  ]);
  const settings = settingsRes.data ?? null;
  const count = Math.min(24, Math.max(4, settings?.new_releases_count ?? 12));

  const featuredCollection =
    settings?.featured_collection_id ? collections.find((c) => c.id === settings.featured_collection_id && c.slug !== SHOP_ALL_SLUG) ?? null : null;

  const [newReleasesRes, featuredProducts] = await Promise.all([
    supabase
      .from("merch_products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .order("released_at", { ascending: false })
      .order("sort_order", { ascending: true, nullsFirst: false })
      .limit(count),
    featuredCollection
      ? getProductsRange({ slug: featuredCollection.slug }, 0, FEATURED_LIMIT - 1, featuredCollection.id).then((r) => r.products)
      : Promise.resolve([] as ShopProduct[]),
  ]);

  return {
    settings,
    hero: heroes.length ? heroes : [FALLBACK_HERO],
    newReleases: (newReleasesRes.data ?? []) as ShopProduct[],
    featured: featuredCollection ? { collection: featuredCollection, products: featuredProducts } : null,
    // Carousel: never the reserved row, and a card needs a cover.
    collections: collections.filter((c) => c.slug !== SHOP_ALL_SLUG && !!c.cover_image_url),
    tiles: tilesRes.data ?? [],
  };
}

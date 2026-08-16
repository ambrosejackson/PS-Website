import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/database.types";

type Tables = Database["public"]["Tables"];
export type HeroAsset = Tables["content_heroes"]["Row"];
export type BannerSlide = Tables["content_banners"]["Row"];
export type BlogPost = Tables["blog_posts"]["Row"];
export type CatalogProduct = Tables["catalog_products"]["Row"];
export type MerchProduct = Tables["merch_products"]["Row"];
export type StoreLocation = Tables["store_locations"]["Row"];
export type ProductAvailability = Tables["product_availability"]["Row"];

/** Fallback default hero when the DB is unreachable or a page has no rows yet. */
export const FALLBACK_HERO: HeroAsset = {
  id: "fallback",
  page: "/",
  nav_target: null,
  media_url: "/placeholders/hero-default.webp",
  media_type: "image",
  theme: "dark",
  is_default: true,
  sort_order: 0,
  is_active: true,
};

export async function getHeroesForPage(page: string): Promise<HeroAsset[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("content_heroes")
    .select("*")
    .eq("page", page)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function getBanners(): Promise<BannerSlide[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("content_banners")
    .select("*")
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data;
}

export async function getPublishedPosts(limit?: number): Promise<BlogPost[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  let query = supabase
    .from("blog_posts")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error || !data) return [];
  return data;
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data ?? null;
}

export async function getCatalogProducts(brand?: string): Promise<CatalogProduct[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  let query = supabase
    .from("catalog_products")
    .select("*")
    .eq("is_active", true)
    .order("brand", { ascending: true })
    .order("sort_order", { ascending: true });
  if (brand) query = query.eq("brand", brand);
  const { data, error } = await query;
  if (error || !data) return [];
  return data;
}

export async function getCatalogProductBySlug(
  slug: string,
): Promise<CatalogProduct | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("catalog_products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data ?? null;
}

export async function getMerchProducts(): Promise<MerchProduct[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("merch_products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return data;
}

/** Mock PSM data is gated behind MOCK_PSM_DATA until the publish pipeline lands. */
function mockPsmEnabled(): boolean {
  return process.env.MOCK_PSM_DATA === "true";
}

export async function getStoreLocations(): Promise<StoreLocation[]> {
  if (!mockPsmEnabled()) return [];
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("store_locations")
    .select("*")
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data;
}

export interface AvailabilityAtStore {
  availability: ProductAvailability;
  store: StoreLocation;
}

/** Presence + menu link + image + checked_at only — never prices (guardrail #2). */
export async function getAvailabilityForProduct(
  brand: string,
  productName: string,
): Promise<AvailabilityAtStore[]> {
  if (!mockPsmEnabled()) return [];
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("product_availability")
    .select("*, store_locations(*)")
    .eq("brand", brand)
    .eq("product_name", productName);
  if (error || !data) return [];
  return data
    .map((row) => {
      const { store_locations: store, ...availability } = row;
      return store
        ? { availability: availability as ProductAvailability, store }
        : null;
    })
    .filter((x): x is AvailabilityAtStore => x !== null);
}

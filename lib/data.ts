import { createPublicClient } from "@/lib/supabase/public";
import type { Database } from "@/lib/database.types";
import { isAllowlistedBrand } from "@/lib/brands";
import { showRealAvailability } from "@/lib/showRealAvailability";
import { strainKey } from "@/lib/strainKey";

type Tables = Database["public"]["Tables"];
export type HeroAsset = Tables["content_heroes"]["Row"];
export type BannerSlide = Tables["content_banners"]["Row"];
export type SocialImage = Tables["content_social_images"]["Row"];
export type BlogPost = Tables["blog_posts"]["Row"];
export type CatalogProduct = Tables["catalog_products"]["Row"];
export type MerchProduct = Tables["merch_products"]["Row"];
export type MerchVariant = Tables["merch_variants"]["Row"];
/** Storefront shape: product + its variants (active products only; variants filtered client-side by is_active). */
export type MerchListing = MerchProduct & { merch_variants: MerchVariant[] };
export type StoreLocation = Tables["store_locations"]["Row"];
export type ProductAvailability = Tables["product_availability"]["Row"];

/** Fallback default hero when the DB is unreachable or a page has no rows yet. */
export const FALLBACK_HERO: HeroAsset = {
  id: "fallback",
  page: "/",
  nav_target: null,
  media_url: "/placeholders/hero-default.webp",
  media_type: "image",
  poster_url: null,
  media_url_mobile: null,
  has_audio: false,
  audio_autoplay: false,
  audio_volume: 70,
  theme: "dark",
  video_loop: true,
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

/**
 * The hero VIDEO a page should play: its default video row, else its first
 * active video row, else null (the TerpKings CRT hero then renders gradient-only).
 */
export function pickHeroVideo(heroes: HeroAsset[]): HeroAsset | null {
  return (
    heroes.find((h) => h.is_default && h.media_type === "video") ??
    heroes.find((h) => h.media_type === "video") ??
    null
  );
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

/**
 * Active social tiles in admin order (D-064). brand null (default) = the
 * landing-page FOLLOW US strip; a lib/brands.ts slug = that brand page's feed
 * (0013). Empty → components fall back to their placeholders.
 */
export async function getSocialImages(brand: string | null = null): Promise<SocialImage[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  let query = supabase.from("content_social_images").select("*").eq("is_active", true);
  query = brand === null ? query.is("brand", null) : query.eq("brand", brand);
  const { data, error } = await query.order("sort_order", { ascending: true });
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

/* Public visibility: is_active and on the brand allowlist — nothing else (D-130, D-135). */

export async function getCatalogProducts(brand?: string): Promise<CatalogProduct[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  let query = supabase
    .from("catalog_products")
    .select("*")
    .eq("is_active", true)
    .order("brand", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (brand) query = query.eq("brand", brand);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.filter((p) => isAllowlistedBrand(p.brand));
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
  if (!data || !isAllowlistedBrand(data.brand)) return null;
  return data;
}

export async function getMerchProducts(): Promise<MerchProduct[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("merch_products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (error || !data) return [];
  return data;
}

/** Active merch with variants — the storefront source (landing grid, /apparel, detail). */
export async function getMerchListings(): Promise<MerchListing[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("merch_products")
    .select("*, merch_variants(*)")
    .eq("is_active", true)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data as MerchListing[];
}

/**
 * Active merch for ONE brand — the brand-page merch sections. `brandName` is the
 * lib/brands.ts display name, exactly as stored in merch_products.brand.
 */
export async function getBrandMerch(brandName: string): Promise<MerchListing[]> {
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("merch_products")
    .select("*, merch_variants(*)")
    .eq("is_active", true)
    .eq("brand", brandName)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data as MerchListing[];
}

export async function getMerchListingBySlug(slug: string): Promise<MerchListing | null> {
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("merch_products")
    .select("*, merch_variants(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as MerchListing | null) ?? null;
}

/** Lowest active-variant price in cents, or null when the product has no purchasable variant. */
export function merchFromCents(p: MerchListing): number | null {
  const prices = p.merch_variants.filter((v) => v.is_active).map((v) => v.price_cents);
  return prices.length ? Math.min(...prices) : null;
}

/**
 * Availability visibility is decided in ONE place (lib/showRealAvailability.ts):
 * production still running on MOCK_PSM_DATA hides it; everywhere else shows the
 * rows in store_locations / product_availability, whichever pipeline wrote them.
 * D-058: those rows arrive from PSM via POST /api/psm/publish.
 */
function availabilityVisible(): boolean {
  return showRealAvailability();
}

export async function getStoreLocations(): Promise<StoreLocation[]> {
  if (!availabilityVisible()) return [];
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("store_locations")
    .select("*")
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data;
}

export interface StoreWithProducts extends StoreLocation {
  /** Menu-verified products at this store — empty for every tier except `live`. */
  products: ProductAvailability[];
}

/**
 * The store locator's single query: every published store with the products the
 * last successful menu check found there. Presence + menu link + image only —
 * `product_availability` has no price column by design (guardrail #2).
 */
export async function getStoreLocationsWithProducts(): Promise<StoreWithProducts[]> {
  if (!availabilityVisible()) return [];
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("store_locations")
    .select("*, product_availability(*)")
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data.map((row) => {
    const { product_availability: products, ...store } = row as StoreLocation & {
      product_availability: ProductAvailability[] | null;
    };
    return {
      ...store,
      products: (products ?? []).sort((a, b) =>
        a.brand === b.brand
          ? a.product_name.localeCompare(b.product_name)
          : a.brand.localeCompare(b.brand),
      ),
    };
  });
}

export interface ProductVariantAtStore {
  /** Human label for the chip: "14g", "10pk · 3.5g", "Vape · 1g". */
  label: string;
  menu_product_url: string | null;
  checked_at: string;
  /** True when this menu entry's size/pack matches the product page's own. */
  matchesPage: boolean;
}

export interface ProductStoreAvailability {
  store: StoreLocation;
  variants: ProductVariantAtStore[];
  /** Latest checked_at across this store's matching entries. */
  checked_at: string;
  /** Deep link to the page's own variant on the store menu when known, else the store menu. */
  menuHref: string | null;
  /** Any variant at this store matches the page's size/pack. */
  hasPageVariant: boolean;
}

/**
 * Stores whose menu lists this product's STRAIN (any format or size), grouped
 * per store, joined on the generated `strain_key` columns (D-118). Presence +
 * menu link + checked_at only — never prices (guardrail #2).
 */
export async function getAvailabilityForProduct(
  product: Pick<CatalogProduct, "brand" | "name" | "strain_key" | "weight" | "format" | "category">,
): Promise<ProductStoreAvailability[]> {
  if (!availabilityVisible()) return [];
  const key = product.strain_key ?? strainKey(product.name);
  if (!key) return [];
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("product_availability")
    .select("*, store_locations(*)")
    .eq("brand", product.brand)
    .eq("strain_key", key);
  if (error || !data) return [];

  const page = pageSizeSignature(product);
  const byStore = new Map<string, ProductStoreAvailability>();
  for (const row of data) {
    const { store_locations: store, ...a } = row;
    if (!store) continue;
    const sig = variantSizeSignature(a.product_name, a.variant);
    const variant: ProductVariantAtStore = {
      label: variantLabel(a.product_name, a.variant, page.formatWord),
      menu_product_url: a.menu_product_url,
      checked_at: a.checked_at,
      matchesPage: sizeMatches(page, sig),
    };
    const entry = byStore.get(store.id);
    if (entry) {
      entry.variants.push(variant);
      if (a.checked_at > entry.checked_at) entry.checked_at = a.checked_at;
    } else {
      byStore.set(store.id, { store, variants: [variant], checked_at: a.checked_at, menuHref: null, hasPageVariant: false });
    }
  }

  const result = [...byStore.values()];
  for (const r of result) {
    // Page's own size first, then alphabetical; dedupe identical chips.
    r.variants.sort((x, y) => Number(y.matchesPage) - Number(x.matchesPage) || x.label.localeCompare(y.label));
    const seen = new Set<string>();
    r.variants = r.variants.filter((v) => (seen.has(v.label) ? false : (seen.add(v.label), true)));
    r.hasPageVariant = r.variants.some((v) => v.matchesPage);
    const best = r.variants.find((v) => v.matchesPage && v.menu_product_url) ?? r.variants.find((v) => v.menu_product_url);
    r.menuHref = best?.menu_product_url ?? r.store.menu_url;
  }
  // Stores with the page's exact size first, then live before recent, then by name.
  result.sort(
    (x, y) =>
      Number(y.hasPageVariant) - Number(x.hasPageVariant) ||
      Number(y.store.availability_tier === "live") - Number(x.store.availability_tier === "live") ||
      x.store.name.localeCompare(y.store.name),
  );
  return result;
}

/** Published stores carrying a brand at all — the fallback when no store lists a strain. */
export async function getStoresForBrand(brand: string): Promise<StoreLocation[]> {
  if (!availabilityVisible()) return [];
  const supabase = createPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("store_locations")
    .select("*")
    .contains("brands", [brand])
    .order("name");
  if (error || !data) return [];
  return data;
}

// ---- size / format helpers for availability chips ----

interface SizeSignature {
  grams: number | null;
  pack: number | null;
  formatWord: string | null;
}

const OZ_TO_G: Record<string, number> = { "1/8": 3.5, "1/4": 7, "1/2": 14, "1": 28 };

function parseGrams(text: string): number | null {
  const t = text.toLowerCase();
  const oz = t.match(/(1\/[248]|\b1)\s*oz\b/);
  if (oz) return OZ_TO_G[oz[1]] ?? null;
  const mg = t.match(/(\d+)\s*mg\b/);
  if (mg) return Number(mg[1]) / 1000;
  const g = t.match(/(\d*\.?\d+)\s*g\b/);
  if (g) return Number(g[1]);
  return null;
}

function parsePack(text: string): number | null {
  const m = text.toLowerCase().match(/(\d+)\s*(?:pk|pack)\b/);
  return m ? Number(m[1]) : null;
}

function formatWord(text: string): string | null {
  const t = text.toLowerCase();
  if (/astro|vape|cart|stone|aio|all[- ]?in[- ]?one|disposable|liquid diamond/.test(t)) return "Vape";
  if (/blunt/.test(t)) return "Blunt";
  if (/pre ?roll|preroll/.test(t)) return "Pre-Roll";
  if (/popcorn|smalls/.test(t)) return "Smalls";
  if (/flower|prepack/.test(t)) return "Flower";
  return null;
}

/** Catalog rows store weight like "14g", "2pk · 0.7g", "1g" and a format like "Small Batch Flower". */
function pageSizeSignature(p: Pick<CatalogProduct, "weight" | "format" | "category" | "name">): SizeSignature {
  const w = p.weight ?? "";
  const fmt = formatWord(`${p.format ?? ""} ${p.category ?? ""} ${p.name}`);
  // Pre-roll packs in the catalog read "10pk · 3.5g": pack size + TOTAL grams.
  return { grams: parseGrams(w), pack: parsePack(w), formatWord: fmt };
}

/** Menu rows: variant like "1 Pack | 14g", "10 Pack | 3.5g", "1/2oz", "each"; the name may carry the size instead. */
function variantSizeSignature(productName: string, variant: string): SizeSignature {
  const v = variant ?? "";
  const grams = parseGrams(v) ?? parseGrams(productName);
  const pack = parsePack(v) ?? parsePack(productName);
  return { grams, pack: pack === 1 ? null : pack, formatWord: formatWord(productName) };
}

function sizeMatches(page: SizeSignature, v: SizeSignature): boolean {
  if (page.grams == null || v.grams == null) return false;
  if (Math.abs(page.grams - v.grams) > 0.05) return false;
  if (page.pack != null && v.pack != null && page.pack !== v.pack) return false;
  return true;
}

function variantLabel(productName: string, variant: string, pageFormat: string | null): string {
  const sig = variantSizeSignature(productName, variant);
  const parts: string[] = [];
  if (sig.formatWord && sig.formatWord !== pageFormat) parts.push(sig.formatWord);
  if (sig.pack) parts.push(`${sig.pack}pk`);
  if (sig.grams != null) parts.push(`${Number(sig.grams.toFixed(2))}g`);
  if (parts.length === 0) {
    const raw = (variant ?? "").trim();
    return raw && raw.toLowerCase() !== "each" ? raw : "On menu";
  }
  return parts.join(" · ");
}

"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { brandByName, isAllowlistedBrand } from "@/lib/brands";
import { revalidateFor, type RevalidateTarget } from "@/lib/revalidate";
import { markPlaceholderRowsMissing, type PlaceholderCounts } from "@/lib/catalog/import-legacy-images";
import { runSheetSync, type SyncSummary } from "@/lib/sheet-sync/run";
import { slugify } from "@/lib/sheet-sync/map";
import type { Database } from "@/lib/database.types";

/**
 * /admin/products server actions. Since D-130 the admin is the source of truth
 * for every field on every product (the sheet sync is frozen; P4 removes it):
 * no "sheet-owned" locks, no hard delete (hide/restore only), duplicate, bulk
 * hide/show. Images are managed by the P1 routes (/api/admin/products/[id]/
 * image, apply-image) — never written here.
 */

type ProductRow = Database["public"]["Tables"]["catalog_products"]["Row"];
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

function admin() {
  return createAdminClient();
}

/**
 * Frozen (D-130): no longer wired to any UI or cron. Kept until P4 deletes the
 * sync engine. Still gated so a stray call can't run it unauthenticated.
 */
export async function syncFromSheet(opts: { dryRun?: boolean } = {}): Promise<SyncSummary> {
  if (!(await requireAdmin())) {
    const now = new Date().toISOString();
    return {
      ok: false,
      startedAt: now,
      finishedAt: now,
      dryRun: !!opts.dryRun,
      tabs: [],
      added: 0,
      updated: 0,
      quarantined: 0,
      missing: 0,
      invalid: [],
      quarantineDetails: [],
      revalidated: [],
      error: "Unauthorized.",
    };
  }
  return runSheetSync(opts);
}

/**
 * Showing a product also clears any sync verdict (quarantined / missing from
 * sheet) — lib/data.ts only lists rows with sync_status null|ok, and the admin
 * decision to show it is final (D-130).
 */
function visibilityPatch(active: boolean) {
  return active ? { is_active: true, sync_status: null, quarantine_reason: null } : { is_active: false };
}

/** Inline SHOW/HIDE (is_active). */
export async function setProductActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();
  const { data, error } = await db
    .from("catalog_products")
    .update(visibilityPatch(active))
    .eq("id", id)
    .select("brand, slug")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Update failed." };
  revalidateFor({ kind: "products", brand: data.brand, slug: data.slug });
  return { ok: true, data: undefined };
}

/** Bulk SHOW/HIDE for the list's row selection. */
export async function setProductsActive(ids: string[], active: boolean): Promise<ActionResult<{ count: number }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return { ok: true, data: { count: 0 } };
  const db = admin();
  const { data, error } = await db
    .from("catalog_products")
    .update(visibilityPatch(active))
    .in("id", unique)
    .select("brand, slug");
  if (error) return { ok: false, error: error.message };
  const targets: RevalidateTarget[] = (data ?? []).map((r) => ({ kind: "products", brand: r.brand, slug: r.slug }));
  if (targets.length) revalidateFor(...targets);
  return { ok: true, data: { count: data?.length ?? 0 } };
}

/** Restore = show a hidden product. */
export async function restoreProduct(id: string): Promise<ActionResult> {
  return setProductActive(id, true);
}

/**
 * SOFT delete only (D-130): hides the product. Rows are never removed — images,
 * availability joins and SEO redirects all key on them.
 */
export async function deleteProduct(id: string): Promise<ActionResult> {
  return setProductActive(id, false);
}

/** Drag-to-reorder within a brand: persists 1-based sort_order in the given order. */
export async function reorderProducts(brand: string, orderedIds: string[]): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await db
      .from("catalog_products")
      .update({ sort_order: i + 1 })
      .eq("id", orderedIds[i])
      .eq("brand", brand);
    if (error) return { ok: false, error: error.message };
  }
  revalidateFor({ kind: "products", brand });
  return { ok: true, data: undefined };
}

/** Slug uniqueness (excluding the product being edited). */
export async function checkSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  if (!(await requireAdmin())) return false;
  return slugFree(slug, excludeId);
}

async function slugFree(slug: string, excludeId?: string): Promise<boolean> {
  const db = admin();
  let q = db.from("catalog_products").select("id").eq("slug", slug).limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return !data || data.length === 0;
}

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "product";
  if (await slugFree(root, excludeId)) return root;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${root}-${n}`;
    if (await slugFree(candidate, excludeId)) return candidate;
  }
  return `${root}-${Date.now()}`;
}

async function nextSortOrder(brand: string): Promise<number> {
  const { data } = await admin()
    .from("catalog_products")
    .select("sort_order")
    .eq("brand", brand)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return (data?.sort_order ?? 0) + 1;
}

export interface TerpeneEntry {
  name: string;
  note: string;
}

// "use server" files may only export async functions — the editor keeps its own copy of this list.
const TERP_CATEGORIES = ["fruit", "haze", "gas", "dessert", "floral"] as const;

export interface ProductInput {
  id?: string;
  brand: string;
  name: string;
  slug: string;
  category: string | null;
  format: string | null;
  weight: string | null;
  thc_range: string | null;
  strain_type: "indica" | "sativa" | "hybrid" | null;
  description: string | null;
  terpene_profile: TerpeneEntry[];
  terp_category: string | null;
  is_active: boolean;
  sort_order: number | null;
}

/**
 * Create / update — every field, every product (D-130). Creates are
 * source='manual' with sync_status null so they list publicly as soon as
 * is_active is true. sheet_row_ref is never written. Image fields are owned by
 * the image routes and left untouched here.
 */
export async function saveProduct(input: ProductInput): Promise<ActionResult<{ id: string; slug: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();

  const name = input.name.trim();
  const brand = input.brand.trim();
  if (!name) return { ok: false, error: "Name is required." };
  if (!isAllowlistedBrand(brand)) return { ok: false, error: "Brand must be on the allowlist." };
  const canonicalBrand = brandByName(brand)!.name;
  const slug = slugify(input.slug || name);
  if (!slug) return { ok: false, error: "Slug is required." };

  const strain = input.strain_type ?? null;
  if (strain && !["indica", "sativa", "hybrid"].includes(strain)) {
    return { ok: false, error: "Strain type must be Indica, Sativa or Hybrid." };
  }
  const terps = (input.terpene_profile ?? [])
    .map((t) => ({ name: (t.name ?? "").trim(), note: (t.note ?? "").trim() }))
    .filter((t) => t.name);
  const terpCategory =
    canonicalBrand === "TerpKings" && input.terp_category ? input.terp_category.toLowerCase() : null;
  if (terpCategory && !(TERP_CATEGORIES as readonly string[]).includes(terpCategory)) {
    return { ok: false, error: "Terp category must be Fruit, Haze, Gas, Dessert or Floral." };
  }
  const sortOrder =
    input.sort_order == null || Number.isNaN(Number(input.sort_order)) ? null : Math.trunc(Number(input.sort_order));

  const fields = {
    name,
    brand: canonicalBrand,
    slug,
    category: input.category?.trim() || null,
    format: input.format?.trim() || null,
    weight: input.weight?.trim() || null,
    thc_range: input.thc_range?.trim() || null,
    strain_type: strain,
    description: input.description?.trim() || null,
    terpene_profile: terps as unknown as Database["public"]["Tables"]["catalog_products"]["Insert"]["terpene_profile"],
    terp_category: terpCategory,
    is_active: !!input.is_active,
    sort_order: sortOrder,
  };

  if (input.id) {
    const { data: existing } = await db.from("catalog_products").select("*").eq("id", input.id).maybeSingle();
    if (!existing) return { ok: false, error: "Product not found." };
    if (slug !== existing.slug && !(await slugFree(slug, input.id))) {
      return { ok: false, error: `Slug "${slug}" is already in use.` };
    }
    // An admin save is the admin's verdict: any sync quarantine / missing mark is cleared.
    const { error } = await db
      .from("catalog_products")
      .update({ ...fields, sync_status: null, quarantine_reason: null })
      .eq("id", input.id);
    if (error) return { ok: false, error: error.message };

    revalidateFor(
      { kind: "products", brand: existing.brand, slug: existing.slug },
      { kind: "products", brand: canonicalBrand, slug },
    );
    return { ok: true, data: { id: input.id, slug } };
  }

  if (!(await slugFree(slug))) return { ok: false, error: `Slug "${slug}" is already in use.` };
  const { data, error } = await db
    .from("catalog_products")
    .insert({
      ...fields,
      source: "manual",
      sync_status: null,
      image_url: null,
      image_storage_path: null,
      image_missing: true,
      image_error: null,
      sort_order: sortOrder ?? (await nextSortOrder(canonicalBrand)),
    })
    .select("id, slug")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };
  revalidateFor({ kind: "products", brand: canonicalBrand, slug: data.slug });
  return { ok: true, data: { id: data.id, slug: data.slug } };
}

export async function saveProductAndReturn(input: ProductInput): Promise<ActionResult<{ id: string; slug: string }>> {
  const r = await saveProduct(input);
  if (r.ok) redirect("/admin/products?saved=" + encodeURIComponent(r.data.slug));
  return r;
}

/**
 * Duplicate: same fields, name suffixed " (copy)", slug re-derived and made
 * unique, hidden, no image, manual source. Returns the new row's id.
 */
export async function duplicateProduct(id: string): Promise<ActionResult<{ id: string; slug: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();
  const { data: src } = await db.from("catalog_products").select("*").eq("id", id).maybeSingle();
  if (!src) return { ok: false, error: "Product not found." };

  const name = /\(copy\)$/i.test(src.name) ? src.name : `${src.name} (copy)`;
  const slug = await uniqueSlug(slugify(name) || slugify(`${src.brand} ${name}`));
  const { data, error } = await db
    .from("catalog_products")
    .insert({
      brand: src.brand,
      name,
      slug,
      category: src.category,
      format: src.format,
      weight: src.weight,
      thc_range: src.thc_range,
      strain_type: src.strain_type,
      description: src.description,
      terpene_profile: src.terpene_profile,
      terp_category: src.terp_category,
      sort_order: src.sort_order == null ? await nextSortOrder(src.brand) : src.sort_order + 1,
      is_active: false,
      source: "manual",
      sync_status: null,
      quarantine_reason: null,
      sheet_row_ref: null,
      image_url: null,
      image_storage_path: null,
      image_missing: true,
      image_error: null,
      image_source_url: null,
    })
    .select("id, slug")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Duplicate failed." };
  // Hidden on creation — nothing public changes until it is shown.
  return { ok: true, data: { id: data.id, slug: data.slug } };
}

/**
 * One-time cutover (D-133): the legacy '/placeholders/product.png' rows lose
 * that URL and get image_missing = true; empty-URL rows get the flag too.
 * Rows with a processed image are never touched. Counts come from
 * countPlaceholderRows() in page.tsx.
 */
export async function markPlaceholderRowsMissingAction(): Promise<ActionResult<PlaceholderCounts>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  try {
    return { ok: true, data: await markPlaceholderRowsMissing(admin()) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Update failed." };
  }
}

export type { ProductRow };

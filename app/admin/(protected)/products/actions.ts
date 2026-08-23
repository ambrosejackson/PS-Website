"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { brandByName, isAllowlistedBrand } from "@/lib/brands";
import { revalidateFor } from "@/lib/revalidate";
import { runSheetSync, type SyncSummary } from "@/lib/sheet-sync/run";
import { slugify } from "@/lib/sheet-sync/map";
import type { Database } from "@/lib/database.types";

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

/** "Sync from sheet" button — runs the iHeartJane sync and returns the summary. */
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

/** Inline SHOW/HIDE (is_active) — admin-owned on every product (D-038). */
export async function setProductActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();
  const { data, error } = await db
    .from("catalog_products")
    .update({ is_active: active })
    .eq("id", id)
    .select("brand, slug")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Update failed." };
  revalidateFor({ kind: "products", brand: data.brand, slug: data.slug });
  return { ok: true, data: undefined };
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

/** Delete — MANUAL products only; synced products can only be hidden. */
export async function deleteProduct(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();
  const { data: row } = await db
    .from("catalog_products")
    .select("id, brand, slug, source")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Product not found." };
  if (row.source !== "manual") {
    return { ok: false, error: "Synced products can't be deleted — hide them instead." };
  }
  const { error } = await db.from("catalog_products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateFor({ kind: "products", brand: row.brand, slug: row.slug });
  return { ok: true, data: undefined };
}

/** Slug uniqueness (excluding the product being edited). */
export async function checkSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  if (!(await requireAdmin())) return false;
  const db = admin();
  let q = db.from("catalog_products").select("id").eq("slug", slug).limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return !data || data.length === 0;
}

export interface TerpeneEntry {
  name: string;
  note: string;
}

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
  image_url: string | null;
  terpene_profile: TerpeneEntry[];
  terp_category: string | null;
  is_active: boolean;
  sort_order: number | null;
}

/**
 * Create / update. On synced products the sheet-owned fields are IGNORED
 * (the sheet owns them — D-038); only description, terpene_profile,
 * terp_category, sort_order, is_active, thc_range are applied.
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

  const terps = (input.terpene_profile ?? [])
    .map((t) => ({ name: (t.name ?? "").trim(), note: (t.note ?? "").trim() }))
    .filter((t) => t.name);
  const terpCategory =
    canonicalBrand === "TerpKings" && input.terp_category
      ? input.terp_category.toLowerCase()
      : null;
  if (terpCategory && !["fruit", "haze", "gas", "dessert", "floral"].includes(terpCategory)) {
    return { ok: false, error: "Terp category must be Fruit, Haze, Gas, Dessert or Floral." };
  }

  const adminOwned = {
    description: input.description?.trim() || null,
    terpene_profile: terps as unknown as Database["public"]["Tables"]["catalog_products"]["Insert"]["terpene_profile"],
    terp_category: terpCategory,
    is_active: !!input.is_active,
    sort_order: input.sort_order ?? null,
    thc_range: input.thc_range?.trim() || null, // not in the sheet → admin may fill it
  };
  const sheetOwned = {
    name,
    brand: canonicalBrand,
    category: input.category?.trim() || null,
    format: input.format?.trim() || null,
    weight: input.weight?.trim() || null,
    strain_type: input.strain_type ?? null,
    image_url: input.image_url?.trim() || null,
    image_missing: !input.image_url?.trim(),
  };

  if (input.id) {
    const { data: existing } = await db
      .from("catalog_products")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (!existing) return { ok: false, error: "Product not found." };
    const synced = existing.source === "sheet";

    if (!synced && slug !== existing.slug && !(await checkSlugAvailable(slug, input.id))) {
      return { ok: false, error: `Slug "${slug}" is already in use.` };
    }
    const patch = synced
      ? adminOwned
      : { ...adminOwned, ...sheetOwned, slug };
    const { error } = await db.from("catalog_products").update(patch).eq("id", input.id);
    if (error) return { ok: false, error: error.message };

    const finalSlug = synced ? existing.slug : slug;
    const finalBrand = synced ? existing.brand : canonicalBrand;
    revalidateFor(
      { kind: "products", brand: existing.brand, slug: existing.slug },
      { kind: "products", brand: finalBrand, slug: finalSlug },
    );
    return { ok: true, data: { id: input.id, slug: finalSlug } };
  }

  if (!(await checkSlugAvailable(slug))) {
    return { ok: false, error: `Slug "${slug}" is already in use.` };
  }
  const { data: maxRow } = await db
    .from("catalog_products")
    .select("sort_order")
    .eq("brand", canonicalBrand)
    .order("sort_order", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await db
    .from("catalog_products")
    .insert({
      ...sheetOwned,
      ...adminOwned,
      slug,
      source: "manual",
      sort_order: input.sort_order ?? (maxRow?.sort_order ?? 0) + 1,
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

export type { ProductRow };

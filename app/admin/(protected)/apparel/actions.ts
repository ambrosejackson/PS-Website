"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { brandByName } from "@/lib/brands";
import { revalidateFor } from "@/lib/revalidate";
import { slugify } from "@/lib/sheet-sync/map";
import type { Database } from "@/lib/database.types";

type MerchRow = Database["public"]["Tables"]["merch_products"]["Row"];
type VariantRow = Database["public"]["Tables"]["merch_variants"]["Row"];
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

import { FULFILLMENT_PROVIDERS, type FulfillmentProvider } from "./apparel-config";

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}
const admin = () => createAdminClient();

export async function setMerchActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const { data, error } = await admin()
    .from("merch_products")
    .update({ is_active: active })
    .eq("id", id)
    .select("slug")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Update failed." };
  revalidateFor({ kind: "apparel", slug: data.slug });
  return { ok: true, data: undefined };
}

export async function reorderMerch(orderedIds: string[]): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await db.from("merch_products").update({ sort_order: i + 1 }).eq("id", orderedIds[i]);
    if (error) return { ok: false, error: error.message };
  }
  revalidateFor({ kind: "apparel" });
  return { ok: true, data: undefined };
}

export async function deleteMerch(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();
  const { data: row } = await db.from("merch_products").select("slug").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "Product not found." };
  const { error } = await db.from("merch_products").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error: error.message.includes("order_items")
        ? "This product has variants referenced by orders — deactivate it instead of deleting."
        : error.message,
    };
  }
  revalidateFor({ kind: "apparel", slug: row.slug });
  return { ok: true, data: undefined };
}

export async function checkMerchSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  if (!(await requireAdmin())) return false;
  let q = admin().from("merch_products").select("id").eq("slug", slug).limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return !data || data.length === 0;
}

export interface VariantInput {
  id?: string;
  sku: string;
  size: string | null;
  color: string | null;
  /** Dollars as typed; stored as price_cents. */
  price: string;
  is_active: boolean;
}

export interface MerchInput {
  id?: string;
  name: string;
  slug: string;
  description: string | null;
  /** null = Private Stock (house), else an allowlisted brand name. */
  brand: string | null;
  images: string[];
  fulfillment_provider: FulfillmentProvider;
  is_active: boolean;
  sort_order: number | null;
  variants: VariantInput[];
}

function dollarsToCents(v: string): number | null {
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export async function saveMerch(input: MerchInput): Promise<ActionResult<{ id: string; slug: string }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = admin();

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name is required." };
  const slug = slugify(input.slug || name);
  if (!slug) return { ok: false, error: "Slug is required." };
  if (input.brand && !brandByName(input.brand)) return { ok: false, error: "Brand must be Private Stock or an allowlisted brand." };
  const brand = input.brand ? brandByName(input.brand)!.name : null;
  if (!FULFILLMENT_PROVIDERS.includes(input.fulfillment_provider)) {
    return { ok: false, error: "Fulfillment provider must be self, printify or tapstitch." };
  }
  const images = (input.images ?? []).map((u) => u.trim()).filter(Boolean);

  // Validate variants up front.
  const variants: { id?: string; sku: string; size: string | null; color: string | null; price_cents: number; is_active: boolean }[] = [];
  const skus = new Set<string>();
  for (const v of input.variants ?? []) {
    const sku = v.sku.trim().toUpperCase();
    if (!sku) return { ok: false, error: "Every variant needs a SKU." };
    if (skus.has(sku)) return { ok: false, error: `Duplicate SKU ${sku} in this product.` };
    skus.add(sku);
    const cents = dollarsToCents(v.price);
    if (cents === null) return { ok: false, error: `Variant ${sku}: enter a valid price in dollars.` };
    variants.push({
      id: v.id,
      sku,
      size: v.size?.trim() || null,
      color: v.color?.trim() || null,
      price_cents: cents,
      is_active: !!v.is_active,
    });
  }

  const base = {
    name,
    slug,
    description: input.description?.trim() || null,
    brand,
    images: images as unknown as Database["public"]["Tables"]["merch_products"]["Insert"]["images"],
    fulfillment_provider: input.fulfillment_provider,
    is_active: !!input.is_active,
    sort_order: input.sort_order ?? null,
  };

  let productId = input.id;
  let oldSlug: string | null = null;
  if (productId) {
    const { data: existing } = await db.from("merch_products").select("slug").eq("id", productId).maybeSingle();
    if (!existing) return { ok: false, error: "Product not found." };
    oldSlug = existing.slug;
    if (slug !== existing.slug && !(await checkMerchSlugAvailable(slug, productId))) {
      return { ok: false, error: `Slug "${slug}" is already in use.` };
    }
    const { error } = await db.from("merch_products").update(base).eq("id", productId);
    if (error) return { ok: false, error: error.message };
  } else {
    if (!(await checkMerchSlugAvailable(slug))) return { ok: false, error: `Slug "${slug}" is already in use.` };
    const { data: maxRow } = await db
      .from("merch_products")
      .select("sort_order")
      .order("sort_order", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await db
      .from("merch_products")
      .insert({ ...base, sort_order: input.sort_order ?? (maxRow?.sort_order ?? 0) + 1 })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Insert failed." };
    productId = data.id;
  }

  // ---- variants: upsert kept ones, delete removed ones (deactivate if referenced by orders)
  const { data: existingVariants } = await db.from("merch_variants").select("id").eq("product_id", productId);
  const keepIds = new Set(variants.filter((v) => v.id).map((v) => v.id!));
  for (const ev of existingVariants ?? []) {
    if (keepIds.has(ev.id)) continue;
    const { error } = await db.from("merch_variants").delete().eq("id", ev.id);
    if (error) await db.from("merch_variants").update({ is_active: false }).eq("id", ev.id);
  }
  for (const v of variants) {
    if (v.id) {
      const { error } = await db
        .from("merch_variants")
        .update({ sku: v.sku, size: v.size, color: v.color, price_cents: v.price_cents, is_active: v.is_active })
        .eq("id", v.id)
        .eq("product_id", productId);
      if (error) return { ok: false, error: `Variant ${v.sku}: ${error.message}` };
    } else {
      const { error } = await db.from("merch_variants").insert({
        product_id: productId,
        sku: v.sku,
        size: v.size,
        color: v.color,
        price_cents: v.price_cents,
        is_active: v.is_active,
      });
      if (error) return { ok: false, error: `Variant ${v.sku}: ${error.message}` };
    }
  }

  revalidateFor({ kind: "apparel", slug }, ...(oldSlug && oldSlug !== slug ? [{ kind: "apparel" as const, slug: oldSlug }] : []));
  return { ok: true, data: { id: productId!, slug } };
}

export type { MerchRow, VariantRow };

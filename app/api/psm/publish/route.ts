import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BRAND_NAMES, BRANDS, brandByName } from "@/lib/brands";
import { PSM_IMAGE_URL_PREFIX } from "@/lib/catalog/product-image-urls";
import { pathsFor } from "@/lib/revalidate";
import { slugify } from "@/lib/slug";
import type { Database } from "@/lib/database.types";
import { revalidatePath } from "next/cache";

/**
 * PSM → website publish receiver (D-058; catalog sync D-137).
 *
 * The website never holds a PSM credential and never reaches into the PSM
 * project. PSM's `publish_store_locator()` (pg_cron + pg_net) POSTs a curated
 * payload here with `Authorization: Bearer <PSM_PUBLISH_SECRET>`; this route
 * validates it, replaces `store_locations` + `product_availability`, upserts
 * the optional `catalog` block into `catalog_products` (keyed on psm_sku_id),
 * and revalidates the pages that read them.
 *
 * Fail-closed rules:
 *   - unknown keys on any row  → 400, nothing written (a future PSM-side column
 *     cannot quietly start leaking price/cost data into a public table)
 *   - zero stores              → 400, nothing deleted (a broken upstream run
 *     must not empty the locator)
 *   - zero valid catalog rows  → the catalog part is refused (400 when the body
 *     is catalog-only; otherwise reported under `catalog.error`)
 *   - off-allowlist brands     → dropped silently (second gate; the view filters too)
 *
 * `stores` is optional only when `catalog` is present; a body with neither → 400.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STORE_KEYS = new Set([
  "id", "name", "chain_name", "address_line1", "address_line2", "city", "state", "zip",
  "latitude", "longitude", "phone", "menu_url", "brands",
  "last_delivery_within_90d", "availability_tier", "availability_checked_at",
]);

const AVAIL_KEYS = new Set([
  "store_id", "brand", "product_name", "variant", "menu_product_url", "image_url", "checked_at",
]);

/** One row of the PSM product-SKU view. Website-only fields never appear here. */
const CATALOG_KEYS = new Set([
  "psm_sku_id", "brand", "name", "category", "format", "weight", "description",
  "strain_type", "lineage", "is_active", "image_url",
]);

/** Belt and braces: no price-shaped key may ever reach a public table. */
const FORBIDDEN = /price|msrp|discount|cost|amount|w9|licen|scheduling|contact/i;

const ALLOWED_BRANDS = new Set(BRAND_NAMES.map((b) => b.toLowerCase()));
const TIERS = new Set(["live", "recent", "listed"]);
const STRAIN_TYPES = new Set(["indica", "sativa", "hybrid"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CATALOG_CHUNK = 100;
const REVALIDATE_PRODUCT_PATH_CAP = 300;
const EMPTY_CATALOG = "Refusing to publish an empty catalog — nothing was changed.";

type CatalogInsert = Database["public"]["Tables"]["catalog_products"]["Insert"];

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function checkKeys(rows: unknown, allowed: Set<string>, label: string): string | null {
  if (!Array.isArray(rows)) return `${label} must be an array.`;
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) return `${label} rows must be objects.`;
    for (const key of Object.keys(row as object)) {
      if (FORBIDDEN.test(key)) return `${label}: forbidden key "${key}".`;
      if (!allowed.has(key)) return `${label}: unexpected key "${key}".`;
    }
  }
  return null;
}

/* ---------- catalog validation ---------- */

interface CatalogRow {
  psm_sku_id: string;
  brand: string;
  name: string;
  category: string | null;
  format: string | null;
  weight: string | null;
  description: string | null;
  strain_type: string | null;
  lineage: string | null;
  is_active: boolean;
  image_url: string | null;
}

interface CatalogCounts {
  received: number;
  inserted: number;
  updated: number;
  rejected: number;
  image_rejected: number;
}

function optionalText(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/**
 * Validate every catalog row. Rows failing uuid / brand / name / is_active are
 * dropped (`rejected`); an image_url outside the PSM product-images bucket is
 * nulled (`imageRejected`) and the row still syncs. Last row per psm_sku_id wins.
 */
function validateCatalog(rows: Record<string, unknown>[]): { rows: CatalogRow[]; rejected: number; imageRejected: number } {
  const out = new Map<string, CatalogRow>();
  let rejected = 0;
  let imageRejected = 0;
  for (const r of rows) {
    const id = typeof r.psm_sku_id === "string" ? r.psm_sku_id.toLowerCase() : "";
    const brand = typeof r.brand === "string" ? brandByName(r.brand) : undefined;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    if (!UUID_RE.test(id) || !brand || !ALLOWED_BRANDS.has(brand.name.toLowerCase()) || !name || typeof r.is_active !== "boolean") {
      rejected++;
      continue;
    }
    let image: string | null = null;
    if (r.image_url != null) {
      if (typeof r.image_url === "string" && r.image_url.startsWith(PSM_IMAGE_URL_PREFIX)) image = r.image_url;
      else imageRejected++;
    }
    const strain = typeof r.strain_type === "string" ? r.strain_type.trim().toLowerCase() : "";
    out.set(id, {
      psm_sku_id: id,
      brand: brand.name,
      name,
      category: optionalText(r.category),
      format: optionalText(r.format),
      weight: optionalText(r.weight),
      description: optionalText(r.description),
      strain_type: STRAIN_TYPES.has(strain) ? strain : null,
      lineage: optionalText(r.lineage),
      is_active: r.is_active,
      image_url: image,
    });
  }
  return { rows: [...out.values()], rejected, imageRejected };
}

/* ---------- catalog upsert ---------- */

type Admin = ReturnType<typeof createAdminClient>;

async function loadAllSlugs(supabase: Admin): Promise<Set<string>> {
  const slugs = new Set<string>();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from("catalog_products").select("slug").range(from, from + page - 1);
    if (error) throw new Error(`slug load: ${error.message}`);
    for (const r of data ?? []) slugs.add(r.slug);
    if (!data || data.length < page) break;
  }
  return slugs;
}

/** First free slug among base, base-2, base-3… against the set (which is updated). */
function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || "product";
  let slug = root;
  for (let n = 2; taken.has(slug); n++) slug = `${root}-${n}`;
  taken.add(slug);
  return slug;
}

/**
 * Upsert the validated catalog in chunks of 100, keyed on psm_sku_id.
 * Existing rows: only the synced fields move — never slug, thc_range,
 * terpene_profile, terp_category, sort_order, the website image fields,
 * sheet_row_ref, source or sync_status. New rows: source='psm', slug derived
 * from "{brand} {name}", website image fields null. Throws on the first write
 * error; a retry is safe because everything keys on psm_sku_id.
 */
async function upsertCatalog(
  supabase: Admin,
  rows: CatalogRow[],
  counts: CatalogCounts,
): Promise<{ brand: string; slug: string }[]> {
  const taken = await loadAllSlugs(supabase);
  const touched: { brand: string; slug: string }[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < rows.length; i += CATALOG_CHUNK) {
    const chunk = rows.slice(i, i + CATALOG_CHUNK);
    const ids = chunk.map((r) => r.psm_sku_id);
    const { data: existing, error: readErr } = await supabase
      .from("catalog_products")
      .select("id, slug, brand, psm_sku_id")
      .in("psm_sku_id", ids);
    if (readErr) throw new Error(`catalog read: ${readErr.message}`);
    const byPsmId = new Map((existing ?? []).map((e) => [String(e.psm_sku_id).toLowerCase(), e]));

    const inserts: CatalogInsert[] = [];
    for (const r of chunk) {
      const synced = {
        name: r.name,
        description: r.description,
        category: r.category,
        format: r.format,
        weight: r.weight,
        strain_type: r.strain_type,
        lineage: r.lineage,
        is_active: r.is_active,
        psm_image_url: r.image_url,
        psm_synced_at: now,
      };
      const found = byPsmId.get(r.psm_sku_id);
      if (found) {
        const { error } = await supabase.from("catalog_products").update(synced).eq("id", found.id);
        if (error) throw new Error(`catalog update ${r.psm_sku_id}: ${error.message}`);
        counts.updated++;
        touched.push({ brand: found.brand, slug: found.slug });
        continue;
      }
      const slug = uniqueSlug(slugify(`${r.brand} ${r.name}`), taken);
      inserts.push({
        ...synced,
        psm_sku_id: r.psm_sku_id,
        brand: r.brand,
        slug,
        source: "psm",
        sync_status: "ok",
        quarantine_reason: null,
        image_missing: r.image_url === null,
        image_url: null,
        image_storage_path: null,
        image_source_url: null,
        image_error: null,
      });
      touched.push({ brand: r.brand, slug });
    }
    if (inserts.length) {
      const { error } = await supabase.from("catalog_products").insert(inserts);
      if (error) throw new Error(`catalog insert: ${error.message}`);
      counts.inserted += inserts.length;
    }
  }
  return touched;
}

/* ---------- handler ---------- */

export async function POST(request: Request) {
  const secret = process.env.PSM_PUBLISH_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !timingSafeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { stores?: unknown; availability?: unknown; catalog?: unknown; generated_at?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const hasStores = body.stores !== undefined;
  const hasCatalog = body.catalog !== undefined;
  if (!hasStores && !hasCatalog) {
    return NextResponse.json({ error: "Body must include stores and/or catalog." }, { status: 400 });
  }

  // Every key check runs before any write: a forbidden key anywhere fails the whole batch.
  if (hasStores) {
    const storeErr = checkKeys(body.stores, STORE_KEYS, "stores");
    if (storeErr) return NextResponse.json({ error: storeErr }, { status: 400 });
    const availErr = checkKeys(body.availability ?? [], AVAIL_KEYS, "availability");
    if (availErr) return NextResponse.json({ error: availErr }, { status: 400 });
  } else if (body.availability !== undefined) {
    return NextResponse.json({ error: "availability requires stores." }, { status: 400 });
  }
  if (hasCatalog) {
    const catalogErr = checkKeys(body.catalog, CATALOG_KEYS, "catalog");
    if (catalogErr) return NextResponse.json({ error: catalogErr }, { status: 400 });
  }

  const catalogCounts: CatalogCounts = { received: 0, inserted: 0, updated: 0, rejected: 0, image_rejected: 0 };
  let catalogRows: CatalogRow[] = [];
  if (hasCatalog) {
    const raw = body.catalog as Record<string, unknown>[];
    const v = validateCatalog(raw);
    catalogRows = v.rows;
    catalogCounts.received = raw.length;
    catalogCounts.rejected = v.rejected;
    catalogCounts.image_rejected = v.imageRejected;
    if (!hasStores && catalogRows.length === 0) {
      return NextResponse.json({ error: EMPTY_CATALOG, catalog: catalogCounts }, { status: 400 });
    }
  }

  const supabase = createAdminClient();
  const paths = new Set<string>(["/", "/store-locator", "/products"]);
  let storesResult: { stores: number; availability: number; pruned: number } | null = null;

  if (hasStores) {
    const stores: Record<string, unknown>[] = (body.stores as Record<string, unknown>[]).map((s) => ({
      ...s,
      brands: (Array.isArray(s.brands) ? (s.brands as string[]) : []).filter((b) =>
        ALLOWED_BRANDS.has(String(b).toLowerCase()),
      ),
      availability_tier: TIERS.has(String(s.availability_tier)) ? s.availability_tier : "listed",
    }));

    if (stores.length === 0) {
      return NextResponse.json(
        { error: "Refusing to publish an empty store set — nothing was changed." },
        { status: 400 },
      );
    }

    const storeIds = new Set(stores.map((s) => String(s.id)));
    const availability = (body.availability as Record<string, unknown>[] | undefined ?? []).filter(
      (a) => storeIds.has(String(a.store_id)) && ALLOWED_BRANDS.has(String(a.brand).toLowerCase()),
    );

    // 1. Upsert stores first — product_availability.store_id references them.
    const { error: upsertStores } = await supabase
      .from("store_locations")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(stores as any, { onConflict: "id" });
    if (upsertStores) {
      return NextResponse.json({ error: `stores upsert: ${upsertStores.message}` }, { status: 500 });
    }

    // 2. Availability is replaced wholesale — a product that left a menu must vanish.
    const { error: clearAvail } = await supabase
      .from("product_availability")
      .delete()
      .not("store_id", "is", null);
    if (clearAvail) {
      return NextResponse.json({ error: `availability clear: ${clearAvail.message}` }, { status: 500 });
    }
    if (availability.length > 0) {
      const { error: insertAvail } = await supabase
        .from("product_availability")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(availability as any, { onConflict: "store_id,brand,product_name,variant" });
      if (insertAvail) {
        return NextResponse.json({ error: `availability insert: ${insertAvail.message}` }, { status: 500 });
      }
    }

    // 3. Drop stores that fell out of the publish set (mock rows included).
    const { error: pruneStores, count: pruned } = await supabase
      .from("store_locations")
      .delete({ count: "exact" })
      .not("id", "in", `(${[...storeIds].join(",")})`);
    if (pruneStores) {
      return NextResponse.json({ error: `stores prune: ${pruneStores.message}` }, { status: 500 });
    }

    storesResult = { stores: stores.length, availability: availability.length, pruned: pruned ?? 0 };
  }

  let catalogResult: (CatalogCounts & { error?: string }) | undefined;
  if (hasCatalog) {
    if (catalogRows.length === 0) {
      catalogResult = { ...catalogCounts, error: EMPTY_CATALOG };
    } else {
      try {
        const touched = await upsertCatalog(supabase, catalogRows, catalogCounts);
        // The three fixed paths + every touched product page (capped) + every brand page.
        let productPaths = 0;
        for (const t of touched) {
          for (const p of pathsFor({ kind: "products", brand: t.brand, slug: t.slug })) {
            if (p.startsWith("/products/")) {
              if (productPaths >= REVALIDATE_PRODUCT_PATH_CAP) continue;
              productPaths++;
            }
            paths.add(p);
          }
        }
        for (const b of BRANDS) paths.add(`/${b.slug}`);
        catalogResult = { ...catalogCounts };
      } catch (e) {
        // Stores (if any) are already written; revalidate what we have and report the counts so far.
        for (const path of paths) revalidatePath(path);
        return NextResponse.json(
          { error: e instanceof Error ? e.message : String(e), ...(storesResult ?? {}), catalog: { ...catalogCounts } },
          { status: 500 },
        );
      }
    }
  }

  for (const path of paths) revalidatePath(path);

  return NextResponse.json({
    ok: true,
    generated_at: body.generated_at ?? null,
    ...(storesResult ?? {}),
    ...(catalogResult ? { catalog: catalogResult } : {}),
  });
}

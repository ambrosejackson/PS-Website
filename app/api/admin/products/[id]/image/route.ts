import { revalidateFor } from "@/lib/revalidate";
import {
  cleanupStagingObjects,
  deleteProductImage,
  downloadObject,
  isStagingKey,
  PRODUCT_IMAGE_BUCKET,
  ProductImageError,
  stagingMime,
  storeProductImage,
} from "@/lib/catalog/product-image";
import { adminContext, errorResponse, json, readJson, UUID_RE } from "@/lib/catalog/product-image-routes";

/**
 * Product image upload / removal (admin only, cookie session).
 *
 * POST { sourcePath } — the browser has already PUT the ORIGINAL bytes to
 * products/_staging/{name}.{jpg|png|webp} via a signed upload (so the 4.5 MB
 * Vercel request-body limit never applies). This route downloads that object,
 * runs the sharp pipeline (lib/catalog/product-image.ts), writes the three
 * renditions, deletes the product's previous renditions, updates the row and
 * revalidates. The staging object is removed in `finally` whatever happens.
 *
 * DELETE — removes the renditions and clears the row (image_missing = true).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

const ROW_SELECT = "*";

export async function POST(request: Request, { params }: Ctx) {
  const ctx = await adminContext();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: "Invalid product id." }, 400);

  const body = await readJson<{ sourcePath?: unknown }>(request);
  const sourcePath = typeof body?.sourcePath === "string" ? body.sourcePath.trim() : "";
  if (!isStagingKey(sourcePath)) {
    return json({ error: "sourcePath must be a products/_staging/{name}.{jpg|png|webp} object." }, 400);
  }

  // Housekeeping first: abandoned originals older than an hour.
  await cleanupStagingObjects(admin);

  const { data: product, error: readErr } = await admin.from("catalog_products").select(ROW_SELECT).eq("id", id).maybeSingle();
  if (readErr) return json({ error: readErr.message }, 500);
  if (!product) return json({ error: "Product not found." }, 404);

  const staging = admin.storage.from(PRODUCT_IMAGE_BUCKET);
  try {
    const buffer = await downloadObject(admin, sourcePath);
    const stored = await storeProductImage(admin, { buffer, mime: stagingMime(sourcePath), productId: id });

    // Previous renditions go only after the new ones are safely written.
    if (product.image_storage_path && product.image_storage_path !== stored.storagePath) {
      await deleteProductImage(admin, product.image_storage_path);
    }

    const { data: row, error: updErr } = await admin
      .from("catalog_products")
      .update({
        image_url: stored.urls[800],
        image_storage_path: stored.storagePath,
        image_missing: false,
        image_error: null,
      })
      .eq("id", id)
      .select(ROW_SELECT)
      .single();
    if (updErr || !row) return json({ error: updErr?.message ?? "Update failed." }, 500);

    revalidateFor({ kind: "products", brand: row.brand, slug: row.slug });
    return json({ ok: true, product: row, image: stored });
  } catch (e) {
    if (e instanceof ProductImageError) {
      // Surface the failure in /admin without touching the live image fields.
      await admin.from("catalog_products").update({ image_error: e.message }).eq("id", id);
    }
    return errorResponse(e);
  } finally {
    await staging.remove([sourcePath]).catch(() => undefined);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const ctx = await adminContext();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const { id } = await params;
  if (!UUID_RE.test(id)) return json({ error: "Invalid product id." }, 400);

  await cleanupStagingObjects(admin);

  const { data: product, error: readErr } = await admin.from("catalog_products").select(ROW_SELECT).eq("id", id).maybeSingle();
  if (readErr) return json({ error: readErr.message }, 500);
  if (!product) return json({ error: "Product not found." }, 404);

  try {
    await deleteProductImage(admin, product.image_storage_path);
    const { data: row, error: updErr } = await admin
      .from("catalog_products")
      .update({ image_url: null, image_storage_path: null, image_missing: true, image_error: null })
      .eq("id", id)
      .select(ROW_SELECT)
      .single();
    if (updErr || !row) return json({ error: updErr?.message ?? "Update failed." }, 500);

    revalidateFor({ kind: "products", brand: row.brand, slug: row.slug });
    return json({ ok: true, product: row });
  } catch (e) {
    return errorResponse(e);
  }
}

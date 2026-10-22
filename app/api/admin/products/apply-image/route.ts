import { revalidateFor, type RevalidateTarget } from "@/lib/revalidate";
import {
  APPLY_IMAGE_MAX_TARGETS,
  cleanupStagingObjects,
  copyProductImage,
  deleteProductImage,
} from "@/lib/catalog/product-image";
import { adminContext, errorResponse, json, readJson, UUID_RE, type ProductRow } from "@/lib/catalog/product-image-routes";

/**
 * Apply one product's processed image to other products (admin only).
 *
 * POST { sourceProductId, targetProductIds: string[] }
 * For each target: delete its previous renditions, server-side copy the
 * source's three objects into the target's own catalog/{targetId}/{hash}/
 * path (Storage copy — no download, no re-encode), update the row, revalidate.
 * Built for the SSS pre-roll family and the products that share one Drive image.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_TARGETS = APPLY_IMAGE_MAX_TARGETS;

export async function POST(request: Request) {
  const ctx = await adminContext();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const body = await readJson<{ sourceProductId?: unknown; targetProductIds?: unknown }>(request);
  const sourceProductId = typeof body?.sourceProductId === "string" ? body.sourceProductId : "";
  if (!UUID_RE.test(sourceProductId)) return json({ error: "sourceProductId must be a UUID." }, 400);
  const rawTargets = Array.isArray(body?.targetProductIds) ? body.targetProductIds : null;
  if (!rawTargets) return json({ error: "targetProductIds must be an array of UUIDs." }, 400);
  if (!rawTargets.every((t): t is string => typeof t === "string" && UUID_RE.test(t))) {
    return json({ error: "targetProductIds must be UUIDs." }, 400);
  }
  const targetIds = [...new Set(rawTargets)].filter((t) => t !== sourceProductId);
  if (!targetIds.length) return json({ error: "No target products (the source itself is skipped)." }, 400);
  if (targetIds.length > MAX_TARGETS) return json({ error: `At most ${MAX_TARGETS} targets per call.` }, 400);

  await cleanupStagingObjects(admin);

  const { data: source, error: srcErr } = await admin
    .from("catalog_products")
    .select("id, image_storage_path")
    .eq("id", sourceProductId)
    .maybeSingle();
  if (srcErr) return json({ error: srcErr.message }, 500);
  if (!source) return json({ error: "Source product not found." }, 404);
  if (!source.image_storage_path) {
    return json({ error: "The source product has no processed image yet — upload one to it first." }, 409);
  }

  const { data: targets, error: tgtErr } = await admin.from("catalog_products").select("*").in("id", targetIds);
  if (tgtErr) return json({ error: tgtErr.message }, 500);
  const byId = new Map((targets ?? []).map((t) => [t.id, t]));

  const updated: ProductRow[] = [];
  const failed: { id: string; error: string }[] = [];
  const revalidate: RevalidateTarget[] = [];

  for (const id of targetIds) {
    const target = byId.get(id);
    if (!target) {
      failed.push({ id, error: "Product not found." });
      continue;
    }
    try {
      const copied = await copyProductImage(admin, source.image_storage_path, id);
      if (target.image_storage_path && target.image_storage_path !== copied.storagePath) {
        await deleteProductImage(admin, target.image_storage_path);
      }
      const { data: row, error: updErr } = await admin
        .from("catalog_products")
        .update({
          image_url: copied.urls[800],
          image_storage_path: copied.storagePath,
          image_missing: false,
          image_error: null,
        })
        .eq("id", id)
        .select("*")
        .single();
      if (updErr || !row) throw new Error(updErr?.message ?? "Update failed.");
      updated.push(row);
      revalidate.push({ kind: "products", brand: row.brand, slug: row.slug });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      failed.push({ id, error: message });
      await admin.from("catalog_products").update({ image_error: message }).eq("id", id);
    }
  }

  if (revalidate.length) revalidateFor(...revalidate);
  if (!updated.length && failed.length) return errorResponse(new Error(failed[0].error));
  return json({ ok: failed.length === 0, sourceStoragePath: source.image_storage_path, updated, failed });
}

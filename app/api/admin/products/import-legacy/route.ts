import { LEGACY_IMPORT_DEFAULT_LIMIT, runImportBatch } from "@/lib/catalog/import-legacy-images";
import { adminContext, errorResponse, json, readJson } from "@/lib/catalog/product-image-routes";

/**
 * ONE-TIME legacy image import, one batch per call (admin only, D-132).
 *
 * POST { dryRun: boolean, retryFailed?: boolean }
 *   dryRun = true  → download + validate the next 25 candidates' files, write nothing.
 *   dryRun = false → import them (pipeline once per Drive file, Storage copies for
 *                    products sharing it), mark failures in image_error, revalidate.
 * Returns the batch result incl. `remaining`; the admin keeps calling until it is 0.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  const ctx = await adminContext();
  if (!ctx.ok) return ctx.response;

  const body = await readJson<{ dryRun?: unknown; retryFailed?: unknown }>(request);
  if (!body || typeof body.dryRun !== "boolean") return json({ error: "Body must be { dryRun: boolean }." }, 400);

  try {
    const result = await runImportBatch(ctx.admin, {
      dryRun: body.dryRun,
      retryFailed: body.retryFailed === true,
      limit: LEGACY_IMPORT_DEFAULT_LIMIT,
      budgetMs: maxDuration * 1000,
    });
    return json(result);
  } catch (e) {
    return errorResponse(e);
  }
}

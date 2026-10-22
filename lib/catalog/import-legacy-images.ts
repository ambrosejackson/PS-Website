import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { revalidateFor, type RevalidateTarget } from "@/lib/revalidate";
import { copyProductImage, storeProductImage, ProductImageError } from "./product-image";
import { LEGACY_PRODUCT_PLACEHOLDER } from "./product-image-urls";
import { driveDownloadUrl, extractDriveId, inspectDriveImage, isLegacyDriveUrl } from "./legacy-drive";

export { extractDriveId, isLegacyDriveUrl } from "./legacy-drive";

/**
 * ONE-TIME import of the legacy Drive product images into Storage renditions
 * (P3 of the sheet-sync retirement, D-132). Not an ongoing sync: once every
 * candidate has either a storage path or a `legacy import:` error, the admin
 * panel disappears.
 *
 * Candidates: image_storage_path IS NULL and image_source_url is a Drive URL
 * (lh3.googleusercontent.com or drive.google.com — either form, with or without
 * the =w1200 suffix). Rows on /placeholders/product.png or with an empty URL are
 * NOT candidates; `markPlaceholderRowsMissing` handles those.
 *
 * A batch takes the next `limit` candidates, pulls in every other candidate
 * that shares one of their Drive file IDs (so a file is downloaded exactly
 * once), downloads each file from lh3 at a 1600 px long edge (=s1600 — the
 * pipeline's own cap, so the renditions are identical and the download is ~3.5 MB
 * instead of the ~12 MB originals), validates it (HTML "need
 * access" pages count as 403), runs the P1 pipeline once for the first product
 * of the group and `copyProductImage` for the rest. Failures write
 * `image_error = "legacy import: {reason}"` and `image_missing = true`, leave
 * image_url as it was, and drop the row out of the candidate set so the loop
 * terminates ("Retry failed" puts them back in). image_source_url is never
 * written.
 */

type Admin = SupabaseClient<Database>;

export const LEGACY_IMPORT_ERROR_PREFIX = "legacy import: ";
export const LEGACY_IMPORT_DEFAULT_LIMIT = 25;
/** Per-file download timeout. */
export const LEGACY_IMPORT_FETCH_TIMEOUT_MS = 20_000;
/** Stop starting new files once this share of the budget has elapsed. */
export const LEGACY_IMPORT_BUDGET_SHARE = 0.8;

const CANDIDATE_SELECT = "id, name, brand, slug, image_url, image_source_url, image_error";

export interface LegacyImportCandidate {
  id: string;
  name: string;
  brand: string;
  slug: string;
  image_url: string | null;
  image_source_url: string | null;
  image_error: string | null;
  driveId: string;
  /** image_error already carries a `legacy import:` verdict from an earlier batch. */
  previouslyFailed: boolean;
}

export interface LegacyImportRowResult {
  productId: string;
  name: string;
  brand: string;
  driveId: string;
  /** `process` = pipeline ran for this product; `copy` = renditions copied from its group's first product. */
  action: "process" | "copy";
  ok: boolean;
  reason?: string;
  /** Source file facts from the download (also in dry run). */
  bytes?: number;
  format?: string;
  width?: number;
  height?: number;
  storagePath?: string;
}

export interface LegacyImportFailure {
  productId: string;
  name: string;
  driveId: string;
  reason: string;
}

export interface LegacyImportBatchResult {
  dryRun: boolean;
  /** Rows this batch handled (downloads attempted for their groups). */
  processed: number;
  succeeded: number;
  failed: LegacyImportFailure[];
  /** Every row, in the order handled — for the results table. */
  rows: LegacyImportRowResult[];
  /** Distinct Drive files downloaded in this batch. */
  filesFetched: number;
  /** Candidates still importable after this batch (real run: re-counted; dry run: what would remain). */
  remaining: number;
  /** Candidates that already failed earlier and were skipped (retryFailed = false). */
  skippedPreviouslyFailed: number;
  /** True when the time budget stopped the batch before `limit` rows. */
  stoppedEarly: boolean;
  elapsedMs: number;
}

export interface LegacyImportCounts {
  /** Importable right now (excludes rows that already failed). */
  candidates: number;
  /** Rows carrying a `legacy import:` error from an earlier batch. */
  previouslyFailed: number;
  /** Distinct Drive files behind the importable candidates. */
  distinctFiles: number;
}

/* ------------------------------------------------------------------ select */

/**
 * Every row with no storage path whose source URL is a Drive URL, with its
 * Drive ID extracted. Ordered brand → sort_order → name so batches are stable.
 * Rows whose URL is on a Drive host but has no recognisable file ID are kept
 * and fail in the batch with a clear reason (so they get an image_error too).
 */
export async function selectCandidates(admin: Admin): Promise<LegacyImportCandidate[]> {
  const { data, error } = await admin
    .from("catalog_products")
    .select(CANDIDATE_SELECT)
    .is("image_storage_path", null)
    .not("image_source_url", "is", null)
    .order("brand", { ascending: true })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });
  if (error) throw new Error(`Could not load candidates: ${error.message}`);
  const out: LegacyImportCandidate[] = [];
  for (const r of data ?? []) {
    if (!isLegacyDriveUrl(r.image_source_url)) continue;
    const driveId = extractDriveId(r.image_source_url) ?? "";
    out.push({
      ...r,
      driveId,
      previouslyFailed: !!r.image_error && r.image_error.startsWith(LEGACY_IMPORT_ERROR_PREFIX),
    });
  }
  return out;
}

export async function countLegacyImportCandidates(admin: Admin): Promise<LegacyImportCounts> {
  const all = await selectCandidates(admin);
  const live = all.filter((c) => !c.previouslyFailed);
  return {
    candidates: live.length,
    previouslyFailed: all.length - live.length,
    distinctFiles: new Set(live.map((c) => c.driveId).filter(Boolean)).size,
  };
}

/* ---------------------------------------------------------------- download */

interface Download {
  ok: true;
  buffer: Buffer;
  mime: "image/jpeg" | "image/png" | "image/webp";
  format: string;
  width: number;
  height: number;
}
type DownloadResult = Download | { ok: false; reason: string };

async function fetchDrive(id: string, signal: AbortSignal) {
  const res = await fetch(driveDownloadUrl(id), {
    signal,
    redirect: "follow",
    cache: "no-store",
    headers: {
      // lh3 serves link-shared files anonymously; a browser-like UA avoids the odd bot interstitial.
      "User-Agent": "Mozilla/5.0 (compatible; PrivateStockImageImport/1.0; +https://privatestock.co)",
      Accept: "image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
    },
  });
  const body = Buffer.from(await res.arrayBuffer());
  return { status: res.status, contentType: res.headers.get("content-type"), body };
}

/** Download + validate one Drive file. Never throws. */
export async function downloadDriveImage(
  id: string,
  timeoutMs = LEGACY_IMPORT_FETCH_TIMEOUT_MS,
): Promise<DownloadResult> {
  if (!id) return { ok: false, reason: "no Drive file id in image_source_url" };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchDrive(id, ctrl.signal);
    const verdict = await inspectDriveImage(res);
    if (!verdict.ok) return { ok: false, reason: verdict.reason };
    return {
      ok: true,
      buffer: res.body,
      mime: verdict.mime,
      format: verdict.format,
      width: verdict.width,
      height: verdict.height,
    };
  } catch (e) {
    if (ctrl.signal.aborted) return { ok: false, reason: `download timed out after ${Math.round(timeoutMs / 1000)} s` };
    return { ok: false, reason: `download failed: ${e instanceof Error ? e.message : String(e)}` };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------- batch */

export interface RunImportBatchOptions {
  dryRun: boolean;
  limit?: number;
  /** Include rows whose image_error already says `legacy import:` (default false). */
  retryFailed?: boolean;
  /** Wall-clock budget for the whole batch; the route passes its maxDuration. */
  budgetMs?: number;
}

export async function runImportBatch(admin: Admin, opts: RunImportBatchOptions): Promise<LegacyImportBatchResult> {
  const startedAt = Date.now();
  const limit = Math.max(1, Math.min(opts.limit ?? LEGACY_IMPORT_DEFAULT_LIMIT, 100));
  const budgetMs = opts.budgetMs ?? 300_000;
  const deadline = startedAt + budgetMs * LEGACY_IMPORT_BUDGET_SHARE;
  const dryRun = !!opts.dryRun;

  const all = await selectCandidates(admin);
  const pool = opts.retryFailed ? all : all.filter((c) => !c.previouslyFailed);
  const skippedPreviouslyFailed = all.length - pool.length;

  // The next `limit` rows, plus every candidate sharing one of their files.
  const head = pool.slice(0, limit);
  const ids = new Set(head.map((c) => c.driveId));
  const batch = pool.filter((c) => (c.driveId ? ids.has(c.driveId) : head.includes(c)));
  const groups = new Map<string, LegacyImportCandidate[]>();
  for (const c of batch) {
    const key = c.driveId || `__none__:${c.id}`;
    groups.set(key, [...(groups.get(key) ?? []), c]);
  }

  const rows: LegacyImportRowResult[] = [];
  const failed: LegacyImportFailure[] = [];
  const revalidate: RevalidateTarget[] = [];
  let filesFetched = 0;
  let stoppedEarly = false;
  let handled = 0;

  for (const [, members] of groups) {
    if (Date.now() > deadline) {
      stoppedEarly = true;
      break;
    }
    handled += members.length;
    const driveId = members[0].driveId;
    const dl = await downloadDriveImage(driveId);
    if (driveId) filesFetched++;

    if (!dl.ok) {
      for (const m of members) {
        rows.push({ productId: m.id, name: m.name, brand: m.brand, driveId, action: "process", ok: false, reason: dl.reason });
        failed.push({ productId: m.id, name: m.name, driveId, reason: dl.reason });
        if (!dryRun) await markFailed(admin, m.id, dl.reason);
      }
      continue;
    }

    const facts = { bytes: dl.buffer.byteLength, format: dl.format, width: dl.width, height: dl.height };
    if (dryRun) {
      members.forEach((m, i) =>
        rows.push({
          productId: m.id,
          name: m.name,
          brand: m.brand,
          driveId,
          action: i === 0 ? "process" : "copy",
          ok: true,
          ...facts,
        }),
      );
      continue;
    }

    // Real run: pipeline once for the first product, Storage copies for the rest.
    const [first, ...rest] = members;
    let storagePath: string | null = null;
    try {
      const stored = await storeProductImage(admin, { buffer: dl.buffer, mime: dl.mime, productId: first.id });
      storagePath = stored.storagePath;
      await markImported(admin, first.id, stored.storagePath, stored.urls[800]);
      rows.push({ productId: first.id, name: first.name, brand: first.brand, driveId, action: "process", ok: true, storagePath, ...facts });
      revalidate.push({ kind: "products", brand: first.brand, slug: first.slug });
    } catch (e) {
      const reason = describe(e);
      rows.push({ productId: first.id, name: first.name, brand: first.brand, driveId, action: "process", ok: false, reason });
      failed.push({ productId: first.id, name: first.name, driveId, reason });
      await markFailed(admin, first.id, reason);
    }

    for (const m of rest) {
      if (!storagePath) {
        const reason = "pipeline failed for the first product sharing this file";
        rows.push({ productId: m.id, name: m.name, brand: m.brand, driveId, action: "copy", ok: false, reason });
        failed.push({ productId: m.id, name: m.name, driveId, reason });
        await markFailed(admin, m.id, reason);
        continue;
      }
      try {
        const copied = await copyProductImage(admin, storagePath, m.id);
        await markImported(admin, m.id, copied.storagePath, copied.urls[800]);
        rows.push({ productId: m.id, name: m.name, brand: m.brand, driveId, action: "copy", ok: true, storagePath: copied.storagePath, ...facts });
        revalidate.push({ kind: "products", brand: m.brand, slug: m.slug });
      } catch (e) {
        const reason = describe(e);
        rows.push({ productId: m.id, name: m.name, brand: m.brand, driveId, action: "copy", ok: false, reason });
        failed.push({ productId: m.id, name: m.name, driveId, reason });
        await markFailed(admin, m.id, reason);
      }
    }
  }

  if (!dryRun && revalidate.length) revalidateFor(...revalidate);

  const succeeded = rows.filter((r) => r.ok).length;
  let remaining: number;
  if (dryRun) {
    remaining = Math.max(0, pool.length - handled);
  } else {
    const after = await selectCandidates(admin);
    remaining = (opts.retryFailed ? after : after.filter((c) => !c.previouslyFailed)).length;
  }

  return {
    dryRun,
    processed: handled,
    succeeded,
    failed,
    rows,
    filesFetched,
    remaining,
    skippedPreviouslyFailed,
    stoppedEarly,
    elapsedMs: Date.now() - startedAt,
  };
}

function describe(e: unknown): string {
  if (e instanceof ProductImageError) return e.message;
  return e instanceof Error ? e.message : String(e);
}

async function markImported(admin: Admin, id: string, storagePath: string, url800: string) {
  const { error } = await admin
    .from("catalog_products")
    .update({ image_url: url800, image_storage_path: storagePath, image_missing: false, image_error: null })
    .eq("id", id);
  if (error) throw new Error(`row update failed: ${error.message}`);
}

async function markFailed(admin: Admin, id: string, reason: string) {
  const message = `${LEGACY_IMPORT_ERROR_PREFIX}${reason}`.slice(0, 500);
  // image_url is left alone on purpose: the Drive link may still render for files that aren't actually broken.
  await admin.from("catalog_products").update({ image_error: message, image_missing: true }).eq("id", id);
}

/* ------------------------------------------------- Part C: placeholder rows */

export interface PlaceholderCounts {
  /** image_url = '/placeholders/product.png' (legacy manual rows). */
  placeholder: number;
  /** image_url empty/null but image_missing still false. */
  emptyUnflagged: number;
}

export async function countPlaceholderRows(admin: Admin): Promise<PlaceholderCounts> {
  const { data, error } = await admin
    .from("catalog_products")
    .select("id, image_url, image_missing")
    .is("image_storage_path", null);
  if (error) throw new Error(error.message);
  let placeholder = 0;
  let emptyUnflagged = 0;
  for (const r of data ?? []) {
    if (r.image_url === LEGACY_PRODUCT_PLACEHOLDER) placeholder++;
    else if (r.image_url === null && !r.image_missing) emptyUnflagged++;
    else if (r.image_url === "") emptyUnflagged++; // normalised to null + missing by the action
  }
  return { placeholder, emptyUnflagged };
}

/**
 * Placeholder rows → image_url null + image_missing true; empty-URL rows →
 * image_missing true. Only rows without a storage path are touched. Returns
 * the counts changed and revalidates the affected products.
 */
export async function markPlaceholderRowsMissing(admin: Admin): Promise<PlaceholderCounts> {
  const { data: ph, error: e1 } = await admin
    .from("catalog_products")
    .update({ image_url: null, image_missing: true })
    .eq("image_url", LEGACY_PRODUCT_PLACEHOLDER)
    .is("image_storage_path", null)
    .select("brand, slug");
  if (e1) throw new Error(e1.message);

  // Two statements rather than an `or` filter: PostgREST's `eq.` with an empty value is not reliable.
  const { data: nulls, error: e2 } = await admin
    .from("catalog_products")
    .update({ image_missing: true })
    .is("image_url", null)
    .eq("image_missing", false)
    .is("image_storage_path", null)
    .select("brand, slug");
  if (e2) throw new Error(e2.message);
  const { data: blanks, error: e3 } = await admin
    .from("catalog_products")
    .update({ image_url: null, image_missing: true })
    .eq("image_url", "")
    .is("image_storage_path", null)
    .select("brand, slug");
  if (e3) throw new Error(e3.message);
  const empties = [...(nulls ?? []), ...(blanks ?? [])];

  const targets: RevalidateTarget[] = [...(ph ?? []), ...empties].map((r) => ({
    kind: "products",
    brand: r.brand,
    slug: r.slug,
  }));
  if (targets.length) revalidateFor(...targets);
  return { placeholder: ph?.length ?? 0, emptyUnflagged: empties.length };
}

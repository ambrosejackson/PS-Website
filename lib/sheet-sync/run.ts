import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidateFor } from "@/lib/revalidate";
import type { Database } from "@/lib/database.types";
import { fetchAllTabs, type TabData } from "./fetch";
import { mapRecord, slugify, type MappedRow } from "./map";

/**
 * iHeartJane sheet → catalog_products sync (D-038, mapping I-044).
 *  - keyed on sheet_row_ref, source='sheet'
 *  - writes ONLY sheet-owned fields + synced_at/sync_status/quarantine_reason
 *  - new rows insert hidden (is_active=false); description/terp_category seeded once
 *  - bad image URL / duplicate name → sync_status='quarantined' (+reason), excluded
 *    from the site by the public queries
 *  - rows gone from the sheet → 'missing_from_sheet' + auto-hide (is_active=false),
 *    never deleted
 */

type Row = Database["public"]["Tables"]["catalog_products"]["Row"];

export interface SyncSummary {
  ok: boolean;
  startedAt: string;
  finishedAt: string;
  dryRun: boolean;
  tabs: { tab: string; rows: number; mapped: number; skipped: number }[];
  added: number;
  updated: number;
  quarantined: number;
  missing: number;
  /** Rows with no stable key (e.g. brand but no product name) — reported, not stored. */
  invalid: { tab: string; rowIndex: number; reason: string }[];
  quarantineDetails: { name: string; brand: string; reason: string }[];
  revalidated: string[];
  error?: string;
}

const SHEET_OWNED = ["name", "brand", "category", "format", "weight", "strain_type", "image_url", "image_missing"] as const;

function sheetFields(r: MappedRow) {
  return {
    name: r.name,
    brand: r.brand,
    category: r.category,
    format: r.format,
    weight: r.weight,
    strain_type: r.strainType,
    image_url: r.imageUrl,
    image_missing: r.imageMissing,
  };
}

function changed(existing: Row, r: MappedRow): boolean {
  const next = sheetFields(r) as Record<string, unknown>;
  return SHEET_OWNED.some((k) => (existing as Record<string, unknown>)[k] !== next[k]);
}

function uniqueSlug(base: string, taken: Set<string>): string {
  let s = base || "product";
  let n = 2;
  while (taken.has(s)) s = `${base}-${n++}`;
  taken.add(s);
  return s;
}

export async function runSheetSync(opts: { dryRun?: boolean } = {}): Promise<SyncSummary> {
  const startedAt = new Date().toISOString();
  const dryRun = opts.dryRun ?? false;
  const summary: SyncSummary = {
    ok: false,
    startedAt,
    finishedAt: startedAt,
    dryRun,
    tabs: [],
    added: 0,
    updated: 0,
    quarantined: 0,
    missing: 0,
    invalid: [],
    quarantineDetails: [],
    revalidated: [],
  };

  let tabs: TabData[];
  try {
    tabs = await fetchAllTabs();
  } catch (e) {
    summary.error = e instanceof Error ? e.message : "Sheet fetch failed";
    summary.finishedAt = new Date().toISOString();
    return summary;
  }

  // ---- map every tab; dedupe by sheet_row_ref (first wins, later quarantined)
  const mapped = new Map<string, MappedRow>();
  for (const t of tabs) {
    let mappedCount = 0;
    let skipped = 0;
    t.records.forEach((rec, i) => {
      const res = mapRecord(t.tab, rec, i + 2); // +2 = 1-based + header row
      if (res.kind === "skip") {
        skipped++;
        return;
      }
      if (res.kind === "invalid") {
        summary.invalid.push({ tab: res.tab, rowIndex: res.rowIndex, reason: res.reason });
        return;
      }
      mappedCount++;
      const row = res.row;
      if (mapped.has(row.sheetRowRef)) {
        // Duplicate product name within the tab: keep the first, quarantine this one under a derived key.
        const dupRef = `${row.sheetRowRef}|dup-${i + 2}`;
        mapped.set(dupRef, {
          ...row,
          sheetRowRef: dupRef,
          quarantineReason: `Duplicate of "${row.name}" in tab ${t.tab} (sheet row ${i + 2})`,
        });
        return;
      }
      mapped.set(row.sheetRowRef, row);
    });
    summary.tabs.push({ tab: t.tab, rows: t.records.length, mapped: mappedCount, skipped });
  }

  const admin = createAdminClient();
  const { data: existingAll, error: readErr } = await admin.from("catalog_products").select("*");
  if (readErr || !existingAll) {
    summary.error = readErr?.message ?? "Could not read catalog_products";
    summary.finishedAt = new Date().toISOString();
    return summary;
  }
  const takenSlugs = new Set(existingAll.map((p) => p.slug));
  const existingByRef = new Map<string, Row>();
  for (const p of existingAll) {
    if (p.source === "sheet" && p.sheet_row_ref) existingByRef.set(p.sheet_row_ref, p);
  }

  const now = new Date().toISOString();
  const touchedBrands = new Set<string>();
  const touchedDetail: { brand: string; slug: string }[] = [];
  const seenRefs = new Set<string>();

  for (const r of mapped.values()) {
    seenRefs.add(r.sheetRowRef);
    const status = r.quarantineReason ? "quarantined" : "ok";
    if (status === "quarantined") {
      summary.quarantined++;
      summary.quarantineDetails.push({ name: r.name, brand: r.brand, reason: r.quarantineReason! });
    }
    const existing = existingByRef.get(r.sheetRowRef);

    if (existing) {
      const patch = {
        ...sheetFields(r),
        synced_at: now,
        sync_status: status,
        quarantine_reason: r.quarantineReason,
      };
      const dirty =
        changed(existing, r) ||
        existing.sync_status !== status ||
        existing.quarantine_reason !== r.quarantineReason;
      if (dirty) {
        summary.updated++;
        touchedBrands.add(r.brand);
        touchedDetail.push({ brand: r.brand, slug: existing.slug });
        if (!dryRun) {
          const { error } = await admin.from("catalog_products").update(patch).eq("id", existing.id);
          if (error) {
            summary.error = `Update failed for ${r.name}: ${error.message}`;
            break;
          }
        }
      } else if (!dryRun) {
        await admin.from("catalog_products").update({ synced_at: now }).eq("id", existing.id);
      }
    } else {
      const slug = uniqueSlug(slugify(`${r.brand} ${r.name}`), takenSlugs);
      summary.added++;
      touchedBrands.add(r.brand);
      if (!dryRun) {
        const { error } = await admin.from("catalog_products").insert({
          ...sheetFields(r),
          slug,
          source: "sheet",
          sheet_row_ref: r.sheetRowRef,
          synced_at: now,
          sync_status: status,
          quarantine_reason: r.quarantineReason,
          is_active: false, // hidden until reviewed in /admin (D-038)
          description: r.description, // seeded once; admin-owned afterwards
          terp_category: r.terpCategory, // seeded once; admin-owned afterwards
        });
        if (error) {
          summary.error = `Insert failed for ${r.name}: ${error.message}`;
          break;
        }
      }
    }
  }

  // ---- rows that vanished from the sheet → missing_from_sheet + auto-hide
  if (!summary.error) {
    for (const [ref, p] of existingByRef) {
      if (seenRefs.has(ref)) continue;
      if (p.sync_status === "missing_from_sheet" && !p.is_active) continue; // already handled
      summary.missing++;
      touchedBrands.add(p.brand);
      touchedDetail.push({ brand: p.brand, slug: p.slug });
      if (!dryRun) {
        const { error } = await admin
          .from("catalog_products")
          .update({ sync_status: "missing_from_sheet", is_active: false, synced_at: now })
          .eq("id", p.id);
        if (error) {
          summary.error = `Missing-mark failed for ${p.name}: ${error.message}`;
          break;
        }
      }
    }
  }

  if (!dryRun && !summary.error && (summary.added || summary.updated || summary.missing)) {
    summary.revalidated = revalidateFor(
      ...[...touchedBrands].map((b) => ({ kind: "products" as const, brand: b })),
      ...touchedDetail.map((d) => ({ kind: "products" as const, brand: d.brand, slug: d.slug })),
    );
  }

  summary.ok = !summary.error;
  summary.finishedAt = new Date().toISOString();
  return summary;
}

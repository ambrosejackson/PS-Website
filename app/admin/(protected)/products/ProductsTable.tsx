"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BRANDS } from "@/lib/brands";
import { APPLY_IMAGE_MAX_TARGETS, productImageIsMissing, productImageUrls } from "@/lib/catalog/product-image-urls";
import { Button } from "@/components/ui/button";
import {
  duplicateProduct,
  reorderProducts,
  restoreProduct,
  setProductActive,
  setProductsActive,
  type ProductRow,
} from "./actions";

type Show = "visible" | "hidden" | "all";

function badge(text: string, tone: "grey" | "amber" | "red" | "green" | "blue") {
  const cls = {
    grey: "bg-neutral-100 text-neutral-700",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    green: "bg-green-100 text-green-800",
    blue: "bg-blue-100 text-blue-800",
  }[tone];
  return <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${cls}`}>{text}</span>;
}

/** Admin thumbnail: the 400 rendition when processed, else whatever image_url holds. */
function thumbUrl(r: ProductRow): string | null {
  if (r.image_storage_path) return productImageUrls(r.image_storage_path)[400];
  return productImageIsMissing(r) ? null : r.image_url;
}

interface ApplyResult {
  ok: boolean;
  updated?: ProductRow[];
  failed?: { id: string; error: string }[];
  error?: string;
}

export function ProductsTable({
  rows,
  storeCounts = {},
}: {
  rows: ProductRow[];
  /** Distinct stores whose menus list each (brand, strain_key) — see page.tsx. */
  storeCounts?: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [brand, setBrand] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [show, setShow] = useState<Show>("visible");
  const [imageMissing, setImageMissing] = useState(false);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyQ, setApplyQ] = useState("");
  const [applyBusy, setApplyBusy] = useState(false);
  // Optimistic local order per brand while dragging.
  const [localOrder, setLocalOrder] = useState<Record<string, string[]>>({});
  const [dragId, setDragId] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(rows.map((r) => r.category).filter((c): c is string => !!c))].sort(),
    [rows],
  );

  // Every filter except "Image missing" — its count is taken from this set so the
  // number reflects the brand / category / show / search in effect (P2 review).
  const scoped = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (brand !== "all" && r.brand !== brand) return false;
      if (category !== "all" && r.category !== category) return false;
      if (show === "visible" && !r.is_active) return false;
      if (show === "hidden" && r.is_active) return false;
      if (needle && !`${r.name} ${r.slug} ${r.category ?? ""} ${r.format ?? ""}`.toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [rows, brand, category, show, q]);

  const filtered = useMemo(
    () => (imageMissing ? scoped.filter(productImageIsMissing) : scoped),
    [scoped, imageMissing],
  );

  // Group by brand (showcase order = allowlist order), applying any optimistic order.
  const groups = useMemo(() => {
    const byBrand = new Map<string, ProductRow[]>();
    for (const r of filtered) byBrand.set(r.brand, [...(byBrand.get(r.brand) ?? []), r]);
    const ordered: { brand: string; items: ProductRow[] }[] = [];
    const names = [...BRANDS.map((b) => b.name), ...[...byBrand.keys()].filter((n) => !BRANDS.some((b) => b.name === n))];
    for (const n of names) {
      const items = byBrand.get(n);
      if (!items) continue;
      const order = localOrder[n];
      const sorted = order ? [...items].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)) : items;
      ordered.push({ brand: n, items: sorted });
    }
    return ordered;
  }, [filtered, localOrder]);

  const counts = useMemo(
    () => ({
      hidden: rows.filter((r) => !r.is_active).length,
      // Within the other active filters, not the whole catalog.
      noImage: scoped.filter(productImageIsMissing).length,
      errors: rows.filter((r) => !!r.image_error).length,
    }),
    [rows, scoped],
  );

  /** Products that can be an "Apply image from…" source: processed renditions only. */
  const sources = useMemo(() => {
    const needle = applyQ.trim().toLowerCase();
    return rows
      .filter((r) => !!r.image_storage_path)
      .filter((r) => !needle || `${r.brand} ${r.name} ${r.slug}`.toLowerCase().includes(needle))
      .slice(0, 60);
  }, [rows, applyQ]);

  // Reorder needs the whole brand list in its true order: no category / image / search filters, hidden rows included.
  const reorderEnabled = show === "all" && category === "all" && !imageMissing && !q.trim();

  function run(fn: () => Promise<{ ok: boolean; error?: string } | void>, done?: string) {
    setError(null);
    setNotice(null);
    start(async () => {
      const res = await fn();
      if (res && !res.ok) setError(res.error ?? "Something went wrong.");
      else if (done) setNotice(done);
      router.refresh();
    });
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function selectAllShown(on: boolean) {
    setSelected(on ? new Set(filtered.map((r) => r.id)) : new Set());
  }

  function onDrop(brandName: string, items: ProductRow[], targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setLocalOrder((o) => ({ ...o, [brandName]: ids }));
    setDragId(null);
    run(() => reorderProducts(brandName, ids));
  }

  function duplicate(id: string) {
    setError(null);
    start(async () => {
      const res = await duplicateProduct(id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/admin/products/${res.data.id}?created=1`);
    });
  }

  async function applyImageFrom(source: ProductRow) {
    const targets = [...selected].filter((id) => id !== source.id);
    if (!targets.length) {
      setError("Select at least one other product first.");
      return;
    }
    setApplyBusy(true);
    setError(null);
    setNotice(null);
    let updated = 0;
    const failed: { id: string; error: string }[] = [];
    try {
      for (let i = 0; i < targets.length; i += APPLY_IMAGE_MAX_TARGETS) {
        const batch = targets.slice(i, i + APPLY_IMAGE_MAX_TARGETS);
        const res = await fetch("/api/admin/products/apply-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceProductId: source.id, targetProductIds: batch }),
        });
        const data = (await res.json().catch(() => ({}))) as ApplyResult;
        if (!res.ok && !data.updated?.length) {
          failed.push(...batch.map((id) => ({ id, error: data.error ?? `HTTP ${res.status}` })));
          continue;
        }
        updated += data.updated?.length ?? 0;
        failed.push(...(data.failed ?? []));
      }
    } finally {
      setApplyBusy(false);
    }
    const byId = new Map(rows.map((r) => [r.id, r.name]));
    if (failed.length) {
      setError(
        `${failed.length} product${failed.length === 1 ? "" : "s"} failed: ` +
          failed
            .slice(0, 5)
            .map((f) => `${byId.get(f.id) ?? f.id} — ${f.error}`)
            .join("; ") +
          (failed.length > 5 ? "…" : ""),
      );
    }
    if (updated) setNotice(`Applied ${source.name}'s image to ${updated} product${updated === 1 ? "" : "s"}.`);
    setApplyOpen(false);
    setSelected(new Set());
    router.refresh();
  }

  const selectCls = "h-9 rounded-md border bg-white px-2 text-sm";
  const allShownSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded border bg-white p-3">
        <label className="text-xs text-neutral-600">
          Brand
          <select value={brand} onChange={(e) => setBrand(e.target.value)} className={`${selectCls} ml-2`}>
            <option value="all">All</option>
            {BRANDS.map((b) => (
              <option key={b.slug} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-neutral-600">
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${selectCls} ml-2`}>
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-neutral-600">
          Show
          <select value={show} onChange={(e) => setShow(e.target.value as Show)} className={`${selectCls} ml-2`}>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden ({counts.hidden})</option>
            <option value="all">All</option>
          </select>
        </label>
        <label className="flex h-9 items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={imageMissing} onChange={(e) => setImageMissing(e.target.checked)} />
          Image missing ({counts.noImage})
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name / slug / category"
          className="h-9 min-w-56 rounded-md border px-3 text-sm"
        />
        <span className="text-xs text-neutral-500">
          {filtered.length} of {rows.length}
          {counts.errors ? ` · ${counts.errors} image error${counts.errors === 1 ? "" : "s"}` : ""}
        </span>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-neutral-300 bg-neutral-50 p-3 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setProductsActive([...selected], false), "Hidden.")}>
            Hide
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setProductsActive([...selected], true), "Shown.")}>
            Show
          </Button>
          <Button size="sm" variant="outline" disabled={pending || applyBusy} onClick={() => setApplyOpen(true)}>
            Apply image from…
          </Button>
          <button type="button" className="text-xs text-neutral-500 underline" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      )}

      {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-800">{notice}</p>}
      {!reorderEnabled && (
        <p className="text-xs text-neutral-500">
          Drag-to-reorder is enabled when Show = All, Category = All, “Image missing” is off and search is empty.
        </p>
      )}

      {groups.length === 0 && (
        <p className="rounded border border-dashed p-8 text-center text-sm text-neutral-400">
          No products match these filters.
        </p>
      )}

      {groups.length > 0 && (
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={allShownSelected} onChange={(e) => selectAllShown(e.target.checked)} />
          Select all {filtered.length} shown
        </label>
      )}

      {groups.map(({ brand: brandName, items }) => (
        <div key={brandName} className="rounded border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="font-condensed text-sm font-semibold uppercase tracking-wide">{brandName}</span>
            <span className="text-xs text-neutral-500">{items.length}</span>
          </div>
          <ul className="divide-y">
            {items.map((r) => {
              const thumb = thumbUrl(r);
              const excluded = r.sync_status === "quarantined" || r.sync_status === "missing_from_sheet";
              const n = r.strain_key ? (storeCounts[`${r.brand}|${r.strain_key}`] ?? 0) : 0;
              return (
                <li
                  key={r.id}
                  draggable={reorderEnabled}
                  onDragStart={() => setDragId(r.id)}
                  onDragOver={(e) => reorderEnabled && e.preventDefault()}
                  onDrop={() => onDrop(brandName, items, r.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center ${
                    dragId === r.id ? "opacity-50" : ""
                  } ${!r.is_active ? "bg-neutral-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${r.name}`}
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                    />
                    <span
                      className={`hidden w-4 select-none text-neutral-300 md:block ${reorderEnabled ? "cursor-grab" : ""}`}
                      title={reorderEnabled ? "Drag to reorder" : ""}
                    >
                      ⋮⋮
                    </span>
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-neutral-100">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumb} alt="" loading="lazy" className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">
                          no image
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/products/${r.id}`} className="font-medium hover:underline">
                        {r.name}
                      </Link>
                      {!r.is_active && badge("hidden", "grey")}
                      {productImageIsMissing(r) && badge("no image", "amber")}
                      {r.image_storage_path && badge("processed", "green")}
                      {excluded && badge("excluded until shown", "amber")}
                      {r.is_active &&
                        badge(
                          n === 0 ? "0 stores on menu" : `${n} ${n === 1 ? "store" : "stores"} on menu`,
                          n === 0 ? "amber" : "grey",
                        )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {[r.category, r.format, r.weight, r.strain_type].filter(Boolean).join(" · ")}
                      {r.terp_category ? ` · ${r.terp_category}` : ""} · <code>{r.slug}</code>
                      {r.sort_order != null ? ` · #${r.sort_order}` : ""}
                      {r.strain_key ? ` · key ${r.strain_key}` : ""}
                    </p>
                    {r.image_error && <p className="mt-0.5 text-xs text-red-700">Image: {r.image_error}</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {r.is_active ? (
                      <button
                        type="button"
                        onClick={() => run(() => setProductActive(r.id, false))}
                        disabled={pending}
                        title="Hide from the site (nothing is deleted)"
                        className="rounded bg-green-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Shown
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => run(() => restoreProduct(r.id))}
                        disabled={pending}
                        title="Show on the site again"
                        className="rounded border border-green-600 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-green-700 hover:bg-green-50 disabled:opacity-50"
                      >
                        Restore
                      </button>
                    )}
                    <Button size="sm" variant="outline" render={<Link href={`/admin/products/${r.id}`}>Edit</Link>} />
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => duplicate(r.id)}>
                      Duplicate
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {applyOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Apply image from a product"
          onClick={() => !applyBusy && setApplyOpen(false)}
        >
          <div
            className="max-h-[85vh] w-full overflow-hidden rounded-t-lg bg-white shadow-xl md:max-w-xl md:rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="font-medium">Apply image from…</p>
                <p className="text-xs text-neutral-500">
                  Copies the chosen product&apos;s processed image to the {selected.size} selected product
                  {selected.size === 1 ? "" : "s"}.
                </p>
              </div>
              <button type="button" className="text-sm text-neutral-500" disabled={applyBusy} onClick={() => setApplyOpen(false)}>
                Close
              </button>
            </div>
            <div className="p-3">
              <input
                autoFocus
                value={applyQ}
                onChange={(e) => setApplyQ(e.target.value)}
                placeholder="Search products with a processed image"
                className="h-9 w-full rounded-md border px-3 text-sm"
              />
            </div>
            <ul className="max-h-[55vh] divide-y overflow-y-auto">
              {sources.length === 0 && (
                <li className="p-6 text-center text-sm text-neutral-400">
                  No products with a processed image yet — upload one in the editor first.
                </li>
              )}
              {sources.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={applyBusy}
                    onClick={() => applyImageFrom(s)}
                    className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbUrl(s) ?? ""} alt="" loading="lazy" className="h-12 w-12 rounded bg-neutral-100 object-contain" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.name}</span>
                      <span className="block truncate text-xs text-neutral-500">
                        {s.brand} · {[s.category, s.format, s.weight].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    {selected.has(s.id) && <span className="text-[11px] text-neutral-400">(selected — skipped)</span>}
                  </button>
                </li>
              ))}
            </ul>
            {applyBusy && <p className="border-t px-4 py-2 text-xs text-neutral-500">Copying…</p>}
          </div>
        </div>
      )}
    </div>
  );
}

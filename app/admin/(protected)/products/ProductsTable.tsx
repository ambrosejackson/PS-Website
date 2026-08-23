"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BRANDS } from "@/lib/brands";
import { Button } from "@/components/ui/button";
import { deleteProduct, reorderProducts, setProductActive, type ProductRow } from "./actions";

type Visibility = "all" | "visible" | "hidden" | "review";
type Source = "all" | "sheet" | "manual";

const PRESET_REVIEW = "review";

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

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [brand, setBrand] = useState<string>("all");
  const [source, setSource] = useState<Source>("all");
  const [visibility, setVisibility] = useState<Visibility>("all");
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  // Optimistic local order per brand while dragging.
  const [localOrder, setLocalOrder] = useState<Record<string, string[]>>({});
  const [dragId, setDragId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (brand !== "all" && r.brand !== brand) return false;
      if (source !== "all" && r.source !== source) return false;
      if (visibility === "visible" && !r.is_active) return false;
      if (visibility === "hidden" && r.is_active) return false;
      if (
        visibility === PRESET_REVIEW &&
        !(r.source === "sheet" && !r.is_active && r.sync_status !== "missing_from_sheet")
      )
        return false;
      if (needle && !`${r.name} ${r.slug} ${r.category ?? ""} ${r.format ?? ""}`.toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [rows, brand, source, visibility, q]);

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
      const sorted = order
        ? [...items].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
        : items;
      ordered.push({ brand: n, items: sorted });
    }
    return ordered;
  }, [filtered, localOrder]);

  const counts = useMemo(
    () => ({
      review: rows.filter((r) => r.source === "sheet" && !r.is_active && r.sync_status !== "missing_from_sheet").length,
      quarantined: rows.filter((r) => r.sync_status === "quarantined").length,
      missing: rows.filter((r) => r.sync_status === "missing_from_sheet").length,
    }),
    [rows],
  );

  // Reorder is only meaningful for a full, unfiltered brand list.
  const reorderEnabled = source === "all" && visibility === "all" && !q.trim();

  function toggle(r: ProductRow) {
    setError(null);
    start(async () => {
      const res = await setProductActive(r.id, !r.is_active);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    start(async () => {
      const res = await deleteProduct(id);
      if (!res.ok) setError(res.error);
      setConfirmDelete(null);
      router.refresh();
    });
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
    start(async () => {
      const res = await reorderProducts(brandName, ids);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  const selectCls = "h-9 rounded-md border bg-white px-2 text-sm";

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
          Source
          <select value={source} onChange={(e) => setSource(e.target.value as Source)} className={`${selectCls} ml-2`}>
            <option value="all">All</option>
            <option value="sheet">Sheet</option>
            <option value="manual">Manual</option>
          </select>
        </label>
        <label className="text-xs text-neutral-600">
          Visibility
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)} className={`${selectCls} ml-2`}>
            <option value="all">All</option>
            <option value="visible">Visible</option>
            <option value="hidden">Hidden</option>
            <option value={PRESET_REVIEW}>Hidden — awaiting review</option>
          </select>
        </label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name / slug / category"
          className="h-9 min-w-56 rounded-md border px-3 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            setBrand("all");
            setSource("all");
            setVisibility(PRESET_REVIEW);
            setQ("");
          }}
          className="rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
        >
          Awaiting review: {counts.review}
        </button>
        <span className="text-xs text-neutral-500">
          quarantined {counts.quarantined} · missing from sheet {counts.missing} · total {rows.length}
        </span>
      </div>

      {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {!reorderEnabled && (
        <p className="text-xs text-neutral-500">
          Drag-to-reorder is enabled when Source = All, Visibility = All and search is empty.
        </p>
      )}

      {groups.length === 0 && (
        <p className="rounded border border-dashed p-8 text-center text-sm text-neutral-400">
          No products match these filters.
        </p>
      )}

      {groups.map(({ brand: brandName, items }) => (
        <div key={brandName} className="rounded border bg-white">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="font-condensed text-sm font-semibold uppercase tracking-wide">{brandName}</span>
            <span className="text-xs text-neutral-500">{items.length}</span>
          </div>
          <ul className="divide-y">
            {items.map((r) => {
              const missingRow = r.sync_status === "missing_from_sheet";
              const quarantined = r.sync_status === "quarantined";
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
                  } ${quarantined ? "bg-red-50/40" : missingRow ? "bg-neutral-50" : ""}`}
                >
                  <span
                    className={`hidden w-4 select-none text-neutral-300 md:block ${reorderEnabled ? "cursor-grab" : ""}`}
                    title={reorderEnabled ? "Drag to reorder" : ""}
                  >
                    ⋮⋮
                  </span>
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-neutral-100">
                    {r.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.image_url} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">
                        no image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/products/${r.id}`} className="font-medium hover:underline">
                        {r.name}
                      </Link>
                      {badge(r.source === "sheet" ? "sheet" : "manual", r.source === "sheet" ? "blue" : "grey")}
                      {quarantined && badge("QUARANTINED", "red")}
                      {missingRow && badge("MISSING FROM SHEET", "amber")}
                      {r.source === "sheet" && !r.is_active && !missingRow && badge("awaiting review", "amber")}
                      {r.image_missing && badge("no image", "grey")}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {[r.category, r.format, r.weight, r.strain_type].filter(Boolean).join(" · ")}
                      {r.terp_category ? ` · ${r.terp_category}` : ""} · <code>{r.slug}</code>
                      {r.sort_order != null ? ` · #${r.sort_order}` : ""}
                    </p>
                    {quarantined && r.quarantine_reason && (
                      <p className="mt-0.5 text-xs text-red-700">{r.quarantine_reason}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggle(r)}
                      disabled={pending || quarantined}
                      title={quarantined ? "Quarantined rows are excluded from the site until the sheet is fixed" : ""}
                      className={`rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                        r.is_active
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                      } disabled:opacity-50`}
                    >
                      {r.is_active ? "Shown" : "Hidden"}
                    </button>
                    <Button size="sm" variant="outline" render={<Link href={`/admin/products/${r.id}`}>Edit</Link>} />
                    {r.source === "manual" &&
                      (confirmDelete === r.id ? (
                        <>
                          <Button size="sm" variant="destructive" disabled={pending} onClick={() => remove(r.id)}>
                            Confirm delete
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setConfirmDelete(r.id)}>
                          Delete
                        </Button>
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

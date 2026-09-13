"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CATEGORIES, categoryLabel } from "@/lib/merchCategories";
import { normalizeImages } from "@/lib/merchImages";
import { STOCK_BADGE_LABEL } from "@/lib/merchStock";
import { deleteMerch, reorderMerch, setMerchActive, type MerchRow } from "./actions";
import { FULFILLMENT_PROVIDERS, HOUSE_BRAND } from "./apparel-config";

export type ApparelListRow = MerchRow & {
  collectionName: string | null;
  variantCount: number;
  activeVariantCount: number;
  fromCents: number | null;
  badge: "sold_out" | "low_stock" | null;
};

export type CollectionFilterOption = { id: string; name: string };

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function ApparelTable({ rows, collections }: { rows: ApparelListRow[]; collections: CollectionFilterOption[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (collectionFilter === "none" && r.collection_id) return false;
        if (collectionFilter && collectionFilter !== "none" && r.collection_id !== collectionFilter) return false;
        if (categoryFilter === "none" && r.category) return false;
        if (categoryFilter && categoryFilter !== "none" && r.category !== categoryFilter) return false;
        return true;
      }),
    [rows, collectionFilter, categoryFilter],
  );
  const filtering = !!collectionFilter || !!categoryFilter;
  const items = order && !filtering ? [...filtered].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)) : filtered;

  function toggle(r: ApparelListRow) {
    setError(null);
    start(async () => {
      const res = await setMerchActive(r.id, !r.is_active);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }
  function remove(id: string) {
    setError(null);
    start(async () => {
      const res = await deleteMerch(id);
      if (!res.ok) setError(res.error);
      setConfirmDelete(null);
      router.refresh();
    });
  }
  function onDrop(targetId: string) {
    if (filtering || !dragId || dragId === targetId) return;
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setOrder(ids);
    setDragId(null);
    start(async () => {
      const res = await reorderMerch(ids);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded border border-dashed p-8 text-center text-sm text-neutral-400">
        No apparel products yet — create the first one.
      </p>
    );
  }

  const selectCls = "h-8 rounded-md border bg-white px-2 text-xs";

  return (
    <div className="space-y-3">
      {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <select value={collectionFilter} onChange={(e) => setCollectionFilter(e.target.value)} className={selectCls} aria-label="Filter by collection">
          <option value="">All collections</option>
          <option value="none">No collection</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={selectCls} aria-label="Filter by category">
          <option value="">All categories</option>
          <option value="none">No category</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500">
          {filtering ? `${items.length} of ${rows.length} · clear filters to drag-reorder` : "Drag rows to reorder (this is the storefront order)."}
        </p>
      </div>
      <ul className="divide-y rounded border bg-white">
        {items.map((r) => {
          const images = normalizeImages(r.images);
          return (
            <li
              key={r.id}
              draggable={!filtering}
              onDragStart={() => setDragId(r.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(r.id)}
              onDragEnd={() => setDragId(null)}
              className={`flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center ${dragId === r.id ? "opacity-50" : ""}`}
            >
              <span className="hidden w-4 cursor-grab select-none text-neutral-300 md:block" title="Drag to reorder">
                ⋮⋮
              </span>
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-neutral-100">
                {images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[0].url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-neutral-400">no cover</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/apparel/${r.id}`} className="font-medium hover:underline">
                    {r.name}
                  </Link>
                  {r.badge && (
                    <span className="rounded bg-neutral-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{STOCK_BADGE_LABEL[r.badge]}</span>
                  )}
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px]">{r.brand ?? HOUSE_BRAND}</span>
                  <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-800">
                    {FULFILLMENT_PROVIDERS.includes(r.fulfillment_provider as never) ? r.fulfillment_provider : "self"}
                  </span>
                  {r.collectionName ? (
                    <span className="rounded bg-violet-50 px-2 py-0.5 text-[11px] text-violet-800">{r.collectionName}</span>
                  ) : (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">no collection</span>
                  )}
                  {r.category ? (
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px]">{categoryLabel(r.category) ?? r.category}</span>
                  ) : (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800">no category — hidden from tabs</span>
                  )}
                  {r.activeVariantCount === 0 && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">no active variants — won’t be purchasable</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  <code>{r.slug}</code> · {r.variantCount} variant{r.variantCount === 1 ? "" : "s"}
                  {r.fromCents != null ? ` · from ${money(r.fromCents)}` : ""} · {images.length} image{images.length === 1 ? "" : "s"}
                  {` · released ${fmtDate(r.released_at)}`}
                  {r.sort_order != null ? ` · #${r.sort_order}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(r)}
                  disabled={pending}
                  className={`rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                    r.is_active ? "bg-green-600 text-white hover:bg-green-700" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                  } disabled:opacity-50`}
                >
                  {r.is_active ? "Active" : "Inactive"}
                </button>
                <Button size="sm" variant="outline" render={<Link href={`/admin/apparel/${r.id}`}>Edit</Link>} />
                {confirmDelete === r.id ? (
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
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {items.length === 0 && <p className="rounded border border-dashed p-6 text-center text-sm text-neutral-400">No products match these filters.</p>}
    </div>
  );
}

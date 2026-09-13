"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteCollection, setCollectionActive, type CollectionRow } from "./actions";

export type CollectionListRow = CollectionRow & { productCount: number; bannerCount: number; heroSet: boolean };

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null);

export function CollectionsTable({ rows }: { rows: CollectionListRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function toggle(r: CollectionListRow) {
    setError(null);
    start(async () => {
      const res = await setCollectionActive(r.id, !r.is_active);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }
  function remove(id: string) {
    setError(null);
    start(async () => {
      const res = await deleteCollection(id);
      if (!res.ok) setError(res.error);
      setConfirmDelete(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <ul className="divide-y rounded border bg-white">
        {rows.map((r) => {
          const isAll = r.slug === "all";
          const window = [fmt(r.starts_at), fmt(r.ends_at)];
          return (
            <li key={r.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center">
              <div className="h-14 w-11 shrink-0 overflow-hidden rounded bg-neutral-100">
                {r.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.cover_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-[9px] leading-tight text-neutral-400">{isAll ? "no cover" : "no cover"}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/apparel/collections/${r.id}`} className="font-medium hover:underline">
                    {r.name}
                  </Link>
                  {isAll && <span className="rounded bg-neutral-900 px-2 py-0.5 text-[11px] text-white">shop-all (reserved)</span>}
                  {!r.is_active && <span className="rounded bg-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600">inactive</span>}
                  {(window[0] || window[1]) && (
                    <span className="rounded bg-blue-50 px-2 py-0.5 text-[11px] text-blue-800">
                      {window[0] ?? "…"} → {window[1] ?? "…"}
                    </span>
                  )}
                  <span className={`rounded px-2 py-0.5 text-[11px] ${r.heroSet ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                    {r.heroSet ? "hero set" : "hero: placeholder"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  <code>{r.hero_page}</code> · {isAll ? "all active products" : `${r.productCount} product${r.productCount === 1 ? "" : "s"}`} · {r.bannerCount} banner
                  {r.bannerCount === 1 ? "" : "s"} · #{r.sort_order}
                  {r.tagline ? ` · “${r.tagline}”` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(r)}
                  disabled={pending || isAll}
                  title={isAll ? "The shop-all row is always active" : undefined}
                  className={`rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                    r.is_active ? "bg-green-600 text-white hover:bg-green-700" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                  } disabled:opacity-50`}
                >
                  {r.is_active ? "Active" : "Inactive"}
                </button>
                <Button size="sm" variant="outline" render={<Link href={`/admin/apparel/collections/${r.id}`}>Edit</Link>} />
                {!isAll &&
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
  );
}

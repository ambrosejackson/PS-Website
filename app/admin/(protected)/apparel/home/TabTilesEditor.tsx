"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TABS } from "@/lib/merchCategories";
import { AdminUploader } from "@/lib/admin/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteTabTile, saveTabTile, setTabTileActive, type TileRow } from "./actions";

type Draft = { image_url: string; label: string; sort_order: string; is_active: boolean; dirty: boolean };

/**
 * Category tiles on the apparel home (one per sub-nav tab): image (1:1, two
 * side-by-side on desktop — docs/MERCH-MEDIA.md), optional label override,
 * sort, active. Each row saves on its own.
 */
export function TabTilesEditor({ tiles }: { tiles: TileRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const byTab = new Map(tiles.map((t) => [t.tab, t]));
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      TABS.map((t, i) => {
        const row = byTab.get(t.slug);
        return [
          t.slug,
          {
            image_url: row?.image_url ?? "",
            label: row?.label ?? "",
            sort_order: String(row?.sort_order ?? i),
            is_active: row?.is_active ?? true,
            dirty: false,
          },
        ];
      }),
    ),
  );

  function patch(tab: string, p: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [tab]: { ...d[tab], ...p, dirty: true } }));
  }

  function save(tab: string) {
    const d = drafts[tab];
    setError(null);
    start(async () => {
      const res = await saveTabTile({ tab, image_url: d.image_url, label: d.label, sort_order: Number(d.sort_order), is_active: d.is_active });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDrafts((all) => ({ ...all, [tab]: { ...all[tab], dirty: false } }));
      router.refresh();
    });
  }

  function toggle(tab: string, active: boolean) {
    setError(null);
    patch(tab, { is_active: active });
    if (!byTab.has(tab)) return; // not saved yet — toggles ride along with Save
    setDrafts((all) => ({ ...all, [tab]: { ...all[tab], is_active: active, dirty: all[tab].dirty } }));
    start(async () => {
      const res = await setTabTileActive(tab, active);
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  function remove(tab: string) {
    setError(null);
    start(async () => {
      const res = await deleteTabTile(tab);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDrafts((all) => ({ ...all, [tab]: { image_url: "", label: "", sort_order: all[tab].sort_order, is_active: true, dirty: false } }));
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded border bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Category tiles</h2>
        <p className="mt-1 text-xs text-neutral-500">
          One tile per tab, rendered two side-by-side (near square, upload 1300×1300) below the Collections carousel, each
          linking to <code>/apparel/shop?tab=…</code>. Tabs without an image are simply not shown.
        </p>
      </div>
      {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <ul className="divide-y">
        {TABS.map((t) => {
          const d = drafts[t.slug];
          const saved = byTab.get(t.slug);
          return (
            <li key={t.slug} className="grid gap-3 py-3 md:grid-cols-[96px_1fr_auto] md:items-start">
              <div className="aspect-square w-24 overflow-hidden rounded bg-neutral-100">
                {d.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">no image</div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-condensed text-sm font-semibold uppercase tracking-wide">{t.label}</span>
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px]">?tab={t.slug}</code>
                  {saved ? (
                    <span className={`rounded px-2 py-0.5 text-[11px] ${saved.is_active ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-600"}`}>
                      {saved.is_active ? "live" : "hidden"}
                    </span>
                  ) : (
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-500">not set</span>
                  )}
                  {d.dirty && <span className="text-[11px] text-amber-700">unsaved</span>}
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
                  <Input value={d.label} onChange={(e) => patch(t.slug, { label: e.target.value })} placeholder={`Label (defaults to “${t.label}”)`} className="h-8" maxLength={60} />
                  <Input type="number" value={d.sort_order} onChange={(e) => patch(t.slug, { sort_order: e.target.value })} className="h-8" title="Sort order" />
                </div>
                <AdminUploader bucket="apparel" folder={`tiles/${t.slug}`} label="Drop tile image (1300×1300)" onUploaded={(m) => patch(t.slug, { image_url: m.url })} />
              </div>
              <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-stretch">
                <Button type="button" size="sm" disabled={pending || !d.image_url || (!d.dirty && !!saved)} onClick={() => save(t.slug)}>
                  {saved ? "Save" : "Create"}
                </Button>
                {saved && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => toggle(t.slug, !d.is_active)}
                    className={`rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${d.is_active ? "bg-green-600 text-white" : "bg-neutral-200 text-neutral-700"} disabled:opacity-50`}
                  >
                    {d.is_active ? "Active" : "Inactive"}
                  </button>
                )}
                {saved && (
                  <Button type="button" size="sm" variant="ghost" className="text-red-600" disabled={pending} onClick={() => remove(t.slug)}>
                    Remove
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

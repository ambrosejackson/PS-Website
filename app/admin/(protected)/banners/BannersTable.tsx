"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BannerForm } from "./BannerForm";
import { deleteBanner, reorderBanners, setBannerActive, type BannerRow } from "./actions";

function windowState(b: BannerRow, now: number): { label: string; tone: string } {
  const s = b.starts_at ? new Date(b.starts_at).getTime() : null;
  const e = b.ends_at ? new Date(b.ends_at).getTime() : null;
  if (!b.is_active) return { label: "inactive", tone: "bg-neutral-200 text-neutral-700" };
  if (s && now < s) return { label: `scheduled · starts ${new Date(s).toLocaleString()}`, tone: "bg-blue-100 text-blue-800" };
  if (e && now > e) return { label: `ended ${new Date(e).toLocaleString()}`, tone: "bg-neutral-200 text-neutral-700" };
  return { label: "LIVE on landing", tone: "bg-green-100 text-green-800" };
}

export function BannersTable({ rows }: { rows: BannerRow[] }) {
  const router = useRouter();
  // Snapshot "now" once on mount (lazy initializer keeps render pure).
  const [now] = useState(() => Date.now());
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const items = order ? [...rows].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)) : rows;

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Failed.");
      router.refresh();
    });
  }
  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = items.map((i) => i.id);
    ids.splice(ids.indexOf(targetId), 0, ids.splice(ids.indexOf(dragId), 1)[0]);
    setOrder(ids);
    setDragId(null);
    run(() => reorderBanners(ids));
  }

  if (rows.length === 0) return <p className="rounded border border-dashed p-6 text-sm text-neutral-400">No banners yet — add the first slide above.</p>;

  return (
    <div className="space-y-3">
      {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <p className="text-xs text-neutral-500">Drag to reorder — this is the carousel order.</p>
      <ul className="divide-y rounded border bg-white">
        {items.map((b) => {
          const st = windowState(b, now);
          return (
            <li key={b.id} className="px-4 py-3">
              <div
                draggable
                onDragStart={() => setDragId(b.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(b.id)}
                onDragEnd={() => setDragId(null)}
                className={`flex flex-col gap-3 md:flex-row md:items-center ${dragId === b.id ? "opacity-50" : ""}`}
              >
                <span className="hidden w-4 cursor-grab select-none text-neutral-300 md:block">⋮⋮</span>
                <div className="h-14 w-40 shrink-0 overflow-hidden rounded bg-neutral-100">
                  {b.media_type === "video" ? (
                    <video src={b.media_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.media_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${st.tone}`}>{st.label}</span>
                    <span className="rounded bg-neutral-100 px-2 py-0.5 font-mono text-[11px]">{b.media_type}</span>
                    {b.badge_text && <span className="rounded bg-neutral-900 px-2 py-0.5 text-[11px] text-white">{b.badge_text}</span>}
                    {b.sort_order != null && <span className="text-[11px] text-neutral-500">#{b.sort_order}</span>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {b.link_url ? `→ ${b.link_url}` : "no link"}
                    {b.starts_at || b.ends_at ? ` · window ${b.starts_at ? new Date(b.starts_at).toLocaleDateString() : "…"} → ${b.ends_at ? new Date(b.ends_at).toLocaleDateString() : "…"}` : " · always"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setBannerActive(b.id, !b.is_active))}
                    className={`rounded px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${b.is_active ? "bg-green-600 text-white" : "bg-neutral-200 text-neutral-700"}`}
                  >
                    {b.is_active ? "Active" : "Inactive"}
                  </button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(editing === b.id ? null : b.id)}>
                    {editing === b.id ? "Close" : "Edit"}
                  </Button>
                  {confirmDelete === b.id ? (
                    <>
                      <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => deleteBanner(b.id))}>
                        Confirm delete
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setConfirmDelete(b.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </div>
              {editing === b.id && (
                <div className="mt-3">
                  <BannerForm banner={b} onDone={() => setEditing(null)} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

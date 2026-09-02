"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteSocialImage, reorderSocialImages, setSocialImageActive, updateSocialImageAlt, type SocialImageRow } from "./actions";

/** Grid of strip images: drag to reorder (= marquee order), show/hide, alt text, delete. */
export function SocialImagesTable({ rows }: { rows: SocialImageRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [order, setOrder] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingAlt, setEditingAlt] = useState<{ id: string; value: string } | null>(null);
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
    run(() => reorderSocialImages(ids));
  }

  if (rows.length === 0) {
    return <p className="rounded border border-dashed p-6 text-sm text-neutral-400">No images yet — the site is showing placeholder tiles until you upload some.</p>;
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <p className="text-xs text-neutral-500">Drag to reorder — this is the order the strip scrolls in (left → right). Hidden images keep their place but don&apos;t show.</p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((r, idx) => (
          <li
            key={r.id}
            draggable
            onDragStart={() => setDragId(r.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(r.id)}
            onDragEnd={() => setDragId(null)}
            className={`rounded border bg-white p-2 ${dragId === r.id ? "opacity-50" : ""} ${r.is_active ? "" : "border-dashed"}`}
          >
            <div className="relative cursor-grab">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.image_url} alt={r.alt ?? ""} className={`aspect-[4/5] w-full rounded object-cover ${r.is_active ? "" : "opacity-40 grayscale"}`} />
              <span className="absolute top-1 left-1 rounded bg-white/90 px-1.5 text-[11px] font-semibold text-neutral-700">#{idx + 1}</span>
              <span className={`absolute top-1 right-1 rounded px-1.5 text-[11px] font-semibold ${r.is_active ? "bg-green-600 text-white" : "bg-neutral-300 text-neutral-700"}`}>
                {r.is_active ? "shown" : "hidden"}
              </span>
            </div>
            {editingAlt?.id === r.id ? (
              <form
                className="mt-2 flex gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = editingAlt.value;
                  setEditingAlt(null);
                  run(() => updateSocialImageAlt(r.id, v));
                }}
              >
                <input autoFocus value={editingAlt.value} onChange={(e) => setEditingAlt({ id: r.id, value: e.target.value })} placeholder="Alt text" className="min-w-0 flex-1 rounded border px-2 py-1 text-xs" />
                <Button size="sm" type="submit">Save</Button>
              </form>
            ) : (
              <button type="button" onClick={() => setEditingAlt({ id: r.id, value: r.alt ?? "" })} className="mt-2 block w-full truncate text-left text-[11px] text-neutral-500 hover:underline" title="Edit alt text">
                {r.alt || "add alt text"}
              </button>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => setSocialImageActive(r.id, !r.is_active))}
                className={`rounded px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${r.is_active ? "bg-neutral-200 text-neutral-700" : "bg-green-600 text-white"}`}
              >
                {r.is_active ? "Hide" : "Show"}
              </button>
              {confirmDelete === r.id ? (
                <>
                  <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => deleteSocialImage(r.id))}>Confirm</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setConfirmDelete(r.id)}>Delete</Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

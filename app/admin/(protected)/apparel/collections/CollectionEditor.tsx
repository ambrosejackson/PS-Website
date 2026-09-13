"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/sheet-sync/map";
import { AdminUploader } from "@/lib/admin/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkCollectionSlugAvailable,
  deleteCollectionBanner,
  saveCollection,
  saveCollectionBanner,
  type BannerRow,
  type CollectionRow,
} from "./actions";

/** ISO → value for <input type="datetime-local"> in the admin's local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type BannerDraft = {
  key: string;
  id?: string;
  insert_after: string;
  media_url: string;
  media_url_mobile: string;
  media_type: "image" | "video";
  link_url: string;
  alt: string;
  is_active: boolean;
  dirty: boolean;
};

const fromRow = (b: BannerRow): BannerDraft => ({
  key: b.id,
  id: b.id,
  insert_after: String(b.insert_after),
  media_url: b.media_url,
  media_url_mobile: b.media_url_mobile ?? "",
  media_type: b.media_type === "video" ? "video" : "image",
  link_url: b.link_url ?? "",
  alt: b.alt ?? "",
  is_active: b.is_active,
  dirty: false,
});

export function CollectionEditor({ collection, banners }: { collection: CollectionRow | null; banners: BannerRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const isAll = collection?.slug === "all";

  const [name, setName] = useState(collection?.name ?? "");
  const [slug, setSlug] = useState(collection?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!collection);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [tagline, setTagline] = useState(collection?.tagline ?? "");
  const [subtitle, setSubtitle] = useState(collection?.subtitle ?? "");
  const [cover, setCover] = useState(collection?.cover_image_url ?? "");
  const [isActive, setIsActive] = useState(collection?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState<string>(collection ? String(collection.sort_order) : "");
  const [startsAt, setStartsAt] = useState(toLocalInput(collection?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInput(collection?.ends_at ?? null));

  const slugTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleSlugCheck(s: string) {
    if (!s || s === collection?.slug) {
      setSlugState(s ? "ok" : "idle");
      return;
    }
    setSlugState("checking");
    if (slugTimer.current) clearTimeout(slugTimer.current);
    slugTimer.current = setTimeout(async () => {
      const free = await checkCollectionSlugAvailable(s, collection?.id);
      setSlugState(free ? "ok" : "taken");
    }, 400);
  }
  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) {
      const s = slugify(v);
      setSlug(s);
      scheduleSlugCheck(s);
    }
  }
  function onSlugChange(v: string) {
    setSlugTouched(true);
    const s = slugify(v);
    setSlug(s);
    scheduleSlugCheck(s);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (slugState === "taken") {
      setError("Slug is already in use.");
      return;
    }
    start(async () => {
      const res = await saveCollection({
        id: collection?.id,
        name,
        slug,
        tagline,
        subtitle,
        cover_image_url: cover,
        is_active: isActive,
        sort_order: sortOrder.trim() ? Number(sortOrder) : null,
        starts_at: startsAt,
        ends_at: endsAt,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (!collection) {
        router.push(`/admin/apparel/collections/${res.data.id}`);
        router.refresh();
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  // ---- banners
  const [rows, setRows] = useState<BannerDraft[]>(banners.map(fromRow));
  const [bannerError, setBannerError] = useState<string | null>(null);
  function patchBanner(key: string, p: Partial<BannerDraft>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p, dirty: true } : r)));
  }
  function addBanner() {
    const key = `new-${Date.now()}`;
    const nextAfter = rows.length ? Math.max(...rows.map((r) => Number(r.insert_after) || 0)) + 8 : 8;
    setRows((rs) => [...rs, { key, insert_after: String(nextAfter), media_url: "", media_url_mobile: "", media_type: "image", link_url: "", alt: "", is_active: true, dirty: true }]);
  }
  function saveBanner(key: string) {
    const d = rows.find((r) => r.key === key);
    if (!d || !collection) return;
    setBannerError(null);
    start(async () => {
      const res = await saveCollectionBanner({
        id: d.id,
        collection_id: collection.id,
        insert_after: Number(d.insert_after),
        media_url: d.media_url,
        media_url_mobile: d.media_url_mobile,
        media_type: d.media_type,
        link_url: d.link_url,
        alt: d.alt,
        is_active: d.is_active,
      });
      if (!res.ok) {
        setBannerError(res.error);
        return;
      }
      setRows((rs) => rs.map((r) => (r.key === key ? { ...r, id: res.data.id, key: res.data.id, dirty: false } : r)));
      router.refresh();
    });
  }
  function removeBanner(key: string) {
    const d = rows.find((r) => r.key === key);
    if (!d) return;
    if (!d.id) {
      setRows((rs) => rs.filter((r) => r.key !== key));
      return;
    }
    setBannerError(null);
    start(async () => {
      const res = await deleteCollectionBanner(d.id!);
      if (!res.ok) {
        setBannerError(res.error);
        return;
      }
      setRows((rs) => rs.filter((r) => r.key !== key));
      router.refresh();
    });
  }

  const folder = `collections/${slug || "new"}`;

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="space-y-5 rounded border bg-white p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Name</Label>
              <Input id="c-name" value={name} onChange={(e) => onNameChange(e.target.value)} required maxLength={80} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-slug">
                Slug{" "}
                {slugState === "checking" && <span className="text-xs text-neutral-500">checking…</span>}
                {slugState === "ok" && slug && <span className="text-xs text-green-700">available</span>}
                {slugState === "taken" && <span className="text-xs text-red-600">already in use</span>}
              </Label>
              <Input id="c-slug" value={slug} onChange={(e) => onSlugChange(e.target.value)} className="font-mono" disabled={isAll} />
              <p className="text-xs text-neutral-500">{isAll ? "/apparel/shop (reserved)" : `/apparel/collections/${slug || "…"}`}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-tagline">Tagline (collection page subhead)</Label>
              <Input id="c-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Shop the Look" maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-subtitle">Subtitle (carousel card)</Label>
              <Input id="c-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Collaboration" maxLength={80} disabled={isAll} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-starts">Starts (optional)</Label>
              <Input id="c-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-ends">Ends (optional)</Label>
              <Input id="c-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              <p className="text-xs text-neutral-500">Outside the window the collection drops out of the carousel and its page 404s.</p>
            </div>
          </div>
          {error && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : collection ? "Save collection" : "Create collection"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => router.push("/admin/apparel/collections")}>
              Back
            </Button>
            {saved && <span className="text-sm text-green-700">Saved and revalidated.</span>}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="space-y-3 rounded border bg-white p-4">
            <Label>Visibility</Label>
            <button
              type="button"
              disabled={isAll}
              onClick={() => setIsActive((v) => !v)}
              className={`w-full rounded px-3 py-2 text-xs font-bold uppercase tracking-wide ${isActive ? "bg-green-600 text-white" : "bg-neutral-200 text-neutral-700"} disabled:opacity-60`}
            >
              {isActive ? "Active" : "Inactive"}
            </button>
            <div className="space-y-1.5">
              <Label htmlFor="c-sort">Sort order (carousel)</Label>
              <Input id="c-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
          </div>
          {!isAll && (
            <div className="space-y-3 rounded border bg-white p-4">
              <Label>Cover (carousel card, 4:5 — upload 1200×1500)</Label>
              {cover ? (
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setCover("")} className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs text-red-600">
                    ✕
                  </button>
                </div>
              ) : (
                <p className="rounded border border-dashed p-3 text-center text-xs text-neutral-400">No cover — the collection is skipped in the carousel.</p>
              )}
              <AdminUploader bucket="apparel" folder={folder} label="Drop cover image" onUploaded={(m) => setCover(m.url)} />
            </div>
          )}
        </aside>
      </form>

      {collection ? (
        <div className="space-y-3 rounded border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Label>Interstitial banners</Label>
              <p className="mt-1 text-xs text-neutral-500">
                Full-row editorial images spliced into the grid after product N (2:1 desktop, upload 2400×1200; optional ~2:3 mobile, 1080×1620).
                The reference places them after products 8 and 16.
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addBanner}>
              + Add banner
            </Button>
          </div>
          {bannerError && <p className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">{bannerError}</p>}
          {rows.length === 0 && <p className="rounded border border-dashed p-4 text-xs text-neutral-500">No banners yet.</p>}
          <ul className="space-y-3">
            {rows.map((b) => (
              <li key={b.key} className="grid gap-3 rounded border p-3 md:grid-cols-[180px_1fr_auto]">
                <div className="space-y-2">
                  <div className="aspect-[2/1] w-full overflow-hidden rounded bg-neutral-100">
                    {b.media_url ? (
                      b.media_type === "video" ? (
                        <video src={b.media_url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.media_url} alt="" className="h-full w-full object-cover" />
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">desktop</div>
                    )}
                  </div>
                  <AdminUploader
                    bucket="banners"
                    folder={`apparel-${folder}`}
                    label="Desktop (image or MP4)"
                    onUploaded={(m) => patchBanner(b.key, { media_url: m.url, media_type: m.kind })}
                  />
                  <div className="aspect-[2/3] w-16 overflow-hidden rounded bg-neutral-100">
                    {b.media_url_mobile ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.media_url_mobile} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[9px] text-neutral-400">mobile</div>
                    )}
                  </div>
                  <AdminUploader bucket="banners" folder={`apparel-${folder}`} label="Mobile (optional image)" onUploaded={(m) => patchBanner(b.key, { media_url_mobile: m.url })} />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Insert after product #</Label>
                    <Input type="number" min={1} value={b.insert_after} onChange={(e) => patchBanner(b.key, { insert_after: e.target.value })} className="h-8 w-28" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Link (optional)</Label>
                    <Input value={b.link_url} onChange={(e) => patchBanner(b.key, { link_url: e.target.value })} placeholder="/apparel/collections/…" className="h-8 font-mono" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Alt text</Label>
                    <Input value={b.alt} onChange={(e) => patchBanner(b.key, { alt: e.target.value })} className="h-8" maxLength={160} />
                  </div>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={b.is_active} onChange={(e) => patchBanner(b.key, { is_active: e.target.checked })} /> Active
                  </label>
                  {b.dirty && <span className="text-[11px] text-amber-700">unsaved</span>}
                </div>
                <div className="flex flex-wrap gap-2 md:flex-col">
                  <Button type="button" size="sm" disabled={pending || !b.media_url || !b.dirty} onClick={() => saveBanner(b.key)}>
                    {b.id ? "Save" : "Create"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="text-red-600" disabled={pending} onClick={() => removeBanner(b.key)}>
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-neutral-500">Save the collection first to add interstitial banners.</p>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminUploader, type UploadedMedia } from "@/lib/admin/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveBanner, type BannerRow } from "./actions";

/** Create or edit one banner slide: media (banners bucket), link, badge, schedule window, active, sort. */
export function BannerForm({ banner, onDone }: { banner?: BannerRow | null; onDone?: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [media, setMedia] = useState<{ url: string; kind: "image" | "video" } | null>(
    banner ? { url: banner.media_url, kind: banner.media_type === "video" ? "video" : "image" } : null,
  );
  const [linkUrl, setLinkUrl] = useState(banner?.link_url ?? "");
  const [badge, setBadge] = useState(banner?.badge_text ?? "");
  const [startsAt, setStartsAt] = useState(toLocalInput(banner?.starts_at));
  const [endsAt, setEndsAt] = useState(toLocalInput(banner?.ends_at));
  const [isActive, setIsActive] = useState(banner?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(banner?.sort_order?.toString() ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!media) {
      setMsg({ ok: false, text: "Upload the banner image or MP4 first." });
      return;
    }
    start(async () => {
      const res = await saveBanner({
        id: banner?.id,
        mediaUrl: media.url,
        mediaType: media.kind,
        linkUrl: linkUrl || null,
        badgeText: badge || null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        isActive,
        sortOrder: sortOrder.trim() ? Number(sortOrder) : null,
      });
      if (!res.ok) {
        setMsg({ ok: false, text: res.error });
        return;
      }
      setMsg({ ok: true, text: banner ? "Saved." : "Banner added." });
      if (!banner) {
        setMedia(null);
        setLinkUrl("");
        setBadge("");
        setStartsAt("");
        setEndsAt("");
      }
      router.refresh();
      onDone?.();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded border bg-white p-5 md:grid-cols-2">
      <div className="md:col-span-2">
        <Label>Media (image ≤ 10 MB or MP4 ≤ 30 MB · renders ~4:1 on desktop, ~10:3 on mobile)</Label>
        {media && (
          <div className="mt-2 aspect-[4/1] w-full overflow-hidden rounded bg-neutral-100">
            {media.kind === "video" ? (
              <video src={media.url} muted playsInline controls className="h-full w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        )}
        <div className="mt-2">
          <AdminUploader bucket="banners" folder="landing" label={media ? "Drop a replacement" : "Drop banner image or MP4"} onUploaded={(m: UploadedMedia) => setMedia({ url: m.url, kind: m.kind })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="b-link">Link URL (optional)</Label>
        <Input id="b-link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/apparel or https://…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="b-badge">Corner badge text (optional)</Label>
        <Input id="b-badge" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="NEW DROP" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="b-start">Starts (optional)</Label>
        <Input id="b-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="b-end">Ends (optional)</Label>
        <Input id="b-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="b-sort">Sort order</Label>
        <Input id="b-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="auto" />
      </div>
      <label className="flex items-center gap-2 self-end text-sm">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <Button type="submit" disabled={pending || !media}>
          {pending ? "Saving…" : banner ? "Save changes" : "Add banner"}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
        {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

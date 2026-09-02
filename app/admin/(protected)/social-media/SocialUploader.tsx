"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shrinkImage } from "@/lib/admin/upload";
import { canFitVideo, fitVideo } from "@/lib/admin/video-fit";
import { BUCKET_RULES, mediaKindFor, validateForBucket } from "@/lib/admin/buckets";
import { createSignedUpload } from "@/lib/admin/upload-actions";
import { addSocialImages, type NewSocialTile } from "./actions";
import { SOCIAL_MAX_ACTIVE, SOCIAL_VIDEO_MAX_SECONDS } from "./config";

/**
 * Multi-file uploader for the social strip (D-064, D-068, D-069): images and
 * MP4 clips. Images are shrunk under the cap in the browser. Videos over 15 s
 * or 20 MB (or oversized) are trimmed to 15 s, muted, scaled and re-encoded to
 * H.264 in the browser via WebCodecs (lib/admin/video-fit.ts) so they always
 * land under the cap. A poster frame is captured at ~0.5 s and uploaded
 * alongside so the tile is never blank before playback. Everything is inserted
 * in ONE server action.
 */

const IMG_CAP = BUCKET_RULES.social.imageMaxBytes;
const VID_CAP = BUCKET_RULES.social.videoMaxBytes;

type Item = {
  id: string;
  file: File;
  url: string;
  kind: "image" | "video";
  state: "queued" | "checking" | "encoding" | "uploading" | "done" | "error";
  note?: string;
  seconds?: number;
  progress?: number;
};

/** Strip tiles top out at 600 px wide on desktop; 1080 on the long edge is plenty (4:5 → 864×1080). */
const VIDEO_MAX_EDGE = 1080;

const fmtMB = (n: number) => `${(n / 1048576).toFixed(1)} MB`;

/** Load metadata for an MP4 → duration in seconds (rejects on decode failure). */
function probeVideo(url: string): Promise<{ seconds: number; width: number; height: number }> {
  return new Promise((res, rej) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => res({ seconds: v.duration, width: v.videoWidth, height: v.videoHeight });
    v.onerror = () => rej(new Error("Could not read this video. Export as H.264 MP4."));
    v.src = url;
  });
}

/** Grab a frame at ~0.5 s as a webp poster (≤ 1080 px on the long edge). */
function capturePoster(url: string): Promise<Blob | null> {
  return new Promise((res) => {
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.crossOrigin = "anonymous";
    const done = (b: Blob | null) => {
      v.removeAttribute("src");
      v.load();
      res(b);
    };
    v.onerror = () => done(null);
    v.onloadeddata = () => {
      v.currentTime = Math.min(0.5, Math.max(0, v.duration - 0.05));
    };
    v.onseeked = () => {
      try {
        const scale = Math.min(1, 1080 / Math.max(v.videoWidth, v.videoHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(v.videoWidth * scale);
        c.height = Math.round(v.videoHeight * scale);
        c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
        c.toBlob((b) => done(b && b.type === "image/webp" ? b : null), "image/webp", 0.8);
      } catch {
        done(null);
      }
    };
    v.src = url;
  });
}

async function putObject(
  supabase: ReturnType<typeof createClient>,
  folder: string,
  fileName: string,
  payload: Blob,
  mime: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const slot = await createSignedUpload({ bucket: "social", folder, fileName, size: payload.size, mime });
  if (!slot.ok) return slot;
  const { error } = await supabase.storage
    .from(slot.data.bucket)
    .uploadToSignedUrl(slot.data.path, slot.data.token, payload, { contentType: mime, upsert: false, cacheControl: "31536000" });
  if (error) return { ok: false, error: error.message };
  return { ok: true, url: slot.data.publicUrl };
}

export function SocialUploader({ activeCount }: { activeCount: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const room = Math.max(0, SOCIAL_MAX_ACTIVE - activeCount);

  // Patch by id — items are replaced on every state update, so identity comparison would miss.
  const patch = (it: Item, p: Partial<Item>) => setItems((cur) => cur.map((c) => (c.id === it.id ? { ...c, ...p } : c)));

  async function choose(list: FileList | null) {
    if (!list) return;
    setMsg(null);
    const next: Item[] = [];
    for (const file of Array.from(list)) {
      const kind = mediaKindFor("social", file.type);
      const url = URL.createObjectURL(file);
      const id = crypto.randomUUID();
      if (!kind) {
        next.push({ id, file, url, kind: "image", state: "error", note: `Unsupported type ${file.type || "(unknown)"} — JPG, PNG, WEBP or MP4.` });
        continue;
      }
      if (kind === "image") {
        next.push({ id, file, url, kind, state: "queued", note: file.size > IMG_CAP ? `${fmtMB(file.size)} — will be resized` : undefined });
        continue;
      }
      // Video: probed below; anything over the limits gets trimmed / re-encoded at upload (D-069).
      next.push({ id, file, url, kind, state: "checking" });
    }
    setItems((cur) => [...cur, ...next]);
    // Probe videos after they're in the list so the UI shows "checking".
    for (const it of next) {
      if (it.kind !== "video" || it.state !== "checking") continue;
      try {
        const meta = await probeVideo(it.url);
        const tooLong = meta.seconds > SOCIAL_VIDEO_MAX_SECONDS + 0.25;
        const tooBig = it.file.size > VID_CAP;
        const tooLarge = Math.max(meta.width, meta.height) > VIDEO_MAX_EDGE;
        const needsFit = tooLong || tooBig || tooLarge;
        if (needsFit && !canFitVideo()) {
          patch(it, {
            state: "error",
            seconds: meta.seconds,
            note: `${meta.seconds.toFixed(1)} s · ${fmtMB(it.file.size)} — over the limits and this browser can't re-encode video. Use Chrome or Edge, or trim to ≤ ${SOCIAL_VIDEO_MAX_SECONDS} s first.`,
          });
        } else {
          const plan = [tooLong ? `trim to ${SOCIAL_VIDEO_MAX_SECONDS} s` : null, tooBig || tooLarge ? "compress" : null].filter(Boolean).join(" + ");
          patch(it, {
            state: "queued",
            seconds: meta.seconds,
            note: `${meta.seconds.toFixed(1)} s · ${fmtMB(it.file.size)}${plan ? ` — will ${plan}` : ""}`,
          });
        }
      } catch (e) {
        patch(it, { state: "error", note: e instanceof Error ? e.message : "Could not read video." });
      }
    }
  }

  async function uploadAll() {
    const queued = items.filter((i) => i.state === "queued");
    if (queued.length === 0) return;
    if (queued.length > room) {
      setMsg({ ok: false, text: `Only ${room} more active tile${room === 1 ? "" : "s"} allowed (cap ${SOCIAL_MAX_ACTIVE}). Remove some from the queue or hide existing ones.` });
      return;
    }
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const tiles: NewSocialTile[] = [];
    for (const it of queued) {
      patch(it, { state: "uploading" });
      if (it.kind === "image") {
        let payload: Blob = it.file;
        let mime = it.file.type;
        let fileName = it.file.name;
        // Strip tiles are ≤ 600 px wide on desktop; 2000 px long edge is plenty.
        const r = await shrinkImage(it.file, { maxBytes: IMG_CAP, maxEdge: 2000 });
        if (r.converted) {
          payload = r.blob;
          mime = r.mime;
          fileName = it.file.name.replace(/\.(png|jpe?g|webp)$/i, "") + (r.mime === "image/jpeg" ? ".jpg" : ".webp");
        }
        const tooBig = validateForBucket("social", mime, payload.size);
        if (tooBig) {
          patch(it, { state: "error", note: tooBig });
          continue;
        }
        const up = await putObject(supabase, "strip", fileName, payload, mime);
        if (!up.ok) {
          patch(it, { state: "error", note: up.error });
          continue;
        }
        tiles.push({ url: up.url, mediaType: "image" });
      } else {
        let payload: Blob = it.file;
        let previewUrl = it.url;
        try {
          patch(it, { state: "encoding", progress: 0 });
          const fit = await fitVideo(it.file, {
            maxSeconds: SOCIAL_VIDEO_MAX_SECONDS,
            maxBytes: VID_CAP,
            maxEdge: VIDEO_MAX_EDGE,
            onProgress: (p) => patch(it, { progress: p }),
          });
          payload = fit.blob;
          if (!fit.passthrough) {
            previewUrl = URL.createObjectURL(fit.blob);
            patch(it, { note: `${fit.seconds.toFixed(1)} s · ${fmtMB(fit.blob.size)}${fit.trimmed ? " (trimmed)" : ""} · ${fit.width}×${fit.height}` });
          }
        } catch (e) {
          patch(it, { state: "error", note: e instanceof Error ? e.message : "Re-encode failed." });
          continue;
        }
        const tooBig = validateForBucket("social", "video/mp4", payload.size);
        if (tooBig) {
          patch(it, { state: "error", note: tooBig });
          continue;
        }
        patch(it, { state: "uploading" });
        const up = await putObject(supabase, "strip", it.file.name.replace(/\.[^.]+$/, "") + ".mp4", payload, "video/mp4");
        if (!up.ok) {
          patch(it, { state: "error", note: up.error });
          continue;
        }
        let posterUrl: string | null = null;
        const poster = await capturePoster(previewUrl);
        if (poster) {
          const pu = await putObject(supabase, "posters", it.file.name.replace(/\.mp4$/i, "") + "-poster.webp", poster, "image/webp");
          if (pu.ok) posterUrl = pu.url;
        }
        tiles.push({ url: up.url, mediaType: "video", posterUrl });
      }
      patch(it, { state: "done" });
    }
    if (tiles.length > 0) {
      const res = await addSocialImages(tiles);
      setMsg(res.ok ? { ok: true, text: `Added ${res.data.added} tile${res.data.added === 1 ? "" : "s"}. Add Instagram links below.` } : { ok: false, text: res.error });
      if (res.ok) {
        setItems((cur) => cur.filter((c) => c.state !== "done"));
        router.refresh();
      }
    }
    setBusy(false);
  }

  const queuedCount = items.filter((i) => i.state === "queued").length;
  const checking = items.some((i) => i.state === "checking");

  return (
    <div className="space-y-3 rounded border bg-white p-5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!busy) void choose(e.dataTransfer.files);
        }}
        className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed p-4 text-center text-sm ${dragOver ? "border-neutral-900 bg-neutral-100" : "border-neutral-300"} ${busy ? "cursor-wait opacity-70" : ""}`}
      >
        <span className="font-medium text-neutral-800">Drop images or MP4 clips here, or click to choose (multiple OK)</span>
        <span className="text-xs text-neutral-500">
          Images resized automatically · MP4s trimmed to {SOCIAL_VIDEO_MAX_SECONDS} s and compressed under {Math.round(VID_CAP / 1048576)} MB automatically, play muted · 4:5 portrait looks best · {room} of {SOCIAL_MAX_ACTIVE} active slots free
        </span>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4" multiple className="hidden" disabled={busy} onChange={(e) => void choose(e.target.files)} />
      </div>

      {items.length > 0 && (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {items.map((it, i) => (
            <li key={it.id} className="relative">
              {it.kind === "video" ? (
                <video src={it.url} muted playsInline preload="metadata" className={`aspect-[4/5] w-full rounded bg-black object-cover ${it.state === "error" ? "opacity-40" : ""}`} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.url} alt="" className={`aspect-[4/5] w-full rounded object-cover ${it.state === "error" ? "opacity-40" : ""}`} />
              )}
              <span className={`absolute bottom-1 left-1 rounded px-1 text-[10px] font-semibold ${it.state === "error" ? "bg-red-600 text-white" : it.state === "done" ? "bg-green-600 text-white" : it.state === "uploading" || it.state === "checking" || it.state === "encoding" ? "bg-amber-500 text-white" : "bg-white/90 text-neutral-700"}`}>
                {it.kind === "video" ? "▶ " : ""}
                {it.state === "encoding" ? `encoding ${Math.round((it.progress ?? 0) * 100)}%` : it.state}
              </span>
              {!busy && it.state !== "done" && (
                <button type="button" aria-label="Remove" onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))} className="absolute top-1 right-1 rounded bg-white/90 px-1 text-[11px] leading-4 text-neutral-700">
                  ×
                </button>
              )}
              {it.note && <p className={`mt-0.5 truncate text-[10px] ${it.state === "error" ? "text-red-600" : "text-amber-700"}`} title={it.note}>{it.note}</p>}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={uploadAll}
          disabled={busy || checking || queuedCount === 0}
          className="rounded bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          {busy ? "Uploading…" : checking ? "Checking videos…" : `Upload ${queuedCount || ""} ${queuedCount === 1 ? "tile" : "tiles"}`}
        </button>
        {items.length > 0 && !busy && (
          <button type="button" onClick={() => setItems([])} className="text-xs text-neutral-500 underline">
            Clear queue
          </button>
        )}
        {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}

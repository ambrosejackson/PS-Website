"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shrinkImage } from "@/lib/admin/upload";
import { BUCKET_RULES, validateForBucket } from "@/lib/admin/buckets";
import { createSignedUpload } from "@/lib/admin/upload-actions";
import { addSocialImages } from "./actions";
import { SOCIAL_MAX_ACTIVE } from "./config";

/**
 * Multi-file uploader for the social strip: pick/drop up to 50 images at once,
 * each converted to webp (same rules as AdminUploader), uploaded to `social`,
 * then inserted as active rows at the end of the order in ONE server action.
 */

const SOCIAL_CAP = BUCKET_RULES.social.imageMaxBytes;

type Item = { file: File; url: string; state: "queued" | "uploading" | "done" | "error"; note?: string };

export function SocialUploader({ activeCount }: { activeCount: number }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const room = Math.max(0, SOCIAL_MAX_ACTIVE - activeCount);

  function choose(list: FileList | null) {
    if (!list) return;
    const next: Item[] = [];
    for (const file of Array.from(list)) {
      // MIME only — oversize images are shrunk automatically at upload (D-066).
      const problem = validateForBucket("social", file.type, 1);
      const note = problem ?? (file.size > SOCIAL_CAP ? `${(file.size / 1048576).toFixed(1)} MB — will be resized` : undefined);
      next.push({ file, url: URL.createObjectURL(file), state: problem ? "error" : "queued", note });
    }
    setMsg(null);
    setItems((cur) => [...cur, ...next]);
  }

  async function uploadAll() {
    const queued = items.filter((i) => i.state === "queued");
    if (queued.length === 0) return;
    if (queued.length > room) {
      setMsg({ ok: false, text: `Only ${room} more active image${room === 1 ? "" : "s"} allowed (cap ${SOCIAL_MAX_ACTIVE}). Remove some from the queue or hide existing ones.` });
      return;
    }
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    const urls: string[] = [];
    for (const it of queued) {
      setItems((cur) => cur.map((c) => (c === it ? { ...c, state: "uploading" } : c)));
      let payload: Blob = it.file;
      let mime = it.file.type;
      let fileName = it.file.name;
      // Strip tiles are 208 px wide and the lightbox tops out ~800 px tall — 2000 px long edge is plenty.
      const r = await shrinkImage(it.file, { maxBytes: SOCIAL_CAP, maxEdge: 2000 });
      if (r.converted) {
        payload = r.blob;
        mime = r.mime;
        fileName = it.file.name.replace(/\.(png|jpe?g|webp)$/i, "") + (r.mime === "image/jpeg" ? ".jpg" : ".webp");
      }
      const tooBig = validateForBucket("social", mime, payload.size);
      if (tooBig) {
        setItems((cur) => cur.map((c) => (c === it ? { ...c, state: "error", note: tooBig } : c)));
        continue;
      }
      const slot = await createSignedUpload({ bucket: "social", folder: "strip", fileName, size: payload.size, mime });
      if (!slot.ok) {
        setItems((cur) => cur.map((c) => (c === it ? { ...c, state: "error", note: slot.error } : c)));
        continue;
      }
      const { error } = await supabase.storage
        .from(slot.data.bucket)
        .uploadToSignedUrl(slot.data.path, slot.data.token, payload, { contentType: mime, upsert: false, cacheControl: "31536000" });
      if (error) {
        setItems((cur) => cur.map((c) => (c === it ? { ...c, state: "error", note: error.message } : c)));
        continue;
      }
      urls.push(slot.data.publicUrl);
      setItems((cur) => cur.map((c) => (c === it ? { ...c, state: "done" } : c)));
    }
    if (urls.length > 0) {
      const res = await addSocialImages(urls);
      setMsg(res.ok ? { ok: true, text: `Added ${res.data.added} image${res.data.added === 1 ? "" : "s"}.` } : { ok: false, text: res.error });
      if (res.ok) {
        setItems((cur) => cur.filter((c) => c.state !== "done"));
        router.refresh();
      }
    }
    setBusy(false);
  }

  const queuedCount = items.filter((i) => i.state === "queued").length;

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
          if (!busy) choose(e.dataTransfer.files);
        }}
        className={`flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed p-4 text-center text-sm ${dragOver ? "border-neutral-900 bg-neutral-100" : "border-neutral-300"} ${busy ? "cursor-wait opacity-70" : ""}`}
      >
        <span className="font-medium text-neutral-800">Drop images here or click to choose (multiple OK)</span>
        <span className="text-xs text-neutral-500">
          JPG / PNG / WEBP · big files are resized automatically · 4:5 portrait looks best · {room} of {SOCIAL_MAX_ACTIVE} active slots free
        </span>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={busy} onChange={(e) => choose(e.target.files)} />
      </div>

      {items.length > 0 && (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {items.map((it, i) => (
            <li key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.url} alt="" className={`aspect-[4/5] w-full rounded object-cover ${it.state === "error" ? "opacity-40" : ""}`} />
              <span className={`absolute bottom-1 left-1 rounded px-1 text-[10px] font-semibold ${it.state === "error" ? "bg-red-600 text-white" : it.state === "done" ? "bg-green-600 text-white" : it.state === "uploading" ? "bg-amber-500 text-white" : "bg-white/90 text-neutral-700"}`}>
                {it.state}
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
          disabled={busy || queuedCount === 0}
          className="rounded bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-neutral-700 disabled:opacity-40"
        >
          {busy ? "Uploading…" : `Upload ${queuedCount || ""} ${queuedCount === 1 ? "image" : "images"}`}
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

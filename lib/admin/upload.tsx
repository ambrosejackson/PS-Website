"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  acceptFor,
  BUCKET_RULES,
  mediaKindFor,
  validateForBucket,
  WEBP_CONVERT_THRESHOLD_BYTES,
  WEBP_QUALITY,
  type AdminBucket,
  type MediaKind,
} from "@/lib/admin/buckets";
import { createSignedUpload } from "@/lib/admin/upload-actions";

/**
 * The one admin uploader. Drag-drop or click → preview → validate against the
 * target bucket's rules (lib/admin/buckets.ts) → images downscaled/re-encoded in
 * the browser until under the bucket cap (shrinkImage, D-066) → signed-URL
 * upload straight to Storage → returns
 * the public URL via `onUploaded`. Videos (heroes/banners) skip conversion and
 * must be video/mp4 under the bucket's cap.
 */

export interface UploadedMedia {
  url: string;
  bucket: AdminBucket;
  path: string;
  kind: MediaKind;
  mime: string;
  bytes: number;
  /** True when the original was transcoded to webp before upload. */
  converted: boolean;
}

type Status =
  | { phase: "idle" }
  | { phase: "preview"; file: File; url: string; kind: MediaKind; note?: string }
  | { phase: "working"; step: string; url?: string }
  | { phase: "done"; media: UploadedMedia }
  | { phase: "error"; message: string; file?: File; url?: string };

function fmtMB(n: number) {
  return `${(n / 1048576).toFixed(1)} MB`;
}

/**
 * Fit an image under a byte cap (D-066). Decodes, downscales to `maxEdge` px on
 * the long side, encodes webp q80, then steps quality (→0.5) and dimensions
 * (×0.8) until the result is ≤ maxBytes. Returns the original untouched only
 * when it is already small enough and no downscale was needed. Browsers that
 * can't encode webp (old Safari) fall back to JPEG so oversize files still
 * shrink.
 */
export async function shrinkImage(
  file: File,
  opts: { maxBytes: number; maxEdge?: number },
): Promise<{ blob: Blob; mime: string; converted: boolean; width: number; height: number }> {
  const maxEdge = opts.maxEdge ?? 4000;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { blob: file, mime: file.type, converted: false, width: 0, height: 0 };
  }
  const long = Math.max(bitmap.width, bitmap.height);
  let scale = Math.min(1, maxEdge / long);
  const needsWork = file.size > opts.maxBytes || scale < 1 || (file.type !== "image/webp" && file.size > WEBP_CONVERT_THRESHOLD_BYTES);
  if (!needsWork) {
    bitmap.close();
    return { blob: file, mime: file.type, converted: false, width: bitmap.width, height: bitmap.height };
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return { blob: file, mime: file.type, converted: false, width: bitmap.width, height: bitmap.height };
  }
  const encode = (mime: string, q: number) =>
    new Promise<Blob | null>((res) => {
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(res, mime, q);
    });

  let mime = "image/webp";
  let quality = WEBP_QUALITY;
  let blob = await encode(mime, quality);
  if (!blob || blob.type !== mime) {
    mime = "image/jpeg"; // Safari < 17: no webp encoder
    blob = await encode(mime, quality);
  }
  for (let i = 0; blob && blob.size > opts.maxBytes && i < 8; i++) {
    if (quality > 0.5) quality = Math.round((quality - 0.1) * 10) / 10;
    else scale *= 0.8;
    blob = await encode(mime, quality);
  }
  const width = canvas.width;
  const height = canvas.height;
  bitmap.close();
  if (!blob) return { blob: file, mime: file.type, converted: false, width, height };
  // Only keep the re-encode if it actually helped (or the original was over cap / oversized).
  if (blob.size >= file.size && file.size <= opts.maxBytes && scale === 1) {
    return { blob: file, mime: file.type, converted: false, width, height };
  }
  return { blob, mime, converted: true, width, height };
}

/** @deprecated use shrinkImage — kept for callers that only want the webp re-encode. */
export async function toWebp(file: File): Promise<{ blob: Blob; converted: boolean }> {
  const r = await shrinkImage(file, { maxBytes: Number.MAX_SAFE_INTEGER });
  return { blob: r.blob, converted: r.converted };
}

export function AdminUploader({
  bucket,
  folder,
  label = "Drop a file here or click to choose",
  onUploaded,
  className = "",
  disabled = false,
}: {
  bucket: AdminBucket;
  /** Optional sub-folder inside the bucket (e.g. "terpkings" or a product id). */
  folder?: string;
  label?: string;
  onUploaded: (media: UploadedMedia) => void;
  className?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>({ phase: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const rules = BUCKET_RULES[bucket];
  const busy = status.phase === "working" || disabled;

  const choose = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      const kind = mediaKindFor(bucket, file.type);
      // Images: MIME check only here — size is enforced AFTER shrinkImage (D-066).
      const problem = kind === "image" ? validateForBucket(bucket, file.type, 1) : validateForBucket(bucket, file.type, file.size);
      if (problem || !kind) {
        setStatus({ phase: "error", message: problem ?? "Unsupported file." });
        return;
      }
      const url = URL.createObjectURL(file);
      const cap = BUCKET_RULES[bucket].imageMaxBytes;
      const willShrink = kind === "image" && file.size > cap;
      const willConvert =
        kind === "image" &&
        !willShrink &&
        file.type !== "image/webp" &&
        file.size > WEBP_CONVERT_THRESHOLD_BYTES;
      setStatus({
        phase: "preview",
        file,
        url,
        kind,
        note: willShrink
          ? `${fmtMB(file.size)} is over the ${Math.round(cap / 1048576)} MB cap — will be resized automatically before upload.`
          : willConvert
            ? "Will be converted to webp (q80) before upload."
            : undefined,
      });
    },
    [bucket],
  );

  async function upload() {
    if (status.phase !== "preview") return;
    const { file, url, kind } = status;

    let payload: Blob = file;
    let mime = file.type;
    let fileName = file.name;
    let converted = false;

    if (kind === "image") {
      const cap = BUCKET_RULES[bucket].imageMaxBytes;
      setStatus({ phase: "working", step: file.size > cap ? "Resizing to fit under the cap…" : "Optimizing image…", url });
      const r = await shrinkImage(file, { maxBytes: cap });
      if (r.converted) {
        payload = r.blob;
        mime = r.mime;
        fileName = file.name.replace(/\.(png|jpe?g|webp)$/i, "") + (r.mime === "image/jpeg" ? ".jpg" : ".webp");
        converted = true;
      }
    }

    // Re-validate the (possibly converted) payload.
    const problem = validateForBucket(bucket, mime, payload.size);
    if (problem) {
      setStatus({ phase: "error", message: problem, file, url });
      return;
    }

    setStatus({ phase: "working", step: "Requesting upload slot…", url });
    const slot = await createSignedUpload({
      bucket,
      folder,
      fileName,
      size: payload.size,
      mime,
    });
    if (!slot.ok) {
      setStatus({ phase: "error", message: slot.error, file, url });
      return;
    }

    setStatus({
      phase: "working",
      step: `Uploading ${fmtMB(payload.size)}${kind === "video" ? " (videos can take a minute)" : ""}…`,
      url,
    });
    const supabase = createClient();
    const { error } = await supabase.storage
      .from(slot.data.bucket)
      .uploadToSignedUrl(slot.data.path, slot.data.token, payload, {
        contentType: mime,
        upsert: false,
        // Filenames are timestamped + immutable — cache for a year (D-054).
        cacheControl: "31536000",
      });
    if (error) {
      setStatus({ phase: "error", message: `Upload failed: ${error.message}`, file, url });
      return;
    }

    const media: UploadedMedia = {
      url: slot.data.publicUrl,
      bucket: slot.data.bucket,
      path: slot.data.path,
      kind,
      mime,
      bytes: payload.size,
      converted,
    };
    setStatus({ phase: "done", media });
    onUploaded(media);
  }

  function reset() {
    if (inputRef.current) inputRef.current.value = "";
    setStatus({ phase: "idle" });
  }

  const previewUrl =
    status.phase === "preview" || status.phase === "working" || status.phase === "error"
      ? status.url
      : status.phase === "done"
        ? status.media.url
        : undefined;
  const previewKind: MediaKind | undefined =
    status.phase === "preview" ? status.kind : status.phase === "done" ? status.media.kind : undefined;

  const caps = [
    `images ≤ ${Math.round(rules.imageMaxBytes / 1048576)} MB`,
    rules.videoMime.length ? `mp4 ≤ ${Math.round(rules.videoMaxBytes / 1048576)} MB` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`space-y-3 ${className}`}>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !busy) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!busy) choose(e.dataTransfer.files?.[0]);
        }}
        className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed p-4 text-center text-sm transition-colors ${
          dragOver ? "border-neutral-900 bg-neutral-100" : "border-neutral-300 bg-white"
        } ${busy ? "cursor-wait opacity-70" : ""}`}
      >
        {previewUrl ? (
          previewKind === "video" ? (
            <video src={previewUrl} muted playsInline controls className="max-h-48 rounded" />
          ) : (
            // Object URL / freshly uploaded asset — plain img by design.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="max-h-48 rounded object-contain" />
          )
        ) : (
          <>
            <span className="font-medium text-neutral-800">{label}</span>
            <span className="text-xs text-neutral-500">
              bucket <code>{bucket}</code> · {caps}
              {rules.videoMime.length ? "" : " · images only"}
            </span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={acceptFor(bucket)}
          className="hidden"
          disabled={busy}
          onChange={(e) => choose(e.target.files?.[0])}
        />
      </div>

      {status.phase === "preview" && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-neutral-600">
            {status.file.name} · {fmtMB(status.file.size)} · {status.file.type}
          </span>
          {status.note && <span className="text-xs text-amber-700">{status.note}</span>}
          <button
            type="button"
            onClick={upload}
            className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white hover:bg-neutral-700"
          >
            Upload
          </button>
          <button type="button" onClick={reset} className="text-xs text-neutral-500 underline">
            Clear
          </button>
        </div>
      )}
      {status.phase === "working" && <p className="text-sm text-neutral-600">{status.step}</p>}
      {status.phase === "done" && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-green-700">
            Uploaded{status.media.converted ? " (resized/optimized)" : ""} · {fmtMB(status.media.bytes)}
          </span>
          <a
            href={status.media.url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs text-neutral-500 underline"
          >
            {status.media.url}
          </a>
          <button type="button" onClick={reset} className="text-xs text-neutral-500 underline">
            Upload another
          </button>
        </div>
      )}
      {status.phase === "error" && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-red-600">{status.message}</span>
          <button type="button" onClick={reset} className="text-xs text-neutral-500 underline">
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

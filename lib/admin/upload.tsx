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
 * target bucket's rules (lib/admin/buckets.ts) → PNG/JPG over 300 KB re-encoded
 * to webp q80 in the browser → signed-URL upload straight to Storage → returns
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

/** Re-encode a PNG/JPEG File to webp (q80) via canvas. Falls back to the original if the browser can't encode webp. */
export async function toWebp(file: File): Promise<{ blob: Blob; converted: boolean }> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { blob: file, converted: false };
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/webp", WEBP_QUALITY),
    );
    // Safari < 17 returns a PNG here — keep the original in that case.
    if (!blob || blob.type !== "image/webp") return { blob: file, converted: false };
    // Never upload something larger than what we started with.
    if (blob.size >= file.size) return { blob: file, converted: false };
    return { blob, converted: true };
  } catch {
    return { blob: file, converted: false };
  }
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
      const problem = validateForBucket(bucket, file.type, file.size);
      if (problem) {
        setStatus({ phase: "error", message: problem });
        return;
      }
      const kind = mediaKindFor(bucket, file.type)!;
      const url = URL.createObjectURL(file);
      const willConvert =
        kind === "image" &&
        file.type !== "image/webp" &&
        file.size > WEBP_CONVERT_THRESHOLD_BYTES;
      setStatus({
        phase: "preview",
        file,
        url,
        kind,
        note: willConvert ? "Will be converted to webp (q80) before upload." : undefined,
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

    if (kind === "image" && mime !== "image/webp" && file.size > WEBP_CONVERT_THRESHOLD_BYTES) {
      setStatus({ phase: "working", step: "Converting to webp…", url });
      const r = await toWebp(file);
      if (r.converted) {
        payload = r.blob;
        mime = "image/webp";
        fileName = file.name.replace(/\.(png|jpe?g)$/i, "") + ".webp";
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
            Uploaded{status.media.converted ? " (converted to webp)" : ""} · {fmtMB(status.media.bytes)}
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

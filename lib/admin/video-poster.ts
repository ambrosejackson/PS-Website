"use client";

import { createClient } from "@/lib/supabase/client";
import { createSignedUpload } from "@/lib/admin/upload-actions";
import type { AdminBucket } from "@/lib/admin/buckets";

/**
 * First-frame poster for video heroes (loading experience): load the uploaded
 * MP4 in a detached <video>, seek just past 0 so the frame is decoded, draw it
 * to a canvas, encode webp. Needs CORS on the video (Supabase Storage public
 * objects send `Access-Control-Allow-Origin: *`).
 */
export async function capturePosterBlob(videoUrl: string, maxWidth = 1920): Promise<Blob> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    const fail = () => reject(new Error("Could not load the video to capture a poster."));
    video.addEventListener("loadeddata", () => resolve(), { once: true });
    video.addEventListener("error", fail, { once: true });
    setTimeout(() => reject(new Error("Timed out loading the video.")), 30000);
    video.load();
  });
  // Seek a hair past 0 so we get a decoded, non-black first frame.
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    video.addEventListener("seeked", done, { once: true });
    try {
      video.currentTime = Math.min(0.1, Math.max(0, (video.duration || 1) / 10));
    } catch {
      done();
    }
    setTimeout(done, 3000);
  });

  const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
  const w = Math.max(1, Math.round((video.videoWidth || 1280) * scale));
  const h = Math.max(1, Math.round((video.videoHeight || 720) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.drawImage(video, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.82));
  if (!blob) throw new Error("Could not encode the poster (browser can't write webp?).");
  video.removeAttribute("src");
  video.load();
  return blob;
}

/** Upload a blob to an admin bucket via the signed-URL flow; returns the public URL. */
export async function uploadBlobToBucket(bucket: AdminBucket, folder: string, fileName: string, blob: Blob): Promise<string> {
  const slot = await createSignedUpload({ bucket, folder, fileName, size: blob.size, mime: blob.type });
  if (!slot.ok) throw new Error(slot.error);
  const supabase = createClient();
  const { error } = await supabase.storage.from(slot.data.bucket).uploadToSignedUrl(slot.data.path, slot.data.token, blob, {
    contentType: blob.type,
    upsert: false,
    // Filenames are timestamped + immutable — cache for a year (D-054).
    cacheControl: "31536000",
  });
  if (error) throw new Error(error.message);
  return slot.data.publicUrl;
}

/** Capture + upload in one go; returns the poster's public URL. */
export async function generateAndUploadPoster(videoUrl: string, folder: string): Promise<string> {
  const blob = await capturePosterBlob(videoUrl);
  return uploadBlobToBucket("heroes", folder, "poster.webp", blob);
}

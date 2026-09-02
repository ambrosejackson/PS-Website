"use client";

/**
 * Fit an MP4 for the social strip entirely in the browser (D-069): trim to the
 * first `maxSeconds`, drop audio (the strip mutes anyway), scale to `maxEdge`
 * on the long side, and encode H.264 at a bitrate chosen so the result lands
 * under `maxBytes`. Verified headless: 40 s / 25 MB / 1080×1350 → 15 s / 4 MB /
 * 864×1080 in ~10 s (software VP9). Uses WebCodecs via mediabunny — hardware-accelerated in
 * Chrome/Edge, Safari 16.4+, Firefox 130+. Loaded lazily so the admin bundle
 * doesn't carry it until a video is actually queued.
 */

export interface FitVideoResult {
  blob: Blob;
  seconds: number;
  trimmed: boolean;
  width: number;
  height: number;
  /** True when the original was already within every limit and is returned untouched. */
  passthrough: boolean;
}

/** Leave headroom under the cap: container overhead + encoder bitrate is a target, not a ceiling. */
const HEADROOM = 0.8;
const MAX_VIDEO_BITRATE = 6_000_000; // ≈ 11 MB for 15 s — plenty for a 720×900 strip tile
const MIN_VIDEO_BITRATE = 800_000;

export function canFitVideo(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window && "VideoDecoder" in window;
}

export async function fitVideo(
  file: File,
  opts: { maxSeconds: number; maxBytes: number; maxEdge: number; onProgress?: (fraction: number) => void },
): Promise<FitVideoResult> {
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error("No video track found in this file.");
  const duration = await input.computeDuration();
  const srcW = track.displayWidth;
  const srcH = track.displayHeight;

  const trimmed = duration > opts.maxSeconds + 0.25;
  const seconds = trimmed ? opts.maxSeconds : duration;
  const scale = Math.min(1, opts.maxEdge / Math.max(srcW, srcH));
  const width = Math.round((srcW * scale) / 2) * 2; // H.264 wants even dimensions
  const height = Math.round((srcH * scale) / 2) * 2;

  // Already fine? Skip the re-encode entirely.
  if (!trimmed && file.size <= opts.maxBytes && scale === 1) {
    return { blob: file, seconds, trimmed: false, width: srcW, height: srcH, passthrough: true };
  }

  const bitrate = Math.max(MIN_VIDEO_BITRATE, Math.min(MAX_VIDEO_BITRATE, Math.floor((opts.maxBytes * HEADROOM * 8) / seconds)));
  // H.264 plays everywhere; VP9-in-MP4 is the fallback for browsers without an H.264 encoder (some Chromium builds).
  const codec = (await mb.canEncodeVideo("avc")) ? "avc" : (await mb.canEncodeVideo("vp9")) ? "vp9" : null;
  if (!codec) throw new Error("This browser has no usable video encoder. Use Chrome or Edge, or trim the clip first.");

  const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
  const conversion = await mb.Conversion.init({
    input,
    output,
    trim: trimmed ? { start: 0, end: opts.maxSeconds } : undefined,
    video: { codec, width, height, fit: "contain", bitrate, forceTranscode: true },
    audio: { discard: true },
    showWarnings: false,
  });
  if (!conversion.isValid) {
    const why = conversion.discardedTracks.map((d) => d.reason).join(", ") || "unsupported codec";
    throw new Error(`This browser can't re-encode that video (${why}). Try Chrome, or export as H.264 MP4 first.`);
  }
  if (opts.onProgress) conversion.onProgress = (p) => opts.onProgress!(p);
  await conversion.execute();
  const buffer = output.target.buffer;
  if (!buffer) throw new Error("Re-encode produced no output.");
  return { blob: new Blob([buffer], { type: "video/mp4" }), seconds, trimmed, width, height, passthrough: false };
}

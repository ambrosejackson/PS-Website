"use client";

/**
 * Best-effort client-side "does this MP4 carry an audio track?" probe for the
 * heroes admin (D-050). Loads the file into a detached <video>, waits for
 * loadedmetadata, and checks the non-standard track hints browsers expose.
 * A `false` result means "unknown, default off" — the admin HAS AUDIO toggle
 * is the source of truth. No ffmpeg/ffprobe anywhere near the deploy.
 */
export async function detectVideoHasAudio(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "metadata";
    v.crossOrigin = "anonymous";

    const cleanup = () => {
      v.removeAttribute("src");
      v.load();
    };
    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, 10_000);

    v.addEventListener(
      "loadedmetadata",
      () => {
        type TrackHints = HTMLVideoElement & {
          mozHasAudio?: boolean;
          webkitAudioDecodedByteCount?: number;
          audioTracks?: { length: number };
        };
        const t = v as TrackHints;
        const check = () =>
          Boolean(
            t.mozHasAudio ||
              (t.webkitAudioDecodedByteCount ?? 0) > 0 ||
              (t.audioTracks?.length ?? 0) > 0,
          );
        if (check()) {
          clearTimeout(timer);
          cleanup();
          resolve(true);
          return;
        }
        // webkitAudioDecodedByteCount only moves once decoding starts — play
        // muted for a beat, then re-check.
        v.play().catch(() => {});
        setTimeout(() => {
          clearTimeout(timer);
          const result = check();
          v.pause();
          cleanup();
          resolve(result);
        }, 800);
      },
      { once: true },
    );
    v.addEventListener(
      "error",
      () => {
        clearTimeout(timer);
        cleanup();
        resolve(false);
      },
      { once: true },
    );
    v.src = url;
  });
}

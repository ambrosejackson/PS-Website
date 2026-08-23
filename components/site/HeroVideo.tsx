"use client";

import { useEffect, useRef } from "react";

/**
 * Video hero layer with a first-frame poster: the poster <img> paints the
 * moment the page does; the <video> sits on top at opacity 0 (preload="auto")
 * and fades in over ~300 ms once it is actually playing. Without a poster the
 * behaviour is the same (whatever is beneath shows until the video plays).
 *
 * The reveal is imperative (element style, not React state): an autoplaying
 * SSR'd <video> often fires "playing" BEFORE React hydrates, so a React
 * onPlaying prop can miss it; the effect checks "already playing" on mount
 * and listens for playing/timeupdate. Used by HeroSwitcher + TerpKings CRT.
 */
export function HeroVideo({
  src,
  poster,
  className = "",
  fadeMs = 300,
}: {
  src: string;
  poster: string | null | undefined;
  className?: string;
  fadeMs?: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reveal = () => {
      v.style.opacity = "1";
    };
    if (!v.paused && v.currentTime > 0) reveal();
    v.addEventListener("playing", reveal);
    v.addEventListener("timeupdate", reveal, { once: true });
    return () => {
      v.removeEventListener("playing", reveal);
      v.removeEventListener("timeupdate", reveal);
    };
  }, [src]);

  return (
    <>
      {poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover ${className}`}
        />
      )}
      <video
        ref={ref}
        src={src}
        poster={poster ?? undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
        style={{ opacity: 0, transition: `opacity ${fadeMs}ms ease-out` }}
      />
    </>
  );
}

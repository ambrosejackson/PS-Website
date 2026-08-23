"use client";

import { useRef, useState } from "react";

/**
 * Video hero layer with a first-frame poster: the poster <img> paints the
 * moment the page does; the <video> sits on top at opacity 0 (preload="auto")
 * and fades in over ~300 ms on its first "playing" event. Without a poster the
 * behaviour is the same (whatever is beneath shows until the video plays).
 * Use for every video hero (HeroSwitcher + TerpKings CRT) — solved once.
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
  const [playing, setPlaying] = useState(false);

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
        onPlaying={() => setPlaying(true)}
        onCanPlay={(e) => {
          // Cached/fast loads can start before React attaches onPlaying.
          const v = e.currentTarget;
          if (!v.paused && v.currentTime > 0) setPlaying(true);
        }}
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
        style={{ opacity: playing ? 1 : 0, transition: `opacity ${fadeMs}ms ease-out` }}
      />
    </>
  );
}

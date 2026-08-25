"use client";

import { useEffect, useRef } from "react";

/**
 * Video hero layer with a first-frame poster: the poster <img> paints the
 * moment the page does; the <video> sits on top at opacity 0 and fades in over
 * ~300 ms once it is actually playing. Without a poster the behaviour is the
 * same (whatever is beneath shows until the video plays).
 *
 * The reveal is imperative (element style, not React state): an autoplaying
 * SSR'd <video> often fires "playing" BEFORE React hydrates, so a React
 * onPlaying prop can miss it; the effect checks "already playing" on mount
 * and listens for playing/timeupdate. Used by HeroSwitcher + TerpKings CRT.
 *
 * The markup ALWAYS starts muted (muted autoplay is universally permitted —
 * the hero can never freeze); hero audio (D-050) unmutes client-side only,
 * through the `videoRef` handed to useHeroAudio. `mobileSrc` serves a smaller
 * encode to phones via <source media> (content_heroes.media_url_mobile).
 */
export function HeroVideo({
  src,
  mobileSrc = null,
  poster,
  className = "",
  fadeMs = 300,
  loop = true,
  videoRef,
}: {
  src: string;
  mobileSrc?: string | null;
  poster: string | null | undefined;
  className?: string;
  fadeMs?: number;
  /** content_heroes.video_loop — false plays once and holds the last frame (D-057). */
  loop?: boolean;
  /** Optional external handle (hero audio) — kept in sync with the element. */
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (videoRef) videoRef.current = v;
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
      if (videoRef) videoRef.current = null;
    };
  }, [src, videoRef]);

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
        poster={poster ?? undefined}
        autoPlay
        muted
        loop={loop}
        playsInline
        preload="metadata"
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
        style={{ opacity: 0, transition: `opacity ${fadeMs}ms ease-out` }}
      >
        {mobileSrc && (
          <source src={mobileSrc} media="(max-width: 767px)" type="video/mp4" />
        )}
        <source src={src} type="video/mp4" />
      </video>
    </>
  );
}

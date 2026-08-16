"use client";

import { useSyncExternalStore } from "react";

/**
 * Intro-section media (D-025): a silent 4:5 portrait loop of the grow room,
 * replacing the static CULTIVATION placeholder.
 *
 * `muted` + `playsInline` are what make it autoplay on iOS Safari — without
 * playsInline iOS takes the video fullscreen instead of playing it inline, and
 * without muted no autoplay policy anywhere lets it start. The source has no
 * audio track at all, so muted costs nothing.
 *
 * prefers-reduced-motion: reduce swaps the whole <video> for the poster still,
 * so the file never plays (and never downloads past metadata) for those users.
 */

const VIDEO_SRC = "/videos/intro-cultivation.mp4";
const POSTER_SRC = "/videos/intro-cultivation-poster.jpg";
const ALT = "Private Stock cultivation";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotionPreference(callback: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

export function IntroMedia() {
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );

  // The 4:5 box is on the wrapper, not the media, so the still and the video
  // occupy exactly the same space and object-cover crops rather than letterboxes.
  return (
    <div className="aspect-[4/5] w-full overflow-hidden">
      {reducedMotion ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={POSTER_SRC}
          alt={ALT}
          className="h-full w-full object-cover"
        />
      ) : (
        <video
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          role="img"
          aria-label={ALT}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}

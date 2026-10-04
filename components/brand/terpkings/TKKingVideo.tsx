"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HERO_MUTE_KEY } from "@/components/site/hero-audio";

const VOLUME = 0.7;

function readUserMuted(): boolean {
  try {
    return sessionStorage.getItem(HERO_MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * King dossier clip. Plays (with sound where the browser allows it) while the
 * slot is at least half in view, pauses when it scrolls away or the tab hides.
 * If unmuted autoplay is blocked (no user gesture yet, iOS), it falls back to
 * muted playback and the button reads TAP FOR SOUND. The mute choice shares
 * the hero's sessionStorage key so it carries across the page for the session.
 * Parent keys this component by king, so switching kings remounts it.
 */
export function TKKingVideo({
  src,
  poster,
  label,
}: {
  src: string;
  poster?: string;
  label: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inViewRef = useRef(false);
  const [muted, setMuted] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  const tryPlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = VOLUME;
    v.muted = readUserMuted();
    setMuted(v.muted);
    v.play().catch(() => {
      // Unmuted autoplay refused — play silently and offer TAP FOR SOUND.
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduce);
    if (reduce) return; // poster + native controls only

    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting && !document.hidden) tryPlay();
        else videoRef.current?.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(wrap);

    const onVisibility = () => {
      if (document.hidden) videoRef.current?.pause();
      else if (inViewRef.current) tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const video = videoRef.current;
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      video?.pause();
    };
  }, [tryPlay]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    v.volume = VOLUME;
    setMuted(next);
    try {
      sessionStorage.setItem(HERO_MUTE_KEY, next ? "1" : "0");
    } catch {}
    if (v.paused) v.play().catch(() => {});
  };

  return (
    <div ref={wrapRef} className="absolute inset-0 bg-black">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        loop
        playsInline
        preload="metadata"
        controls={reducedMotion}
        aria-label={label}
        className="h-full w-full object-cover"
      />
      {!reducedMotion && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute king video" : "Mute king video"}
          aria-pressed={!muted}
          className="tk-mono tk-hover-bright absolute bottom-2 right-2 cursor-pointer rounded-[3px] border border-[#3E5222] bg-[rgba(0,0,0,.7)] px-[10px] py-[5px] text-[14px] tracking-[.12em] text-[#D8F26E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D8F26E]"
        >
          {muted ? "TAP FOR SOUND" : "MUTE"}
        </button>
      )}
    </div>
  );
}

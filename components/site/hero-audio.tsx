"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { HeroAsset } from "@/lib/data";

/**
 * Hero audio autoplay + click-to-mute (D-050..D-055).
 *
 * The <video> markup ALWAYS starts muted (muted autoplay is universally
 * permitted, so the hero can never freeze); unmuting happens only client-side.
 * The hook attempts an unmute on mount (works in browsers with banked media
 * engagement), and again — synchronously, inside the gesture task — whenever a
 * `ps:user-gesture` CustomEvent arrives (dispatched by the age gate + cookie
 * consent handlers). If the browser refuses unmuted playback, we fall back to
 * muted playback + the "TAP FOR SOUND" pill (D2 — no interstitial, no
 * latch-on-first-click).
 *
 * The visitor's mute choice lives in sessionStorage (D3) — it IS the store
 * (useSyncExternalStore), so it persists across client navigations for the
 * session and never desyncs between heroes. Audio plays only while the page's
 * DEFAULT hero is the visible one (D4); a hover-swapped hero is always muted.
 * Click anywhere on the hero that is not an interactive element toggles mute
 * (D5). Volume is clamped to the admin-set per-asset value, default 70 — never
 * 1.0 (D6).
 */

export const HERO_MUTE_KEY = "ps:hero-audio-muted";
export const USER_GESTURE_EVENT = "ps:user-gesture";
const MUTE_CHANGE_EVENT = "ps:hero-muted-change";

/** True when this hero row is allowed to drive audio at all (D1/D4). */
export function heroAudioEligible(hero: Pick<
  HeroAsset,
  "media_type" | "has_audio" | "audio_autoplay" | "is_default"
> | null | undefined): boolean {
  return Boolean(
    hero &&
      hero.media_type === "video" &&
      hero.has_audio &&
      hero.audio_autoplay &&
      hero.is_default,
  );
}

// ---- session-scoped mute store (Safari private mode throws — swallow) ------

function readStoredMuted(): boolean {
  try {
    return sessionStorage.getItem(HERO_MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStoredMuted(muted: boolean) {
  try {
    sessionStorage.setItem(HERO_MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* storage unavailable — state still works for this page view */
  }
  window.dispatchEvent(new Event(MUTE_CHANGE_EVENT));
}

function subscribeMuted(cb: () => void) {
  window.addEventListener(MUTE_CHANGE_EVENT, cb);
  return () => window.removeEventListener(MUTE_CHANGE_EVENT, cb);
}

export interface HeroAudio {
  /** Attach to the HeroVideo rendering the audio hero. */
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  /** Effective state for the speaker button (true while blocked too). */
  muted: boolean;
  /** Unmuted autoplay was refused and no successful unmute has happened yet. */
  blocked: boolean;
  /** Click-to-mute handler for the hero media layer (skips interactive elements). */
  onHeroClick: (e: React.MouseEvent) => void;
  /** Speaker button / pill action — must be called from a real user gesture. */
  onButtonClick: () => void;
}

export function useHeroAudio({
  enabled,
  volume,
  visible = true,
}: {
  /** heroAudioEligible(hero) — false renders the whole feature inert. */
  enabled: boolean;
  /** Admin-set 0–100 (content_heroes.audio_volume). */
  volume: number;
  /** False while a hover-swapped hero covers the default (D4). */
  visible?: boolean;
}): HeroAudio {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // SSR snapshot is false — matching the always-muted SSR markup.
  const userMuted = useSyncExternalStore(subscribeMuted, readStoredMuted, () => false);
  const [blocked, setBlocked] = useState(false);
  // Mirrors for listeners/effects that need fresh values without re-binding.
  const blockedRef = useRef(false);
  const visibleRef = useRef(true);
  const volumeRef = useRef(0.7);
  useEffect(() => {
    blockedRef.current = blocked;
  }, [blocked]);
  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);
  useEffect(() => {
    volumeRef.current = Math.min(100, Math.max(0, volume)) / 100;
  }, [volume]);

  /**
   * Attempt unmuted playback. MUST run synchronously inside the calling task
   * when that task is a user gesture — no awaits before v.muted/v.play().
   * Some browsers resolve play() but silently force muted back on; treat that
   * as blocked too. On refusal, fall back to muted playback (never a frozen
   * hero) and raise the pill.
   */
  const tryUnmute = useCallback(() => {
    const v = videoRef.current;
    if (!v || !visibleRef.current || readStoredMuted()) return;
    v.volume = volumeRef.current;
    v.muted = false;
    // A hero with video_loop = false that has already finished must never be
    // restarted by us (D-057). The unmute above still applies — it just has
    // nothing left to play. Without this, unmuting or returning to the tab
    // would silently auto-replay the very thing the admin switched off.
    if (v.ended) return;
    const p = v.play();
    if (p) {
      p.then(() => {
        setBlocked(v.muted);
        blockedRef.current = v.muted;
      }).catch(() => {
        v.muted = true;
        v.play().catch(() => {});
        setBlocked(true);
        blockedRef.current = true;
      });
    }
  }, []);

  const applyMute = useCallback(
    (muted: boolean) => {
      writeStoredMuted(muted);
      const v = videoRef.current;
      if (!v) return;
      if (muted) {
        v.muted = true;
      } else {
        // Unmuting from a click — we are inside the gesture task.
        setBlocked(false);
        blockedRef.current = false;
        tryUnmute();
      }
    },
    [tryUnmute],
  );

  const toggleMute = useCallback(() => {
    applyMute(!readStoredMuted());
  }, [applyMute]);

  // Mount: attempt autoplay-with-sound once (refused → blocked → pill), and
  // honour a mute carried over from earlier in the session.
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(tryUnmute, 0); // after HeroVideo's effect binds the ref
    return () => clearTimeout(t);
  }, [enabled, tryUnmute]);

  // Gesture bridge: age gate / cookie consent clicks re-dispatch here. The
  // listener runs inside the original click's task, so the retry counts as
  // gesture-driven. Synchronous — no awaits (see tryUnmute).
  useEffect(() => {
    if (!enabled) return;
    const onGesture = () => tryUnmute();
    window.addEventListener(USER_GESTURE_EVENT, onGesture);
    return () => window.removeEventListener(USER_GESTURE_EVENT, onGesture);
  }, [enabled, tryUnmute]);

  // D4: hover-swap away → hard mute; back on default → restore if the visitor
  // hasn't muted and we aren't blocked (gesture already banked, no re-prompt).
  useEffect(() => {
    if (!enabled) return;
    const v = videoRef.current;
    if (!v) return;
    if (!visible) {
      v.muted = true;
    } else if (!readStoredMuted() && !blockedRef.current) {
      tryUnmute();
    }
  }, [enabled, visible, tryUnmute]);

  // Tab hidden → mute; visible again → restore prior state.
  useEffect(() => {
    if (!enabled) return;
    const onVisibility = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) {
        v.muted = true;
      } else if (!readStoredMuted() && !blockedRef.current && visibleRef.current) {
        v.volume = volumeRef.current;
        v.muted = false;
        if (!v.ended) v.play().catch(() => {}); // no auto-replay (D-057)
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [enabled]);

  // Unmount / route change: pause playback (all listeners removed above).
  useEffect(() => {
    if (!enabled) return;
    const ref = videoRef;
    return () => {
      ref.current?.pause();
    };
  }, [enabled]);

  const onHeroClick = useCallback(
    (e: React.MouseEvent) => {
      if (!enabled) return;
      const el = e.target as HTMLElement;
      if (
        el.closest(
          "a, button, [role='button'], input, select, textarea, label, [data-hero-no-mute]",
        )
      )
        return;
      toggleMute();
    },
    [enabled, toggleMute],
  );

  // Speaker button: toggles mute; while blocked it is the TAP FOR SOUND pill,
  // whose click retries the unmute synchronously (gesture task).
  const onButtonClick = useCallback(() => {
    if (blockedRef.current) {
      writeStoredMuted(false);
      setBlocked(false);
      blockedRef.current = false;
      tryUnmute();
      return;
    }
    toggleMute();
  }, [toggleMute, tryUnmute]);

  return {
    videoRef,
    muted: userMuted || blocked,
    blocked,
    onHeroClick,
    onButtonClick,
  };
}

/**
 * Visible, keyboard-reachable audio control (WCAG 2.1 SC 1.4.2). Pinned by the
 * PARENT (bottom-right of the hero, above decorative overlays). While blocked
 * it becomes the "TAP FOR SOUND" pill, fading in after ~600 ms (CSS animation
 * delay) so it doesn't flash on fast unmutes.
 */
export function HeroAudioButton({
  audio,
  theme = "dark",
  className = "",
}: {
  audio: HeroAudio;
  /** Existing per-asset flag: 'dark' asset → light control, and vice versa. */
  theme?: "light" | "dark";
  className?: string;
}) {
  const { muted, blocked, onButtonClick } = audio;

  const dark = theme === "dark"; // dark asset → light-on-dark control
  const chrome = dark
    ? "border-white/40 bg-black/50 text-white hover:bg-black/70 focus-visible:outline-white"
    : "border-black/30 bg-white/60 text-neutral-950 hover:bg-white/80 focus-visible:outline-neutral-950";

  return (
    <button
      type="button"
      data-hero-no-mute
      onClick={onButtonClick}
      aria-label={muted ? "Unmute hero audio" : "Mute hero audio"}
      className={`pointer-events-auto flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold tracking-[0.2em] backdrop-blur-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${chrome} ${
        blocked ? "animate-hero-pill-in" : ""
      } ${className}`}
    >
      <SpeakerIcon muted={muted} />
      {blocked && <span aria-hidden="true">TAP FOR SOUND</span>}
    </button>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H2v6h4l5 4V5z" />
      {muted ? (
        <>
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </>
      )}
    </svg>
  );
}

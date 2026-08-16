"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/site/Header";

/**
 * SSS hero — downloaded hero video (muted autoplay loop, poster fallback)
 * with SOUND OFF/ON pill, stacked display type, gradient + ghost CTAs, SCROLL
 * indicator. Global PS header overlays (D-006; dark theme default). The
 * original site's top star-ticker renders BELOW this hero per D-007.
 */
export function SSSHero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  function toggleSound() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  }

  return (
    <section className="relative h-svh w-full overflow-hidden bg-[#0d0a08]">
      <video
        ref={videoRef}
        src="/brand-pages/savagesquadstrains/sss-hero.mp4"
        poster="/brand-pages/savagesquadstrains/hero-poster.jpg"
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/25" />

      <div className="absolute inset-0 z-10 flex flex-col justify-center px-6 md:px-16">
        <h1 className="font-display text-6xl uppercase leading-[0.95] text-[#f3efe9] md:text-[7.5rem]">
          Savage
          <br />
          <span className="bg-gradient-to-r from-[#ff6a00] to-[#ffb347] bg-clip-text text-transparent">
            Squad
          </span>
          <br />
          Strains
        </h1>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#sss-drop"
            className="bg-gradient-to-r from-[#ff6a00] to-[#ffb347] px-7 py-3.5 font-mono text-sm font-bold uppercase tracking-wider text-neutral-950 shadow-[0_0_24px_rgba(255,106,0,0.45)] transition-transform hover:scale-[1.02]"
          >
            Shop the Drop
          </a>
          <Link
            href="/apparel"
            className="border border-white/70 px-7 py-3.5 font-mono text-sm font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
          >
            Limited Merch
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 left-6 z-10 flex items-center gap-3 md:left-16">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
          Scroll
        </span>
        <span className="h-px w-12 bg-gradient-to-r from-[#ff6a00] to-transparent" />
      </div>
      <button
        onClick={toggleSound}
        className="absolute bottom-8 right-6 z-10 rounded-full border border-white/25 bg-black/40 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-colors hover:bg-black/60 md:right-16"
      >
        {muted ? "🔇 Sound Off" : "🔊 Sound On"}
      </button>

      {/* Brand landing page — keeps the transparent overlay header (D-012). */}
      <Header variant="overlay" />
    </section>
  );
}

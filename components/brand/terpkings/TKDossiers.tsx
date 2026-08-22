"use client";

import { useState } from "react";
import { KINGS } from "@/lib/terpkings-content";
import { TKPlaceholder, TKScrews, TKSectionHead } from "./TKBits";

/**
 * FILE 03 // CLASSIFIED DOSSIERS — wood-panel console with the five Kings:
 * selectable list, prev/next arrows, full dossier stories, per-king accent.
 * Single-column on mobile (tk-dossier-grid).
 */
export function TKDossiers() {
  const [idx, setIdx] = useState(0);
  const king = KINGS[idx];
  const prev = () => setIdx((i) => (i + KINGS.length - 1) % KINGS.length);
  const next = () => setIdx((i) => (i + 1) % KINGS.length);

  return (
    <section id="kings" className="tk-gutter mx-auto max-w-[1160px] py-[100px]">
      <TKSectionHead
        eyebrow="FILE 03 // CLASSIFIED DOSSIERS"
        title={<>TerpKings History &amp; Lore</>}
        className="mb-11"
      />
      <div
        className="relative rounded-[14px] border-[3px] border-[#2A1408] p-[22px]"
        style={{
          background: "linear-gradient(160deg, #8A4A2A, #5E3018 60%, #3A1E0C)",
          boxShadow:
            "inset 0 2px 0 rgba(255,255,255,.15), inset 0 -4px 12px rgba(0,0,0,.5), 0 24px 60px rgba(0,0,0,.7)",
        }}
      >
        <div
          className="tk-wood pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ backgroundSize: "620px auto, 830px auto", backgroundPosition: "71% 22%, 12% 80%" }}
        />
        <TKScrews
          size={14}
          inset={{ x: 12, y: 10 }}
          gradient="radial-gradient(circle at 35% 35%, #D9B58E, #241007)"
          corners="all"
        />
        <div className="relative overflow-hidden rounded-lg border-2 border-[#1E2612] bg-[#070A05] p-[26px]">
          <div className="tk-dossier-grid relative">
            {/* Left: name, art, selector */}
            <div className="flex min-w-0 flex-col gap-[14px]">
              <div className="tk-mono text-[22px] uppercase leading-[1.25] text-[#A8C64E]">
                {king.name}
                <br />
                <span className="text-[#5B6E35]">— {king.title}</span>
              </div>
              <div className="relative h-[220px] overflow-hidden rounded-[4px] border-2 border-[#2E3A1C]">
                <TKPlaceholder label={king.placeholder} />
              </div>
              <div className="flex flex-col gap-2" role="tablist" aria-label="Kings">
                {KINGS.map((k, i) => {
                  const active = i === idx;
                  return (
                    <button
                      key={k.slotId}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setIdx(i)}
                      className="tk-mono tk-hover-bright cursor-pointer rounded-[3px] border border-[#3E5222] px-[14px] py-[9px] text-left text-[18px] tracking-[.12em]"
                      style={{
                        background: active ? "rgba(168,198,78,.25)" : "rgba(0,0,0,.4)",
                        color: active ? "#D8F26E" : "#7A8E4C",
                        boxShadow: active ? "0 0 14px rgba(168,198,78,.4)" : "none",
                      }}
                    >
                      ▸ {k.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: dossier */}
            <div className="flex min-w-0 flex-col gap-4">
              <div className="tk-mono flex flex-wrap justify-between gap-3 text-[19px] tracking-[.14em]">
                <span className="text-[#A8C64E]">DOSSIER</span>
                <span style={{ color: king.color }}>DOMAIN: {king.domain}</span>
              </div>
              <div
                className="flex-1 rounded-[4px] border border-[#2E3A1C] px-[22px] py-5"
                style={{ background: "rgba(168,198,78,.04)" }}
              >
                <p className="tk-mono m-0 whitespace-pre-line text-[20px] leading-[1.6] text-[#A8C64E]">
                  {king.story}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Previous king"
                  className="tk-mono tk-btn-arrow flex-1 cursor-pointer rounded-[3px] py-[10px] text-[22px]"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next king"
                  className="tk-mono tk-btn-arrow flex-1 cursor-pointer rounded-[3px] py-[10px] text-[22px]"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

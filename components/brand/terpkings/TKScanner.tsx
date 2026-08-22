"use client";

import { useState } from "react";
import { TERPS, TERP_EDU, type TerpKey } from "@/lib/terpkings-content";
import { TKProductImage, TKScrews, TKSectionHead } from "./TKBits";

/**
 * FILE 04 // TERP-SCANNER v5.0 — five-profile interactive scanner: specs
 * block, lore, reference-lab bars (width animates, glow in profile color),
 * profile render, and the expandable TERPENE CLASSIFICATION panel.
 */
export function TKScanner({ available }: { available: Record<string, boolean> }) {
  const [key, setKey] = useState<TerpKey>("gas");
  const [eduOpen, setEduOpen] = useState(false);
  const terp = TERPS.find((t) => t.key === key) ?? TERPS[0];
  const maxBar = Math.max(...terp.bars.map((b) => b[1]));

  return (
    <section id="terps" className="tk-gutter mx-auto max-w-[1160px] py-[100px]">
      <TKSectionHead
        eyebrow="FILE 04 // TERP-SCANNER v5.0"
        title="The 5 Terpene Profiles"
        className="mb-11"
      />
      <div
        className="relative rounded-[14px] border-[3px] border-[#2A1810] p-[22px]"
        style={{
          background: "linear-gradient(160deg, #6E4A2E, #4A2E1C 55%, #382215)",
          boxShadow:
            "inset 0 2px 0 rgba(255,255,255,.12), inset 0 -4px 12px rgba(0,0,0,.5), 0 24px 60px rgba(0,0,0,.7)",
        }}
      >
        <div
          className="tk-wood pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{ backgroundSize: "540px auto, 910px auto", backgroundPosition: "0 0, 47% 63%" }}
        />
        <TKScrews
          size={14}
          inset={{ x: 12, y: 10 }}
          gradient="radial-gradient(circle at 35% 35%, #C9B08E, #241407)"
          corners="all"
        />
        <div className="relative overflow-hidden rounded-lg border-2 border-[#1E2612] bg-[#0B0F07] p-[26px]">
          <div className="relative flex flex-col gap-[22px]">
            {/* Profile tabs */}
            <div className="flex flex-wrap gap-[10px]" role="tablist" aria-label="Terpene profiles">
              {TERPS.map((t) => {
                const active = t.key === key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setKey(t.key)}
                    className="tk-mono tk-hover-bright-sm cursor-pointer rounded-[4px] border px-[22px] py-[10px] text-[20px] tracking-[.14em]"
                    style={{
                      background: active ? t.color : "rgba(0,0,0,.4)",
                      color: active ? "#0B0F07" : t.color,
                      borderColor: t.color,
                      boxShadow: active ? `0 0 18px ${t.color}` : "none",
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>

            <div className="tk-scanner-grid">
              {/* Left: readout */}
              <div className="flex min-w-0 flex-col gap-4">
                <div className="tk-mono tk-hum text-[28px]" style={{ color: terp.color }}>
                  &gt; {terp.name} PROFILE — {terp.king}
                </div>
                <div className="tk-mono whitespace-pre-line text-[19px] leading-[1.55] text-[#A8C64E]">
                  {terp.specs}
                </div>
                <p className="tk-mono m-0 text-[19px] leading-[1.55] text-[#8A9E5C]">{terp.lore}</p>
              </div>

              {/* Right: reference lab */}
              <div className="flex min-w-0 flex-col gap-3">
                <div className="tk-mono text-[17px] tracking-[.16em] text-[#5B6E35]">
                  REFERENCE LAB — {terp.ref}
                </div>
                {terp.bars.map(([name, pct]) => (
                  <div key={`${terp.key}-${name}`} className="flex flex-col gap-1">
                    <div className="tk-mono flex justify-between text-[17px] text-[#A8C64E]">
                      <span>{name}</span>
                      <span>{pct.toFixed(2)}%</span>
                    </div>
                    <div
                      className="h-3 overflow-hidden rounded-[2px]"
                      style={{
                        background: "rgba(168,198,78,.12)",
                        border: "1px solid rgba(168,198,78,.25)",
                      }}
                    >
                      <div
                        className="tk-bar h-full"
                        style={{
                          width: `${Math.round((pct / maxBar) * 100)}%`,
                          background: `linear-gradient(90deg, ${terp.color}, #D8F26E)`,
                          boxShadow: `0 0 12px ${terp.color}`,
                          transition: "width .5s",
                        }}
                      />
                    </div>
                  </div>
                ))}
                <div className="mt-[10px] flex justify-center">
                  <TKProductImage
                    src={terp.img}
                    alt={`${terp.name} profile`}
                    available={available[terp.img] ?? true}
                    className="max-h-[190px] object-contain"
                    style={{ filter: "drop-shadow(0 12px 20px rgba(0,0,0,.7))" }}
                  />
                </div>
              </div>
            </div>

            {/* Education panel */}
            <button
              type="button"
              onClick={() => setEduOpen((o) => !o)}
              aria-expanded={eduOpen}
              aria-controls="tk-edu-panel"
              className="tk-mono tk-btn-edu cursor-pointer self-start rounded-[4px] px-[26px] py-[11px] text-[21px] tracking-[.14em]"
            >
              {eduOpen ? TERP_EDU.closeLabel : TERP_EDU.openLabel}
            </button>
            {eduOpen && (
              <div
                id="tk-edu-panel"
                className="tk-mono flex flex-col gap-[18px] rounded-[6px] border border-[#3E5222] px-7 py-[26px]"
                style={{ background: "rgba(168,198,78,.04)" }}
              >
                <div className="text-[24px] tracking-[.14em] text-[#FFB000]">{TERP_EDU.heading}</div>
                <div className="tk-edu-grid">
                  {TERP_EDU.blocks.map((b) => (
                    <div key={b.title} className="flex min-w-0 flex-col gap-2">
                      <div className="text-[19px] tracking-[.12em] text-[#D8F26E]">{b.title}</div>
                      <p className="m-0 text-[19px] leading-[1.55] text-[#8A9E5C]">{b.body}</p>
                    </div>
                  ))}
                </div>
                <div className="text-[16px] tracking-[.08em] text-[#5B6E35]">{TERP_EDU.sources}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

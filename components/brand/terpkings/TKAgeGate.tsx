"use client";

import { GATE } from "@/lib/terpkings-content";
import { vt323 } from "./tk-font";
import "./terpkings.css";

/**
 * TerpKings age gate — "TERPKINGS OS v2.6 — SECURITY CHECKPOINT" terminal from
 * the export. It does NOT own the decision: AgeGate.tsx renders it on /terpkings
 * and passes the shared-cookie `accept` (guardrail #6 — one sitewide cookie, no
 * tk_age_ok localStorage). Loaded via next/dynamic so VT323 + tk CSS stay
 * scoped to TerpKings.
 */
export function TKAgeGate({
  accept,
  refused,
  onRefuse,
}: {
  accept: () => void;
  refused: boolean;
  onRefuse: () => void;
}) {
  return (
    <div
      className={`${vt323.variable} tk-mono fixed inset-0 z-[90] flex items-center justify-center p-6`}
      style={{ background: "rgba(3,4,2,.96)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tk-gate-title"
    >
      <div
        className="relative w-full max-w-[480px] overflow-hidden rounded-lg border-2 border-[#3A4A22] bg-[#0B0F07] px-9 py-10"
        style={{
          boxShadow: "0 0 60px rgba(168,198,78,.15), inset 0 0 40px rgba(0,0,0,.8)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "repeating-linear-gradient(0deg, rgba(0,0,0,.3) 0px, rgba(0,0,0,.3) 2px, transparent 2px, transparent 4px)",
          }}
        />
        <div className="tk-grain pointer-events-none absolute inset-0 rounded-[inherit] opacity-50" />
        <div className="relative flex flex-col gap-[14px]">
          <div className="text-[16px] tracking-[.1em] text-[#5B6E35]">{GATE.header}</div>
          <div id="tk-gate-title" className="tk-hum text-[30px] leading-[1.2] text-[#A8C64E]">
            {GATE.title}
          </div>
          {refused ? (
            <div className="text-[19px] leading-[1.5] text-[#FF2E2E]">{GATE.refused}</div>
          ) : (
            <>
              <div className="text-[19px] leading-[1.5] text-[#8A9E5C]">
                {GATE.body1}
                <br />
                {GATE.body2}
              </div>
              <div className="mt-2 flex gap-3">
                <button
                  type="button"
                  onClick={accept}
                  className="tk-mono tk-btn-solid flex-1 cursor-pointer rounded-[4px] py-3 text-[22px] tracking-[.1em]"
                >
                  {GATE.yes}
                </button>
                <button
                  type="button"
                  onClick={onRefuse}
                  className="tk-mono tk-btn-ghost flex-1 cursor-pointer rounded-[4px] py-3 text-[22px] tracking-[.1em]"
                >
                  {GATE.no}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

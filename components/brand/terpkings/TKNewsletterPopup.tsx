"use client";

import { TKSignupForm } from "./TKSignupForm";
import { vt323 } from "./tk-font";
import "./terpkings.css";

/**
 * TerpKings-styled 15% merch popup. NewsletterPopup.tsx owns the suppression
 * rules (once per session, never over an unanswered age gate, never after a
 * signup) and mounts this on /terpkings via next/dynamic.
 */
export function TKNewsletterPopup({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  return (
    <div
      className={`${vt323.variable} fixed inset-0 z-[80] flex items-center justify-center p-4`}
      style={{ background: "rgba(3,4,2,.8)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tk-popup-title"
    >
      <div
        className="relative w-full max-w-[520px] overflow-hidden rounded-lg border-2 border-[#3A4A22] bg-[#0B0F07] px-8 py-9 text-center"
        style={{ boxShadow: "0 0 60px rgba(168,198,78,.15), inset 0 0 40px rgba(0,0,0,.8)" }}
      >
        <div className="tk-grain pointer-events-none absolute inset-0 rounded-[inherit] opacity-50" />
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="tk-mono tk-link-dim absolute right-3 top-2 cursor-pointer bg-transparent text-[20px] tracking-[.1em]"
        >
          [X]
        </button>
        <div className="relative flex flex-col items-center gap-[14px]">
          <div className="tk-mono text-[16px] tracking-[.1em] text-[#5B6E35]">
            TERPKINGS OS v2.6 — INCOMING TRANSMISSION
          </div>
          <div id="tk-popup-title" className="tk-mono tk-hum text-[30px] leading-[1.2] text-[#A8C64E]">
            &gt; TAKE 15% OFF MERCH_
          </div>
          <p className="tk-mono m-0 max-w-[420px] text-[19px] leading-[1.5] text-[#8A9E5C]">
            JOIN THE COURT AND RECEIVE A ONE-TIME 15% CODE FOR MERCH &amp; APPAREL. ONE USE PER
            OPERATOR, NOT COMBINABLE WITH OTHER PROMOTIONS.
          </p>
          <div className="mt-2 w-full">
            <TKSignupForm compact onSuccess={onSuccess} />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LOCATOR } from "@/lib/terpkings-content";

/**
 * FILE 06 // SUPPLY LINES — locator console. Export styling kept; ► SCAN routes
 * to /store-locator?zip={value} instead of the export's coming-soon message.
 * Empty input keeps the inline "> ERROR: ENTER COORDINATES FIRST." line.
 */
export function TKLocator() {
  const router = useRouter();
  const [zip, setZip] = useState("");
  const [msg, setMsg] = useState("");

  function scan(e: React.FormEvent) {
    e.preventDefault();
    const value = zip.trim();
    if (!value) {
      setMsg(LOCATOR.emptyError);
      return;
    }
    setMsg(`> SCANNING SECTOR ${value}… ROUTING TO LOCATOR.`);
    router.push(`/store-locator?zip=${encodeURIComponent(value)}`);
  }

  return (
    <section id="locator" className="tk-gutter mx-auto max-w-[1000px] pb-[50px] pt-[100px]">
      <div
        className="relative flex flex-col items-center gap-4 overflow-hidden rounded-[10px] border-2 border-[#3A4A22] bg-[#0B0F07] px-6 py-[50px] text-center md:px-10"
        style={{ boxShadow: "0 0 60px rgba(168,198,78,.12)" }}
      >
        <div className="tk-grain pointer-events-none absolute inset-0 rounded-[inherit] opacity-50" />
        <div className="tk-mono relative text-[19px] tracking-[.2em] text-[#5B6E35]">
          {LOCATOR.eyebrow}
        </div>
        <h2
          className="relative m-0 font-extrabold uppercase text-[#E8F0C8]"
          style={{ fontSize: "clamp(28px, 4vw, 46px)" }}
        >
          {LOCATOR.title}
        </h2>
        <p className="tk-mono relative m-0 max-w-[560px] text-[20px] leading-[1.5] text-[#8A9E5C]">
          {LOCATOR.blurb}
        </p>
        <form
          onSubmit={scan}
          className="relative flex flex-wrap justify-center gap-3"
          noValidate
        >
          <label htmlFor="tk-zip" className="sr-only">
            ZIP code
          </label>
          <input
            id="tk-zip"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder={LOCATOR.placeholder}
            inputMode="numeric"
            autoComplete="postal-code"
            className="tk-mono tk-input w-[210px] px-[18px] py-[13px] text-[22px] tracking-[.1em]"
          />
          <button
            type="submit"
            className="tk-mono tk-btn-solid cursor-pointer rounded-[4px] px-[30px] py-[13px] text-[22px] tracking-[.1em]"
          >
            {LOCATOR.cta}
          </button>
        </form>
        <div className="tk-mono relative min-h-[1.2em] text-[18px] text-[#5B6E35]" aria-live="polite">
          {msg}
        </div>
      </div>
    </section>
  );
}

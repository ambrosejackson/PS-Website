"use client";

import { useRef, useState } from "react";
import { LOCATOR } from "@/lib/terpkings-content";
import type { TkLocatorResponse } from "@/lib/tk-locator";

/**
 * FILE 06 // SUPPLY LINES — locator console. Export styling kept; ► SCAN now
 * queries /api/tk-locator and renders the results inside the console instead
 * of routing to /store-locator, so the CRT theme is never broken. Radius and
 * fallback rules live in the route; every user-facing string in LOCATOR.
 * Empty input keeps the inline "> ERROR: ENTER COORDINATES FIRST." line.
 */
type ScanState =
  | { phase: "idle" }
  | { phase: "error"; msg: string }
  | { phase: "scanning"; zip: string }
  | { phase: "results"; zip: string; res: TkLocatorResponse };

export function TKLocator() {
  const [zip, setZip] = useState("");
  const [state, setState] = useState<ScanState>({ phase: "idle" });
  // Guards against an older slow response overwriting a newer scan.
  const scanSeq = useRef(0);

  async function scan(e: React.FormEvent) {
    e.preventDefault();
    const value = zip.trim();
    if (!value) {
      setState({ phase: "error", msg: LOCATOR.emptyError });
      return;
    }
    const seq = ++scanSeq.current;
    setState({ phase: "scanning", zip: value });
    try {
      const res = await fetch(`/api/tk-locator?zip=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as TkLocatorResponse;
      if (seq === scanSeq.current) setState({ phase: "results", zip: value, res: data });
    } catch {
      if (seq === scanSeq.current) setState({ phase: "error", msg: LOCATOR.failedError });
    }
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
        <div className="relative w-full" aria-live="polite">
          <ScanReadout state={state} />
        </div>
      </div>
    </section>
  );
}

function ScanReadout({ state }: { state: ScanState }) {
  const line = (text: string) => (
    <div className="tk-mono min-h-[1.2em] text-[18px] text-[#5B6E35]">{text}</div>
  );

  if (state.phase === "idle") return line("");
  if (state.phase === "error") return line(state.msg);
  if (state.phase === "scanning") return line(`${LOCATOR.scanning} ${state.zip}…`);

  const { res, zip } = state;
  switch (res.mode) {
    case "invalid_zip":
      return line(LOCATOR.invalidZip);
    case "unknown_zip":
      return line(`> ERROR: SECTOR ${zip} NOT RECOGNIZED.`);
    case "coming_soon":
      return line(LOCATOR.comingSoon);
    case "none":
      return line(LOCATOR.noneFound);
  }

  return (
    <div className="mx-auto mt-2 w-full max-w-[640px] text-left">
      <div className="tk-mono text-[18px] tracking-[.08em] text-[#8A9E5C]">
        {res.mode === "radius"
          ? `> ${res.stores.length} SUPPLY LINE${res.stores.length === 1 ? "" : "S"} WITHIN 10 MI OF SECTOR ${zip}:`
          : LOCATOR.nearestHeader}
      </div>
      <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
        {res.stores.map((s) => (
          <li
            key={s.id}
            className="rounded-[6px] border border-[rgba(168,198,78,.25)] bg-[rgba(168,198,78,.05)] px-4 py-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-[16px] font-bold uppercase leading-tight text-[#E8F0C8]">
                {s.name}
              </span>
              <span className="tk-mono text-[16px] tracking-[.1em] text-[#D8F26E]">
                ~{s.distanceMi} MI
              </span>
            </div>
            <div className="tk-mono mt-1 text-[15px] leading-snug text-[#8A9E5C]">{s.address}</div>
            <div className="tk-mono mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[15px] tracking-[.1em]">
              {s.menuUrl && (
                <a
                  href={s.menuUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#D8F26E] no-underline hover:underline"
                >
                  {LOCATOR.menuLink}
                </a>
              )}
              <a
                href={s.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#D8F26E] no-underline hover:underline"
              >
                {LOCATOR.mapLink}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

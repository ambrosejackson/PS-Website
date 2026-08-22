"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { SIGNUP } from "@/lib/terpkings-content";

/**
 * TerpKings-styled newsletter form → POST /api/subscribe (sourcePath is the
 * page path, so the server tags persona "Website Sign-up – TerpKings",
 * brand_context "TerpKings", source_path "/terpkings" — guardrail #7).
 * The 21+ / marketing-consent checkbox is required by the API; it's rendered in
 * terminal style (the export had no consent line). Success shows the export's
 * "♛ TRANSMISSION CONFIRMED. LONG LIVE THE KINGS." box.
 */
export function TKSignupForm({
  compact = false,
  onSuccess,
}: {
  compact?: boolean;
  onSuccess?: (code: string | null) => void;
}) {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<
    | { status: "idle" | "loading" }
    | { status: "done"; code: string | null }
    | { status: "error"; message: string }
  >({ status: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setState({ status: "error", message: "> ERROR: ENTER A VALID OPERATOR EMAIL." });
      return;
    }
    if (!consent) {
      setState({ status: "error", message: "> ERROR: CONFIRM 21+ / EMAIL CONSENT TO ENLIST." });
      return;
    }
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sourcePath: pathname || "/terpkings", consent: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({
          status: "error",
          message: `> ERROR: ${String(body.error ?? "TRANSMISSION FAILED — RETRY.").toUpperCase()}`,
        });
        return;
      }
      const code = body.discountCode ?? null;
      setState({ status: "done", code });
      try {
        localStorage.setItem("ps_subscribed", "1");
      } catch {}
      onSuccess?.(code);
    } catch {
      setState({ status: "error", message: "> ERROR: NETWORK FAULT — RETRY." });
    }
  }

  if (state.status === "done") {
    return (
      <div className="flex w-full flex-col items-center gap-3">
        <div
          className="tk-mono rounded-[6px] border border-[#A8C64E] px-[26px] py-4 text-[21px] text-[#D8F26E]"
          style={{ background: "rgba(168,198,78,.1)" }}
        >
          {SIGNUP.confirmed}
        </div>
        {state.code ? (
          <p className="tk-mono m-0 text-[17px] tracking-[.06em] text-[#8A9E5C]">
            &gt; MERCH CODE: <span className="text-[#D8F26E]">{state.code}</span> — ONE-TIME 15%, MERCH &amp; APPAREL ONLY.
          </p>
        ) : (
          <p className="tk-mono m-0 text-[17px] tracking-[.06em] text-[#8A9E5C]">
            &gt; YOUR 15% MERCH CODE ARRIVES BY EMAIL WHEN THE SHOP OPENS.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col items-center gap-3" noValidate>
      <div className="flex w-full flex-wrap justify-center gap-3">
        <label htmlFor="tk-email" className="sr-only">
          Email address
        </label>
        <input
          id="tk-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={SIGNUP.placeholder}
          autoComplete="email"
          className={`tk-mono tk-input min-w-[240px] flex-1 px-[18px] tracking-[.06em] ${
            compact ? "py-[10px] text-[18px]" : "py-[13px] text-[20px]"
          }`}
        />
        <button
          type="submit"
          disabled={state.status === "loading"}
          className={`tk-mono tk-btn-solid cursor-pointer rounded-[4px] tracking-[.1em] disabled:opacity-60 ${
            compact ? "px-6 py-[10px] text-[19px]" : "px-[30px] py-[13px] text-[21px]"
          }`}
        >
          {state.status === "loading" ? "…" : SIGNUP.cta}
        </button>
      </div>
      <label className="tk-mono flex max-w-[560px] cursor-pointer items-start gap-2 text-left text-[15px] leading-[1.4] tracking-[.04em] text-[#5B6E35]">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-[3px] accent-[#A8C64E]"
        />
        <span>
          I&apos;M 21+ AND AGREE TO RECEIVE EMAIL MARKETING FROM PRIVATE STOCK. ONE-TIME 15% CODE
          VALID ON MERCH &amp; APPAREL ONLY, NOT COMBINABLE WITH OTHER PROMOTIONS.
        </span>
      </label>
      {state.status === "error" && (
        <p className="tk-mono m-0 text-[17px] tracking-[.06em] text-[#FF2E2E]" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}

"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/site/Logo";
import { brandBySlug, type BrandSlug } from "@/lib/brands";
import {
  AGE_COOKIE,
  getCookie,
  setCookie,
  subscribeCookies,
} from "@/lib/cookies";

/**
 * 21+ age gate (guardrail #6). One shared cookie sitewide: brand subpaths
 * reuse it; direct/forwarded entry without it shows the gate styled for that
 * brand (each styled after its reference site — Higher Self per capture, SSS
 * per its live gate copy, Outfitters in its black/gold language since the
 * original site had none). Server HTML always includes the gate; verified
 * visitors hydrate straight past it.
 */

const COOKIE_DAYS = 30;

export function useAgeVerified(): boolean {
  return useSyncExternalStore(
    subscribeCookies,
    () => getCookie(AGE_COOKIE) === "1",
    () => false,
  );
}

export function AgeGate() {
  const verified = useAgeVerified();
  const [refused, setRefused] = useState(false);
  const pathname = usePathname();
  const brand = brandBySlug(pathname.split("/").filter(Boolean)[0] ?? "");

  if (verified) return null;

  const accept = () => setCookie(AGE_COOKIE, "1", COOKIE_DAYS);
  const slug = brand?.slug as BrandSlug | undefined;

  if (slug === "higherself") {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-neutral-800/60 p-6 font-poppins backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-pages/higherself/logo.png"
            alt="higher self"
            className="mx-auto h-8 w-auto"
          />
          <h2 className="mt-4 text-2xl font-bold text-neutral-800">Welcome</h2>
          {refused ? (
            <p className="mt-3 text-sm text-neutral-500">
              You must be 21 or older to enter this site.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-neutral-500">
                You must be 21 or older to enter this site.
              </p>
              <button
                onClick={accept}
                className="mt-6 w-full rounded-full bg-[#8fd0f8] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6bbdf0]"
              >
                I&apos;m 21 or Older
              </button>
              <button
                onClick={() => setRefused(true)}
                className="mt-3 text-xs text-neutral-500 underline"
              >
                I am under 21
              </button>
              <p className="mt-4 text-[11px] leading-relaxed text-neutral-400">
                By entering this site you agree to our Terms of Service and
                Privacy Policy. Consume responsibly.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  if (slug === "savagesquadstrains") {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0d0a08] p-6 text-white">
        <div className="w-full max-w-md text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-pages/savagesquadstrains/logo-sss.png"
            alt="Savage Squad Strains"
            className="mx-auto h-16 w-auto"
          />
          {refused ? (
            <p className="mt-8 font-mono text-sm text-white/70">
              You must be 21 or older to enter this site.
            </p>
          ) : (
            <>
              <p className="mt-8 font-display text-4xl uppercase leading-tight">
                You Must Be{" "}
                <span className="bg-gradient-to-b from-[#ffb347] to-[#ff6a00] bg-clip-text text-transparent">
                  21+
                </span>{" "}
                To Enter
              </p>
              <p className="mx-auto mt-4 max-w-sm font-mono text-xs leading-relaxed text-white/60">
                By entering, you confirm you are of legal age to purchase or
                consume cannabis products in your state.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  onClick={accept}
                  className="w-full max-w-xs bg-gradient-to-r from-[#ff6a00] to-[#ffb347] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-neutral-950 shadow-[0_0_24px_rgba(255,106,0,0.5)] transition-transform hover:scale-[1.02]"
                >
                  I&apos;m 21 or Older — Enter
                </button>
                <button
                  onClick={() => setRefused(true)}
                  className="border border-white/30 px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-white/80 hover:bg-white/10"
                >
                  I&apos;m Under 21
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  if (slug === "outfitters") {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0d0c0a] p-6 text-[#f5f2ea]">
        <div className="w-full max-w-md text-center">
          <p className="font-condensed text-3xl font-semibold uppercase tracking-[0.35em]">
            Outfitters
          </p>
          <div className="mx-auto mt-4 flex items-center justify-center gap-3">
            <span className="h-px w-16 bg-[#b8860b]/60" />
            <span className="h-2 w-2 rotate-45 border border-[#b8860b]" />
            <span className="h-px w-16 bg-[#b8860b]/60" />
          </div>
          {refused ? (
            <p className="mt-8 text-sm text-white/70">
              You must be 21 or older to enter this site.
            </p>
          ) : (
            <>
              <p className="mt-8 font-condensed text-lg uppercase tracking-[0.2em]">
                Are you 21 or older?
              </p>
              <p className="mt-3 text-xs text-white/50">
                You must be of legal age in your state to enter.
              </p>
              <div className="mt-8 flex justify-center gap-3">
                <button
                  onClick={accept}
                  className="bg-[#b8860b] px-8 py-3 font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-neutral-950 transition-colors hover:bg-[#d09c17]"
                >
                  Enter
                </button>
                <button
                  onClick={() => setRefused(true)}
                  className="border border-white/40 px-8 py-3 font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-white hover:bg-white/10"
                >
                  I&apos;m Under 21
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Default Private Stock gate (also used for /terpkings until its design lands).
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-neutral-950 p-6 text-white">
      <div className="w-full max-w-md text-center">
        {brand ? (
          <p className="font-condensed text-3xl font-bold uppercase tracking-tight">
            {brand.name.toUpperCase()}
          </p>
        ) : (
          <Logo variant="white" className="mx-auto h-20 w-auto" />
        )}
        {refused ? (
          <p className="mt-10 text-sm leading-relaxed text-white/70">
            You must be 21 or older to enter this site.
          </p>
        ) : (
          <>
            <p className="mt-10 font-condensed text-xl font-semibold uppercase tracking-wide">
              ARE YOU 21 OR OLDER?
            </p>
            <p className="mt-3 text-xs text-white/50">
              You must be of legal age in your state to enter.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <button
                onClick={accept}
                className="min-w-28 bg-white px-6 py-3 font-condensed text-sm font-semibold uppercase tracking-wide text-neutral-950 hover:bg-white/85"
              >
                Yes
              </button>
              <button
                onClick={() => setRefused(true)}
                className="min-w-28 border border-white/30 px-6 py-3 font-condensed text-sm font-semibold uppercase tracking-wide text-white hover:bg-white/10"
              >
                No
              </button>
            </div>
          </>
        )}
        {brand && (
          <p className="mt-10 text-[10px] tracking-[0.3em] text-white/30">
            A PRIVATE STOCK BRAND
          </p>
        )}
      </div>
    </div>
  );
}

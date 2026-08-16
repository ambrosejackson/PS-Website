"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { brandBySlug } from "@/lib/brands";
import {
  AGE_COOKIE,
  getCookie,
  setCookie,
  subscribeCookies,
} from "@/lib/cookies";

/**
 * 21+ age gate (guardrail #6). Cookie-based and shared across the whole site:
 * brand subpaths reuse the cookie set on the main site; direct/forwarded entry
 * without it shows the gate styled for that brand. Server HTML always includes
 * the gate; verified visitors hydrate straight past it (no content flash for
 * unverified visitors).
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
              <Button
                size="lg"
                className="min-w-28 bg-white text-neutral-950 hover:bg-white/85"
                onClick={() => setCookie(AGE_COOKIE, "1", COOKIE_DAYS)}
              >
                Yes
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-w-28 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => setRefused(true)}
              >
                No
              </Button>
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

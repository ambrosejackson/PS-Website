"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
} from "react";
import {
  CONSENT_COOKIE,
  getCookie,
  setCookie,
  subscribeCookies,
} from "@/lib/cookies";
import { Button } from "@/components/ui/button";

/**
 * Cookie consent (guardrail #6): ALL non-essential scripts are gated behind
 * consent. Essential cookies (age gate, consent choice itself) are exempt.
 * Analytics are first-party only and load solely after "accept".
 */

export type ConsentState = "unknown" | "accepted" | "declined";

const ConsentContext = createContext<ConsentState>("unknown");

export function useConsent(): ConsentState {
  return useContext(ConsentContext);
}

function readConsent(): ConsentState {
  const v = getCookie(CONSENT_COOKIE);
  return v === "accepted" || v === "declined" ? v : "unknown";
}

export function ConsentProvider({
  children,
  ageGateAnswered,
}: {
  children: React.ReactNode;
  /** Consent banner waits for the age gate so overlays never stack. */
  ageGateAnswered: boolean;
}) {
  const consent = useSyncExternalStore(
    subscribeCookies,
    readConsent,
    () => "unknown" as const,
  );

  return (
    <ConsentContext.Provider value={consent}>
      {children}
      {consent === "unknown" && ageGateAnswered && (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-neutral-800 bg-neutral-950/95 p-4 text-white">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 md:flex-row md:justify-between">
            <p className="text-xs leading-relaxed text-white/70">
              We use a small number of cookies to run this site. With your OK,
              we also use first-party analytics to understand what&apos;s
              working — nothing is shared with third parties.
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={() => setCookie(CONSENT_COOKIE, "declined", 365)}
              >
                Essential only
              </Button>
              <Button
                size="sm"
                className="bg-white text-neutral-950 hover:bg-white/85"
                onClick={() => setCookie(CONSENT_COOKIE, "accepted", 365)}
              >
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConsentContext.Provider>
  );
}

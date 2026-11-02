"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useConsent } from "@/components/site/ConsentProvider";
import { send } from "@/lib/analytics/client";

/**
 * First-party analytics only (guardrail #6): events go to our own web_events
 * table via /api/events. Loads nothing and sends nothing until consent is
 * accepted. No third-party scripts, ever. The emitter itself lives in
 * lib/analytics/client.ts (D-140); this component owns pageviews and
 * `data-track` clicks.
 */

// Existing call sites import trackEvent from here; keep that path working.
export { trackEvent } from "@/lib/analytics/client";

export function Analytics() {
  const consent = useConsent();
  const pathname = usePathname();

  useEffect(() => {
    if (consent !== "accepted") return;
    send({ path: pathname, eventType: "pageview" });
  }, [consent, pathname]);

  useEffect(() => {
    if (consent !== "accepted") return;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-track]");
      if (!el) return;
      send({
        path: window.location.pathname,
        eventType: "click",
        element: el.getAttribute("data-track"),
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [consent]);

  return null;
}

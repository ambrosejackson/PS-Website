"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useConsent } from "@/components/site/ConsentProvider";

/**
 * First-party analytics only (guardrail #6): events go to our own web_events
 * table via /api/events. Loads nothing and sends nothing until consent is
 * accepted. No third-party scripts, ever.
 */

const SESSION_KEY = "ps_session_id";

function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function utmParams(): Record<string, string> | null {
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const [k, v] of params) {
    if (k.startsWith("utm_")) utm[k] = v;
  }
  return Object.keys(utm).length > 0 ? utm : null;
}

function send(event: {
  path: string;
  eventType: string;
  element?: string | null;
}) {
  const body = JSON.stringify({
    events: [
      {
        sessionId: sessionId(),
        referrer: document.referrer || null,
        utm: utmParams(),
        ...event,
      },
    ],
  });
  fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

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

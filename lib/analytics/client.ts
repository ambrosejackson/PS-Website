"use client";

import { CONSENT_COOKIE, getCookie } from "@/lib/cookies";
import { brandFromPath, deviceFromWidth, EVENT, type Props } from "@/lib/analytics/schema";

/**
 * First-party analytics emitter (guardrail #6, D-140). Everything here is a
 * no-op until the consent cookie says "accepted": no cookie is written, no
 * request is sent. Events go to our own web_events table via /api/events.
 *
 * Identity:
 *  - session_id: UUID in sessionStorage (tab lifetime). Unchanged from v1.
 *  - visitor_id: UUID in the first-party cookie `ps_vid` (1 year, SameSite=Lax,
 *    Secure, readable by this script). Random — nothing derived from the user.
 */

const SESSION_KEY = "ps_session_id";
export const VISITOR_COOKIE = "ps_vid";
const VISITOR_MAX_AGE = 365 * 86400;

function consented(): boolean {
  return getCookie(CONSENT_COOKIE) === "accepted";
}

function sessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function visitorId(): string {
  let id = getCookie(VISITOR_COOKIE);
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = crypto.randomUUID();
    // Not HttpOnly on purpose: this emitter reads it. Secure works on localhost too.
    document.cookie = `${VISITOR_COOKIE}=${id}; path=/; max-age=${VISITOR_MAX_AGE}; samesite=lax; secure`;
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

/** Ids for server-side attribution (checkout → purchase). Nulls until consent. */
export function getAnalyticsIds(): { sessionId: string | null; visitorId: string | null } {
  try {
    if (!consented()) return { sessionId: null, visitorId: null };
    return { sessionId: sessionId(), visitorId: visitorId() };
  } catch {
    return { sessionId: null, visitorId: null };
  }
}

interface Emit {
  path: string;
  eventType: string;
  element?: string | null;
  props?: Props;
}

/** Low-level send. Callers must have checked consent; this re-checks anyway. */
export function send(event: Emit) {
  try {
    if (!consented()) return;
    const body = JSON.stringify({
      events: [
        {
          sessionId: sessionId(),
          visitorId: visitorId(),
          device: deviceFromWidth(window.innerWidth),
          brand: brandFromPath(event.path),
          referrer: document.referrer || null,
          utm: utmParams(),
          path: event.path,
          eventType: event.eventType,
          element: event.element ?? null,
          ...(event.props ? { props: event.props } : {}),
        },
      ],
    });
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* storage or cookies unavailable — analytics must never break the page */
  }
}

/**
 * Named first-party event. `detail` lands in web_events.element as a short
 * JSON string (legacy, low-cardinality fields only); `props` is the typed
 * jsonb payload added in P2. Never pass free text or personal data to either.
 */
export function trackEvent(eventType: string, detail?: Record<string, string>, props?: Props) {
  send({
    path: window.location.pathname,
    eventType,
    element: detail ? JSON.stringify(detail) : null,
    props,
  });
}

export function trackProductView(productId: string, kind: "merch" | "apparel" | "catalog") {
  trackEvent(EVENT.productView, undefined, { product_id: productId, kind });
}

export function trackAddToCart(input: { productId: string; variantId: string; qty: number; cents: number }) {
  trackEvent(EVENT.addToCart, undefined, {
    product_id: input.productId,
    variant_id: input.variantId,
    qty: input.qty,
    cents: input.cents,
  });
}

export function trackCheckoutStart(input: { cents: number; items: number; rail: "stripe" | "paypal" }) {
  trackEvent(EVENT.checkoutStart, undefined, { cents: input.cents, items: input.items, rail: input.rail });
}

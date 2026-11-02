"use client";

import { Analytics } from "@vercel/analytics/next";
import { useConsent } from "@/components/site/ConsentProvider";

/**
 * Vercel Web Analytics (D-140, Step 5). Guardrail #6 gates every non-essential
 * script behind cookie consent, so the Vercel script mounts only after
 * "accept" — nothing loads for unknown or declined. Our own web_events capture
 * (components/site/Analytics.tsx) stays the source of truth for the admin.
 */
export function VercelAnalytics() {
  const consent = useConsent();
  if (consent !== "accepted") return null;
  return <Analytics />;
}

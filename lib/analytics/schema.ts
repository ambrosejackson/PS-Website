import { BRAND_SLUGS } from "@/lib/brands";

/**
 * Shared vocabulary for first-party analytics (D-140). Pure: imported by the
 * browser emitter, the /api/events validator and the rollup cron.
 *
 * Privacy rule: nothing in web_events identifies a person. Props carry ids,
 * counts and cents only — the validator rejects email- or phone-shaped values.
 */

export const DEVICES = ["mobile", "tablet", "desktop"] as const;
export type Device = (typeof DEVICES)[number];

/** Brand context derived from the first path segment. `apparel` counts as a brand surface. */
export const ANALYTICS_BRANDS = [...BRAND_SLUGS, "apparel"] as const;
export type AnalyticsBrand = (typeof ANALYTICS_BRANDS)[number];

/** Event names this phase adds. Existing names (pageview, click, king_select, comic_*) are untouched. */
export const EVENT = {
  pageview: "pageview",
  click: "click",
  productView: "product_view",
  addToCart: "add_to_cart",
  checkoutStart: "checkout_start",
  purchase: "purchase",
} as const;

export const EVENT_TYPE_RE = /^[a-z0-9_]{1,64}$/;
export const PROPS_MAX_BYTES = 2048;
export const ID_MAX_LEN = 64;

export function isDevice(v: unknown): v is Device {
  return typeof v === "string" && (DEVICES as readonly string[]).includes(v);
}

export function isAnalyticsBrand(v: unknown): v is AnalyticsBrand {
  return typeof v === "string" && (ANALYTICS_BRANDS as readonly string[]).includes(v);
}

export function brandFromPath(path: string | null | undefined): AnalyticsBrand | null {
  if (!path) return null;
  const first = path.split("?")[0].split("/")[1]?.toLowerCase() ?? "";
  return isAnalyticsBrand(first) ? first : null;
}

export function deviceFromWidth(width: number): Device {
  if (width < 640) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
/** Seven or more digits allowing common separators — phone-shaped. */
const PHONE_RE = /(?:\d[\s().-]*){7,}/;

export type Props = Record<string, string | number | boolean | null>;

/** Hostname of a referrer URL, without a leading "www."; null if unparsable. */
export function referrerHost(referrer: string): string | null {
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return host.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/** Our own hosts never count as referrers. */
export function isOwnHost(host: string): boolean {
  return host === "privatestock.co" || host.endsWith(".privatestock.co") || host === "localhost";
}

/**
 * Accepts a small, flat object of primitives with no email/phone-shaped
 * strings. Returns the cleaned props or null when the value is unacceptable.
 */
export function validateProps(v: unknown): Props | null | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "object" || Array.isArray(v)) return null;
  const out: Props = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (!/^[a-z0-9_]{1,32}$/.test(k)) return null;
    if (val === null || typeof val === "boolean" || typeof val === "number") {
      if (typeof val === "number" && !Number.isFinite(val)) return null;
      out[k] = val;
      continue;
    }
    if (typeof val === "string") {
      if (val.length > 256 || EMAIL_RE.test(val) || PHONE_RE.test(val)) return null;
      out[k] = val;
      continue;
    }
    return null;
  }
  if (JSON.stringify(out).length > PROPS_MAX_BYTES) return null;
  return out;
}

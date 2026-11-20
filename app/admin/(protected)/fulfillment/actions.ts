"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { revalidateFor, type RevalidateTarget } from "@/lib/revalidate";
import { isPod, isProviderKey } from "@/lib/commerce/providers";

/**
 * /admin/fulfillment — settings for the print-on-demand vendors (D-146). One row
 * per `fulfillment_providers` key; `self` has no row. Service-role reads/writes
 * behind the staff allowlist, same pattern as /admin/apparel. Saving revalidates
 * every product page that carries the provider, because the made-to-order line
 * (D-147) is rendered into those ISR pages.
 */

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

export interface ProviderInput {
  key: string;
  label: string;
  /** "" = none; otherwise must be https. */
  dashboard_url: string;
  /** Whole business days as typed; "" = unknown. */
  production_days_min: string;
  production_days_max: string;
  is_active: boolean;
}

/** Whole number ≥ 0 (≤ 365), null for blank, false when invalid. */
function parseDays(v: string): number | null | false {
  const s = (v ?? "").trim();
  if (!s) return null;
  if (!/^\d{1,3}$/.test(s)) return false;
  const n = Number(s);
  return n <= 365 ? n : false;
}

export async function saveProvider(input: ProviderInput): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  if (!isProviderKey(input.key) || !isPod(input.key)) return { ok: false, error: "Unknown provider." };

  const label = (input.label ?? "").trim().slice(0, 80);
  if (!label) return { ok: false, error: "Label is required." };

  let url: string | null = null;
  const rawUrl = (input.dashboard_url ?? "").trim();
  if (rawUrl) {
    let parsed: URL | null = null;
    try {
      parsed = new URL(rawUrl);
    } catch {
      parsed = null;
    }
    if (!parsed || parsed.protocol !== "https:") return { ok: false, error: "Dashboard URL must start with https://." };
    url = rawUrl.slice(0, 500);
  }

  const min = parseDays(input.production_days_min);
  const max = parseDays(input.production_days_max);
  if (min === false || max === false) return { ok: false, error: "Production days must be whole numbers from 0 to 365, or blank." };
  if (min !== null && max !== null && min > max) return { ok: false, error: "Minimum days cannot exceed maximum days." };

  const db = createAdminClient();
  const { data, error } = await db
    .from("fulfillment_providers")
    .update({
      label,
      dashboard_url: url,
      production_days_min: min,
      production_days_max: max,
      is_active: !!input.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("key", input.key)
    .select("key");
  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Provider row not found — apply migration 20261120120000_pod_providers.sql first." };
  }

  // The made-to-order line lives on each POD product's page, the shop grids and the cart snapshot source.
  const { data: products } = await db.from("merch_products").select("slug").eq("fulfillment_provider", input.key);
  const targets: RevalidateTarget[] = [{ kind: "apparel" }, ...(products ?? []).map((p) => ({ kind: "apparel" as const, slug: p.slug }))];
  revalidateFor(...targets);
  return { ok: true, data: undefined };
}

import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/database.types";
import { isPod, madeToOrderLine } from "@/lib/commerce/providers";

/**
 * Server-only reads of `fulfillment_providers` (D-146). The table has RLS on and
 * no policies, so it is reachable only with the service-role client. Every
 * failure (missing key, table not yet migrated, network) degrades to "no rows":
 * POD products then show the bare "Made to order" line and the admin shows an
 * empty settings page rather than a crash.
 */

export type ProviderRow = Database["public"]["Tables"]["fulfillment_providers"]["Row"];

export async function loadProviders(): Promise<ProviderRow[]> {
  try {
    const { data, error } = await createAdminClient().from("fulfillment_providers").select("*").order("label", { ascending: true }).order("key", { ascending: true });
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/** key → row, deduplicated per server render (React cache). */
export const getProviderMap = cache(async (): Promise<Map<string, ProviderRow>> => {
  const rows = await loadProviders();
  return new Map(rows.map((r) => [r.key, r]));
});

/**
 * The only provider-derived value a public page may receive: the finished line
 * for a POD product, or null for in-house products.
 */
export async function resolveMadeToOrder(providerKey: string | null | undefined): Promise<string | null> {
  if (!isPod(providerKey)) return null;
  const map = await getProviderMap();
  return madeToOrderLine(map.get(providerKey!) ?? null);
}

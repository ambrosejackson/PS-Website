import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BRAND_NAMES } from "@/lib/brands";
import { revalidatePath } from "next/cache";

/**
 * PSM → website publish receiver (D-058).
 *
 * The website never holds a PSM credential and never reaches into the PSM
 * project. PSM's `publish_store_locator()` (pg_cron + pg_net) POSTs a curated
 * payload here with `Authorization: Bearer <PSM_PUBLISH_SECRET>`; this route
 * validates it, replaces `store_locations` + `product_availability`, and
 * revalidates the pages that read them.
 *
 * Fail-closed rules:
 *   - unknown keys on any row  → 400, nothing written (a future PSM-side column
 *     cannot quietly start leaking price/cost data into a public table)
 *   - zero stores              → 400, nothing deleted (a broken upstream run
 *     must not empty the locator)
 *   - off-allowlist brands     → dropped silently (second gate; the view filters too)
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STORE_KEYS = new Set([
  "id", "name", "chain_name", "address_line1", "address_line2", "city", "state", "zip",
  "latitude", "longitude", "phone", "menu_url", "brands",
  "last_delivery_within_90d", "availability_tier", "availability_checked_at",
]);

const AVAIL_KEYS = new Set([
  "store_id", "brand", "product_name", "variant", "menu_product_url", "image_url", "checked_at",
]);

/** Belt and braces: no price-shaped key may ever reach a public table. */
const FORBIDDEN = /price|msrp|discount|cost|amount|w9|licen|scheduling|contact/i;

const ALLOWED_BRANDS = new Set(BRAND_NAMES.map((b) => b.toLowerCase()));
const TIERS = new Set(["live", "recent", "listed"]);

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function checkKeys(rows: unknown, allowed: Set<string>, label: string): string | null {
  if (!Array.isArray(rows)) return `${label} must be an array.`;
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) return `${label} rows must be objects.`;
    for (const key of Object.keys(row as object)) {
      if (FORBIDDEN.test(key)) return `${label}: forbidden key "${key}".`;
      if (!allowed.has(key)) return `${label}: unexpected key "${key}".`;
    }
  }
  return null;
}

export async function POST(request: Request) {
  const secret = process.env.PSM_PUBLISH_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || !timingSafeEqual(header, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { stores?: unknown; availability?: unknown; generated_at?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const storeErr = checkKeys(body.stores, STORE_KEYS, "stores");
  if (storeErr) return NextResponse.json({ error: storeErr }, { status: 400 });
  const availErr = checkKeys(body.availability ?? [], AVAIL_KEYS, "availability");
  if (availErr) return NextResponse.json({ error: availErr }, { status: 400 });

  const stores: Record<string, unknown>[] = (body.stores as Record<string, unknown>[]).map((s) => ({
    ...s,
    brands: (Array.isArray(s.brands) ? (s.brands as string[]) : []).filter((b) =>
      ALLOWED_BRANDS.has(String(b).toLowerCase()),
    ),
    availability_tier: TIERS.has(String(s.availability_tier)) ? s.availability_tier : "listed",
  }));

  if (stores.length === 0) {
    return NextResponse.json(
      { error: "Refusing to publish an empty store set — nothing was changed." },
      { status: 400 },
    );
  }

  const storeIds = new Set(stores.map((s) => String(s.id)));
  const availability = (body.availability as Record<string, unknown>[] | undefined ?? []).filter(
    (a) => storeIds.has(String(a.store_id)) && ALLOWED_BRANDS.has(String(a.brand).toLowerCase()),
  );

  const supabase = createAdminClient();

  // 1. Upsert stores first — product_availability.store_id references them.
  const { error: upsertStores } = await supabase
    .from("store_locations")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(stores as any, { onConflict: "id" });
  if (upsertStores) {
    return NextResponse.json({ error: `stores upsert: ${upsertStores.message}` }, { status: 500 });
  }

  // 2. Availability is replaced wholesale — a product that left a menu must vanish.
  const { error: clearAvail } = await supabase
    .from("product_availability")
    .delete()
    .not("store_id", "is", null);
  if (clearAvail) {
    return NextResponse.json({ error: `availability clear: ${clearAvail.message}` }, { status: 500 });
  }
  if (availability.length > 0) {
    const { error: insertAvail } = await supabase
      .from("product_availability")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(availability as any, { onConflict: "store_id,brand,product_name,variant" });
    if (insertAvail) {
      return NextResponse.json({ error: `availability insert: ${insertAvail.message}` }, { status: 500 });
    }
  }

  // 3. Drop stores that fell out of the publish set (mock rows included).
  const { error: pruneStores, count: pruned } = await supabase
    .from("store_locations")
    .delete({ count: "exact" })
    .not("id", "in", `(${[...storeIds].join(",")})`);
  if (pruneStores) {
    return NextResponse.json({ error: `stores prune: ${pruneStores.message}` }, { status: 500 });
  }

  for (const path of ["/", "/store-locator", "/products"]) revalidatePath(path);

  return NextResponse.json({
    ok: true,
    generated_at: body.generated_at ?? null,
    stores: stores.length,
    availability: availability.length,
    pruned: pruned ?? 0,
  });
}

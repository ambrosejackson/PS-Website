"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/allowlist";
import { getStripe, stripeConfigured } from "@/lib/commerce/stripe";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export interface SubscriberFilters {
  q?: string;
  brand?: string;
  persona?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
}

export interface SubscriberListRow {
  id: string;
  email: string;
  persona: string;
  brand_context: string | null;
  source_path: string;
  consented_at: string;
  synced_to_psm_at: string | null;
  code: string | null;
  redeemed_at: string | null;
  expires_at: string | null;
  stripe_promotion_code_id: string | null;
}

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
}

/** Shared query for the page and the CSV export (same filters → same rows). */
export async function listSubscribers(f: SubscriberFilters, limit = 2000): Promise<SubscriberListRow[]> {
  const db = createAdminClient();
  let q = db
    .from("subscribers")
    .select(
      "id, email, persona, brand_context, source_path, consented_at, synced_to_psm_at, discount_codes!subscribers_discount_code_fk(code, redeemed_at, expires_at, stripe_promotion_code_id)",
    )
    .order("consented_at", { ascending: false })
    .limit(limit);
  const needle = f.q?.trim();
  if (needle) q = q.ilike("email", `%${needle}%`);
  if (f.brand) q = q.eq("brand_context", f.brand);
  if (f.persona) q = q.eq("persona", f.persona);
  if (f.from) q = q.gte("consented_at", `${f.from}T00:00:00Z`);
  if (f.to) q = q.lte("consented_at", `${f.to}T23:59:59Z`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const dc = (Array.isArray(r.discount_codes) ? r.discount_codes[0] : r.discount_codes) as
      | { code: string; redeemed_at: string | null; expires_at: string | null; stripe_promotion_code_id: string }
      | null
      | undefined;
    return {
      id: r.id,
      email: r.email,
      persona: r.persona,
      brand_context: r.brand_context,
      source_path: r.source_path,
      consented_at: r.consented_at,
      synced_to_psm_at: r.synced_to_psm_at,
      code: dc?.code ?? null,
      redeemed_at: dc?.redeemed_at ?? null,
      expires_at: dc?.expires_at ?? null,
      stripe_promotion_code_id: dc?.stripe_promotion_code_id ?? null,
    };
  });
}

function csvCell(v: string | null | undefined): string {
  const s = v ?? "";
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV of the current filtered view (same query as the table). */
export async function exportSubscribersCsv(f: SubscriberFilters): Promise<ActionResult<{ csv: string; count: number }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  try {
    const rows = await listSubscribers(f, 10000);
    const header = ["email", "persona", "brand_context", "source_path", "consented_at", "discount_code", "code_status", "synced_to_psm_at"];
    const lines = rows.map((r) =>
      [
        r.email,
        r.persona,
        r.brand_context,
        r.source_path,
        r.consented_at,
        r.code,
        r.code ? (r.redeemed_at ? "redeemed" : r.expires_at && new Date(r.expires_at) < new Date() ? "expired" : "unused") : "",
        r.synced_to_psm_at,
      ]
        .map(csvCell)
        .join(","),
    );
    return { ok: true, data: { csv: [header.join(","), ...lines].join("\r\n"), count: rows.length } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Export failed." };
  }
}

/**
 * Removal request: delete the subscriber row and expire the linked discount
 * code (expires_at = now) + deactivate its Stripe promotion code when one
 * exists and Stripe is configured (stub ids are skipped).
 */
export async function deleteSubscriber(id: string): Promise<ActionResult<{ stripeDeactivated: boolean }>> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized." };
  const db = createAdminClient();
  const { data: sub } = await db.from("subscribers").select("id, discount_code_id").eq("id", id).maybeSingle();
  if (!sub) return { ok: false, error: "Subscriber not found." };
  let stripeDeactivated = false;
  if (sub.discount_code_id) {
    const { data: dc } = await db.from("discount_codes").select("id, stripe_promotion_code_id, redeemed_at").eq("id", sub.discount_code_id).maybeSingle();
    if (dc) {
      await db.from("discount_codes").update({ expires_at: new Date().toISOString() }).eq("id", dc.id);
      if (dc.stripe_promotion_code_id && !dc.stripe_promotion_code_id.startsWith("stub") && stripeConfigured()) {
        try {
          await getStripe().promotionCodes.update(dc.stripe_promotion_code_id, { active: false });
          stripeDeactivated = true;
        } catch (e) {
          console.error("[subscribers] stripe promo deactivate failed:", e instanceof Error ? e.message : e);
        }
      }
    }
  }
  const { error } = await db.from("subscribers").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/subscribers");
  return { ok: true, data: { stripeDeactivated } };
}

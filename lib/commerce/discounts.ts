import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createStripePromotionCode, deactivateStripePromotionCode, stripeConfigured } from "@/lib/commerce/stripe";
import { chicagoDayStart, shiftDayKey } from "@/lib/admin/chicago";
import { MAX_CODES_PER_BATCH, discountStatus, generateCode, type DiscountStatus } from "@/lib/commerce/discount-codes";

/**
 * Discount codes (D-142). One model only: single-use percent codes backed by a
 * Stripe promotion code (max_redemptions 1) on a per-percentage coupon.
 *  - Newsletter codes: created by lib/newsletter/subscribe.ts, subscriber_id
 *    set, first order only.
 *  - Admin codes: created from /admin/discounts, subscriber_id NULL, no
 *    first-order rule. `subscriber_id IS NULL` is the admin marker.
 * Multi-use and fixed-amount codes need schema changes and are out of scope.
 */

type Db = SupabaseClient<Database>;

export const STUB_PROMOTION_ID = "stub_pending_stripe";
export const DISCOUNTS_PAGE_SIZE = 50;

export {
  DISCOUNT_STATUSES,
  DISCOUNT_STATUS_LABEL,
  MAX_CODES_PER_BATCH,
  discountStatus,
  generateCode,
  isDiscountStatus,
  type DiscountStatus,
} from "@/lib/commerce/discount-codes";

/**
 * Expire a code now: expires_at = now() and the Stripe promotion code set
 * inactive so it also fails on Stripe's hosted page. Idempotent: an already
 * expired row keeps its original expires_at; Stripe is still asked to
 * deactivate (safe to repeat). Shared by the Discounts page and the
 * subscriber removal flow.
 */
export async function expireDiscountCode(
  db: Db,
  id: string,
): Promise<{ found: boolean; alreadyExpired: boolean; stripeDeactivated: boolean }> {
  const { data: dc } = await db
    .from("discount_codes")
    .select("id, stripe_promotion_code_id, redeemed_at, expires_at")
    .eq("id", id)
    .maybeSingle();
  if (!dc) return { found: false, alreadyExpired: false, stripeDeactivated: false };
  const alreadyExpired = discountStatus(dc) === "expired";
  if (!alreadyExpired) {
    const { error } = await db.from("discount_codes").update({ expires_at: new Date().toISOString() }).eq("id", dc.id);
    if (error) throw new Error(error.message);
  }
  let stripeDeactivated = false;
  try {
    stripeDeactivated = await deactivateStripePromotionCode(dc.stripe_promotion_code_id);
  } catch (e) {
    console.error("[discounts] stripe promo deactivate failed:", e instanceof Error ? e.message : e);
  }
  return { found: true, alreadyExpired, stripeDeactivated };
}

export interface CreateDiscountsInput {
  pct: number;
  count: number;
  /** YYYY-MM-DD (Chicago); the code is valid through the end of that day. */
  expiresOn?: string | null;
}

export function parseCreateDiscountsInput(raw: { pct?: unknown; count?: unknown; expiresOn?: unknown }):
  | { ok: true; input: CreateDiscountsInput }
  | { ok: false; error: string } {
  const pct = Number(raw.pct);
  const count = Number(raw.count);
  if (!Number.isInteger(pct) || pct < 1 || pct > 100) return { ok: false, error: "Percent must be a whole number from 1 to 100." };
  if (!Number.isInteger(count) || count < 1 || count > MAX_CODES_PER_BATCH) {
    return { ok: false, error: `Count must be a whole number from 1 to ${MAX_CODES_PER_BATCH}.` };
  }
  const expiresOn = typeof raw.expiresOn === "string" && raw.expiresOn.trim() ? raw.expiresOn.trim() : null;
  if (expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn)) return { ok: false, error: "Expiry must be a date." };
  return { ok: true, input: { pct, count, expiresOn } };
}

/** End of the given Chicago day (the last instant the code is valid). */
export function expiryFromDay(expiresOn: string | null | undefined): Date | null {
  if (!expiresOn) return null;
  return new Date(chicagoDayStart(shiftDayKey(expiresOn, 1)).getTime() - 1);
}

export interface CreatedDiscounts {
  codes: string[];
  pct: number;
  expiresAt: string | null;
  /** Set when Stripe refused part-way; `codes` are the ones that exist. */
  error?: string;
}

/**
 * Create `count` admin codes. Each gets its own row and its own Stripe
 * promotion code (stub id when Stripe is unset, created lazily at checkout
 * like the newsletter flow). A code collision retries with a fresh code.
 */
export async function createAdminDiscountCodes(input: CreateDiscountsInput): Promise<CreatedDiscounts> {
  const db = createAdminClient();
  const expiresAt = expiryFromDay(input.expiresOn);
  if (expiresAt && expiresAt.getTime() <= Date.now()) throw new Error("Expiry must be today or later.");
  const codes: string[] = [];
  for (let i = 0; i < input.count; i++) {
    let inserted = false;
    for (let attempt = 0; attempt < 3 && !inserted; attempt++) {
      const code = generateCode(input.pct);
      const { count: taken } = await db.from("discount_codes").select("id", { count: "exact", head: true }).eq("code", code);
      if ((taken ?? 0) > 0) continue;
      let stripeId = STUB_PROMOTION_ID;
      if (stripeConfigured()) {
        try {
          stripeId = await createStripePromotionCode(code, { kind: "admin", pct: input.pct, expiresAt });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Stripe error";
          return {
            codes,
            pct: input.pct,
            expiresAt: expiresAt?.toISOString() ?? null,
            error: `Stripe refused after ${codes.length} code(s): ${msg}`,
          };
        }
      }
      const { error } = await db.from("discount_codes").insert({
        subscriber_id: null,
        code,
        pct: input.pct,
        stripe_promotion_code_id: stripeId,
        expires_at: expiresAt?.toISOString() ?? null,
      });
      if (error) {
        if (error.code === "23505") continue; // raced on the unique code; try again
        throw new Error(error.message);
      }
      codes.push(code);
      inserted = true;
    }
    if (!inserted) throw new Error("Could not generate a unique code; try again.");
  }
  return { codes, pct: input.pct, expiresAt: expiresAt?.toISOString() ?? null };
}

export interface DiscountFilters {
  status?: DiscountStatus | "";
  q?: string;
  page?: number;
}

export interface DiscountListRow {
  id: string;
  code: string;
  pct: number;
  status: DiscountStatus;
  subscriberEmail: string | null;
  /** Subscriber consent time for newsletter codes; admin rows have no timestamp column. */
  createdAt: string | null;
  expiresAt: string | null;
  redeemedAt: string | null;
  redeemedOrderId: string | null;
}

export interface DiscountList {
  rows: DiscountListRow[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Paged list, newest first. discount_codes has no created_at column, so
 * ordering falls back to the row id and "created" shows the linked
 * subscriber's consent time where there is one. Search matches the code or
 * the subscriber email.
 */
export async function listDiscountCodes(f: DiscountFilters): Promise<DiscountList> {
  const db = createAdminClient();
  const page = Math.max(1, Math.floor(f.page ?? 1));
  const nowIso = new Date().toISOString();
  let q = db
    .from("discount_codes")
    .select("id, code, pct, redeemed_at, expires_at, subscriber_id, subscribers!discount_codes_subscriber_id_fkey(email, consented_at)", {
      count: "exact",
    })
    // No created_at on discount_codes: admin rows (no subscriber) first, then newsletter codes by consent time.
    .order("subscribers(consented_at)", { ascending: false, nullsFirst: true })
    .order("code", { ascending: true })
    .range((page - 1) * DISCOUNTS_PAGE_SIZE, page * DISCOUNTS_PAGE_SIZE - 1);

  if (f.status === "redeemed") q = q.not("redeemed_at", "is", null);
  else if (f.status === "expired") q = q.is("redeemed_at", null).lte("expires_at", nowIso);
  else if (f.status === "open") q = q.is("redeemed_at", null).or(`expires_at.is.null,expires_at.gt.${nowIso}`);

  const needle = (f.q ?? "").trim().replace(/[^A-Za-z0-9@._+-]/g, "");
  if (needle) {
    const { data: subs } = await db.from("subscribers").select("id").ilike("email", `%${needle}%`).limit(200);
    const ids = (subs ?? []).map((s) => s.id);
    q = ids.length > 0 ? q.or(`code.ilike.%${needle}%,subscriber_id.in.(${ids.join(",")})`) : q.ilike("code", `%${needle}%`);
  }

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  const orderByCode = new Map<string, string>();
  const redeemedIds = rows.filter((r) => r.redeemed_at).map((r) => r.id);
  if (redeemedIds.length > 0) {
    const { data: orders } = await db
      .from("orders")
      .select("id, discount_code_id")
      .in("discount_code_id", redeemedIds)
      .not("status", "in", "(pending,failed)");
    for (const o of orders ?? []) {
      if (o.discount_code_id && !orderByCode.has(o.discount_code_id)) orderByCode.set(o.discount_code_id, o.id);
    }
  }

  return {
    rows: rows.map((r) => {
      const sub = (Array.isArray(r.subscribers) ? r.subscribers[0] : r.subscribers) as
        | { email: string; consented_at: string }
        | null
        | undefined;
      return {
        id: r.id,
        code: r.code,
        pct: r.pct,
        status: discountStatus(r),
        subscriberEmail: sub?.email ?? null,
        createdAt: sub?.consented_at ?? null,
        expiresAt: r.expires_at,
        redeemedAt: r.redeemed_at,
        redeemedOrderId: orderByCode.get(r.id) ?? null,
      };
    }),
    total: count ?? rows.length,
    page,
    pageSize: DISCOUNTS_PAGE_SIZE,
  };
}

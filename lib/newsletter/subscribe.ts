import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { personaForPath } from "@/lib/personas";
import { createStripePromotionCode, stripeConfigured } from "@/lib/commerce/stripe";

/**
 * Core of the newsletter signup, shared by POST /api/subscribe and the account
 * signup opt-in (auth callback). Inserts into subscribers with persona /
 * brand_context / source_path (guardrail #7) and issues a unique single-use 15%
 * merch code. An address that is already subscribed is left untouched and its
 * existing code is returned.
 *
 * Callers own validation and consent: only call this with a well-formed,
 * lowercased email and after the visitor has explicitly opted in.
 */

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const suffix = Array.from(bytes)
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join("");
  return `PS15-${suffix}`;
}

export type SubscribeResult =
  | { ok: true; alreadySubscribed: boolean; discountCode: string | null }
  | { ok: false };

export async function subscribeEmail(
  supabase: SupabaseClient<Database>,
  { email, sourcePath }: { email: string; sourcePath: string },
): Promise<SubscribeResult> {
  // Already subscribed? Return their existing code rather than erroring.
  const { data: existing } = await supabase
    .from("subscribers")
    .select("id, discount_code_id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    let code: string | null = null;
    if (existing.discount_code_id) {
      const { data: dc } = await supabase
        .from("discount_codes")
        .select("code")
        .eq("id", existing.discount_code_id)
        .maybeSingle();
      code = dc?.code ?? null;
    }
    return { ok: true, alreadySubscribed: true, discountCode: code };
  }

  const { persona, brandContext } = personaForPath(sourcePath);

  const { data: subscriber, error: subError } = await supabase
    .from("subscribers")
    .insert({
      email,
      persona,
      source_path: sourcePath,
      brand_context: brandContext,
      consent_marketing: true,
    })
    .select("id")
    .single();

  if (subError || !subscriber) return { ok: false };

  // Unique single-use 15% code. With STRIPE_SECRET_KEY present the real Stripe
  // promotion code is created now (max_redemptions 1, first_time_transaction);
  // without it the row keeps a stub id and lib/commerce/pricing.validatePromo
  // creates the Stripe side lazily the first time the code is used.
  const code = generateCode();
  let stripePromotionCodeId = "stub_pending_stripe";
  if (stripeConfigured()) {
    try {
      stripePromotionCodeId = await createStripePromotionCode(code);
    } catch (e) {
      console.error("[subscribe] Stripe promotion code failed:", e instanceof Error ? e.message : e);
    }
  }

  const { data: discount, error: codeError } = await supabase
    .from("discount_codes")
    .insert({
      subscriber_id: subscriber.id,
      code,
      pct: 15,
      stripe_promotion_code_id: stripePromotionCodeId,
    })
    .select("id")
    .single();

  if (!codeError && discount) {
    await supabase
      .from("subscribers")
      .update({ discount_code_id: discount.id })
      .eq("id", subscriber.id);
  }

  return { ok: true, alreadySubscribed: false, discountCode: codeError ? null : code };
}

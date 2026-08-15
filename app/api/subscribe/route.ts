import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { personaForPath } from "@/lib/personas";

/**
 * Newsletter signup: inserts into subscribers with persona / brand_context /
 * source_path (guardrail #7) and issues a unique single-use 15% merch code.
 * Stripe promotion-code creation is stubbed behind STRIPE_ENABLED until the
 * Stripe account exists (decision 6: first_time_transaction, not stackable).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  const suffix = Array.from(bytes)
    .map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
    .join("");
  return `PS15-${suffix}`;
}

export async function POST(request: Request) {
  let body: { email?: string; sourcePath?: string; consent?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const sourcePath = typeof body.sourcePath === "string" ? body.sourcePath : "/";
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (body.consent !== true) {
    return NextResponse.json(
      { error: "Marketing consent is required to join the list." },
      { status: 400 },
    );
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "Signups aren't live yet — please try again soon." },
      { status: 503 },
    );
  }

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
    return NextResponse.json({ ok: true, alreadySubscribed: true, discountCode: code });
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

  if (subError || !subscriber) {
    return NextResponse.json(
      { error: "Could not complete signup — please try again." },
      { status: 500 },
    );
  }

  // Unique single-use 15% code. Stripe promo creation is a stub until
  // STRIPE_ENABLED — the code row exists now so the email/persona pipeline and
  // UI can be verified; real promotion codes attach in phase 3.
  const code = generateCode();
  const stripePromotionCodeId =
    process.env.STRIPE_ENABLED === "true"
      ? null // TODO(phase 3): create Stripe promotion code (first_time_transaction, max_redemptions 1)
      : "stub_pending_stripe";

  if (stripePromotionCodeId === null) {
    return NextResponse.json(
      { error: "Stripe issuance not implemented yet." },
      { status: 501 },
    );
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

  return NextResponse.json({ ok: true, discountCode: codeError ? null : code });
}

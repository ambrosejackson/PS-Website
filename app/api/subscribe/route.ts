import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscribeEmail } from "@/lib/newsletter/subscribe";

/**
 * Newsletter signup: inserts into subscribers with persona / brand_context /
 * source_path (guardrail #7) and issues a unique single-use 15% merch code.
 * The insert + code issuance live in lib/newsletter/subscribe.ts so the account
 * signup opt-in can reuse them; this route owns request validation and consent.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const result = await subscribeEmail(supabase, { email, sourcePath });
  if (!result.ok) {
    return NextResponse.json(
      { error: "Could not complete signup — please try again." },
      { status: 500 },
    );
  }
  if (result.alreadySubscribed) {
    return NextResponse.json({ ok: true, alreadySubscribed: true, discountCode: result.discountCode });
  }
  return NextResponse.json({ ok: true, discountCode: result.discountCode });
}

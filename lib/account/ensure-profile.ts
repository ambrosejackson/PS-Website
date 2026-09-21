import "server-only";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { subscribeEmail } from "@/lib/newsletter/subscribe";
import { parseProfile, type ProfileInput } from "@/lib/account/profile";

/** Where signup-sourced subscribers say they came from (persona → Private Stock). */
const SIGNUP_SOURCE_PATH = "/signup";

/**
 * Write the customer_profiles row for a VERIFIED user and, only when they
 * opted in, add their address(es) to the newsletter. Service role: the table
 * has no insert policy by design. Never overwrites an existing profile.
 */
export async function createProfile(user: User, profile: ProfileInput): Promise<boolean> {
  if (!user.email || !user.email_confirmed_at) return false;
  const db = createAdminClient();

  const { data: existing } = await db
    .from("customer_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return true;

  const { error } = await db.from("customer_profiles").insert({
    id: user.id,
    first_name: profile.firstName,
    last_name: profile.lastName,
    birth_month: profile.birthMonth,
    birth_day: profile.birthDay,
    zip: profile.zip,
    personal_email: profile.personalEmail,
    marketing_opt_in_at: profile.marketingOptIn ? new Date().toISOString() : null,
    age_attested_at: profile.ageAttestedAt,
  });
  if (error) {
    console.error("[account] profile insert failed:", error.message);
    return false;
  }

  if (profile.marketingOptIn) {
    const emails = [user.email.toLowerCase(), profile.personalEmail].filter(
      (e): e is string => Boolean(e),
    );
    for (const email of emails) {
      const res = await subscribeEmail(db, { email, sourcePath: SIGNUP_SOURCE_PATH });
      if (!res.ok) console.error("[account] newsletter opt-in failed for one address");
    }
  }
  return true;
}

/**
 * First verified sign-in after /signup: the form fields ride along in
 * user_metadata.pending_profile (set by signInWithOtp for NEW users only).
 * Re-validated here because user_metadata is user-writable.
 */
export async function ensureProfileFromMetadata(user: User): Promise<void> {
  const pending = user.user_metadata?.pending_profile;
  if (!pending || typeof pending !== "object" || !user.email) return;
  const parsed = parseProfile(pending as Record<string, unknown>, user.email);
  if (!parsed.ok) return;
  await createProfile(user, parsed.profile);
}

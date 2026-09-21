"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_RE, parseProfile, safeNext } from "@/lib/account/profile";
import { createProfile } from "@/lib/account/ensure-profile";

/**
 * Consumer auth is MAGIC LINK ONLY (PRD §2.7) — no passwords are ever set for
 * customers. /admin keeps its own password login + email allowlist; a customer
 * session never satisfies isAdminEmail().
 */

export type AuthFormState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

const GENERIC_ERROR = "Something went wrong — please try again in a minute.";

/** Origin of the current request, so preview deployments email preview links. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin && /^https?:\/\//.test(origin)) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://privatestock.co";
}

function callbackUrl(origin: string, next: string): string {
  return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
}

function isRateLimit(message: string | undefined): boolean {
  return /rate limit|too many|security purposes/i.test(message ?? "");
}

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  // Honeypot — bots fill it, people never see it. Pretend it worked.
  if (String(formData.get("website") ?? "") !== "") return { status: "sent", email: "" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Please enter a valid email address." };
  if (formData.get("ageAttested") !== "on") {
    return { status: "error", message: "You must confirm you are 21 or older to join." };
  }

  const parsed = parseProfile(Object.fromEntries(formData), email, {
    ageAttestedAt: new Date().toISOString(),
  });
  if (!parsed.ok) return { status: "error", message: parsed.error };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: callbackUrl(await siteOrigin(), "/account"),
      // Applied to NEW users only; the callback turns it into a profile row
      // once the link proves they own the address.
      data: { pending_profile: parsed.profile },
    },
  });
  if (error) {
    console.error("[signup] signInWithOtp:", error.message);
    return {
      status: "error",
      message: isRateLimit(error.message)
        ? "We just sent you a link — give it a minute before requesting another."
        : GENERIC_ERROR,
    };
  }
  return { status: "sent", email };
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { status: "error", message: "Please enter a valid email address." };
  const next = safeNext(String(formData.get("next") ?? ""));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: callbackUrl(await siteOrigin(), next) },
  });
  if (error && isRateLimit(error.message)) {
    return { status: "error", message: "We just sent you a link — give it a minute before requesting another." };
  }
  // Same answer whether or not the address has an account (no enumeration).
  if (error) console.error("[login] signInWithOtp:", error.message);
  return { status: "sent", email };
}

/** /account, signed in but no profile yet (e.g. an account that predates signup). */
export async function completeProfileAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  if (formData.get("ageAttested") !== "on") {
    return { status: "error", message: "You must confirm you are 21 or older to join." };
  }
  const parsed = parseProfile(Object.fromEntries(formData), user.email, {
    ageAttestedAt: new Date().toISOString(),
  });
  if (!parsed.ok) return { status: "error", message: parsed.error };

  const ok = await createProfile(user, parsed.profile);
  if (!ok) return { status: "error", message: GENERIC_ERROR };
  redirect("/account");
}

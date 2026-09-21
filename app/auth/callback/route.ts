import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileFromMetadata } from "@/lib/account/ensure-profile";
import { safeNext } from "@/lib/account/profile";

/**
 * Magic-link landing. Handles both link shapes Supabase can email:
 *  - ?code=…            PKCE (default template). Must open in the SAME browser
 *                       that requested the link.
 *  - ?token_hash=…&type=…  works from any device, if the email template is
 *                       switched to {{ .TokenHash }} later.
 * On the first verified sign-in after /signup it writes the profile row.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let failed = true;
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failed = Boolean(error);
  }

  if (failed) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", "link");
    return NextResponse.redirect(login);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    try {
      await ensureProfileFromMetadata(user);
    } catch (e) {
      // Never strand a verified user; /account offers the form again.
      console.error("[auth/callback] profile:", e instanceof Error ? e.message : e);
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}

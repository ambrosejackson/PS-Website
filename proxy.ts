import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin/allowlist";

/**
 * Session refresh for the routes that read a Supabase session, plus the staff
 * gate for /admin (Next 16 proxy, formerly middleware). Static public pages
 * never touch Supabase auth, so the matcher stays narrow: /admin, the three
 * customer-account routes and /checkin (event door staff, D-096; that page
 * checks admin-or-staff_roles itself). The allowlist gate applies to /admin ONLY — a
 * customer session refreshes here but never satisfies isAdminEmail().
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the session if expired; also used for the gate below.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Customer-account routes: refresh only. Their pages do their own redirects.
  if (!request.nextUrl.pathname.startsWith("/admin")) return response;

  const isLoginPage = request.nextUrl.pathname.startsWith("/admin/login");
  const authorized = isAdminEmail(user?.email);

  if (!authorized && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (authorized && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/login", "/signup", "/checkin/:path*"],
};

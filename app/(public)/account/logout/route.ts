import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST /account/logout — mirrors /admin/logout, lands on the homepage. */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { CompleteProfileForm } from "@/components/account/AuthForms";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MONTHS } from "@/lib/account/profile";

export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

/** Orders a customer may see: anything that was actually paid for. */
const VISIBLE_ORDER_STATUSES = ["paid", "submitted_to_provider", "shipped", "delivered", "refunded"];

const money = (cents: number | null) =>
  cents == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

/**
 * /account — the header login icon's target. Signed out → /login.
 * Order history matches orders.email to the VERIFIED login email only (PRD §2.9);
 * customer_profiles.personal_email is never part of that match. orders has RLS
 * with no policies, so the read goes through the service role after the check.
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login?next=/account");

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("first_name, last_name, birth_month, birth_day, zip, personal_email, created_at")
    .eq("id", user.id)
    .maybeSingle();

  let orders: { id: string; created_at: string; total_cents: number | null; status: string; fulfillment_status: string }[] = [];
  if (user.email_confirmed_at) {
    const { data } = await createAdminClient()
      .from("orders")
      .select("id, created_at, total_cents, status, fulfillment_status")
      .eq("email", user.email)
      .in("status", VISIBLE_ORDER_STATUSES)
      .order("created_at", { ascending: false })
      .limit(50);
    orders = data ?? [];
  }

  return (
    <main className="flex min-h-svh flex-col bg-white">
      <Header />
      <section className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">
            {profile ? `Hi, ${profile.first_name}` : "Your account"}
          </h1>
          <form action="/account/logout" method="post">
            <Button type="submit" variant="outline" size="sm">Log out</Button>
          </form>
        </div>

        {profile ? (
          <dl className="mt-10 grid gap-x-8 gap-y-5 border-t border-hairline pt-8 text-sm md:grid-cols-2">
            <div><dt className="text-neutral-500">Name</dt><dd className="mt-1 text-ink">{profile.first_name} {profile.last_name}</dd></div>
            <div><dt className="text-neutral-500">Email</dt><dd className="mt-1 break-all text-ink">{user.email}</dd></div>
            {profile.personal_email && (
              <div><dt className="text-neutral-500">Personal email</dt><dd className="mt-1 break-all text-ink">{profile.personal_email}</dd></div>
            )}
            {profile.birth_month && profile.birth_day && (
              <div><dt className="text-neutral-500">Birthday</dt><dd className="mt-1 text-ink">{MONTHS[profile.birth_month - 1]} {profile.birth_day}</dd></div>
            )}
            {profile.zip && <div><dt className="text-neutral-500">ZIP</dt><dd className="mt-1 text-ink">{profile.zip}</dd></div>}
            <div><dt className="text-neutral-500">Member since</dt><dd className="mt-1 text-ink">{day(profile.created_at)}</dd></div>
          </dl>
        ) : (
          <div className="mt-10 border-t border-hairline pt-8">
            <h2 className="font-condensed text-xl font-semibold uppercase tracking-tight text-ink">Finish your profile</h2>
            <p className="mt-2 text-sm text-neutral-600">You&apos;re signed in as {user.email}. A few details and you&apos;re a member.</p>
            <div className="mt-6 max-w-xl"><CompleteProfileForm /></div>
          </div>
        )}

        <h2 className="mt-14 font-condensed text-xl font-semibold uppercase tracking-tight text-ink">Orders</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">
            No orders under {user.email} yet.{" "}
            <Link href="/apparel" className="text-ink underline underline-offset-4">Shop apparel</Link>
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-4 text-sm">
                <span className="text-ink">{day(o.created_at)}</span>
                <span className="font-mono text-xs text-neutral-500">#{o.id.slice(0, 8).toUpperCase()}</span>
                <span className="capitalize text-neutral-600">{o.fulfillment_status.replaceAll("_", " ")}</span>
                <span className="font-medium text-ink">{money(o.total_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Footer />
    </main>
  );
}

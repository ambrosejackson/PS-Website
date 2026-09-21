import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { SignupForm } from "@/components/account/AuthForms";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your free Private Stock Rewards account.",
  robots: { index: false, follow: false },
};

/** /signup — magic-link account creation. Target of the Rewards hero's "Sign up free". */
export default async function SignupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/account");

  return (
    <main className="flex min-h-svh flex-col bg-white">
      <Header />
      <section className="mx-auto w-full max-w-xl flex-1 px-5 py-12 md:py-20">
        <h1 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">Join Private Stock Rewards</h1>
        <p className="mt-4 leading-relaxed text-neutral-600">
          Free to join. Tell us a little about you and we&apos;ll email a link to finish signing up.
        </p>
        <div className="mt-10">
          <SignupForm />
        </div>
      </section>
      <Footer />
    </main>
  );
}

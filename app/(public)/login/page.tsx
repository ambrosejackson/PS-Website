import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { LoginForm } from "@/components/account/AuthForms";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/account/profile";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

/** /login — customers sign in by emailed link only. Staff use /admin/login. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const dest = safeNext(next);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(dest);

  return (
    <main className="flex min-h-svh flex-col bg-white">
      <Header />
      <section className="mx-auto w-full max-w-md flex-1 px-5 py-12 md:py-20">
        <h1 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">Log in</h1>
        <p className="mt-4 leading-relaxed text-neutral-600">
          Enter your email and we&apos;ll send you a link. No password needed.
        </p>
        <div className="mt-10">
          <LoginForm next={dest} linkError={error === "link"} />
        </div>
      </section>
      <Footer />
    </main>
  );
}

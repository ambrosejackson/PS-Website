import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { RewardsHero } from "@/components/site/RewardsHero";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { Footer } from "@/components/site/Footer";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Your Rewards",
  description:
    "Private Stock rewards are coming soon — join the waitlist to be first in line.",
};

/**
 * /rewards. The Rewards hero replaces the admin-managed HeroSwitcher here
 * (D-089): /admin/heroes rows for page "/rewards" no longer render on this page
 * (rows untouched), and the header's nav hover-swap has nothing to swap.
 */
export default function RewardsPage() {
  return (
    <main>
      <Header />
      <RewardsHero />
      <section className="mx-auto max-w-2xl px-5 py-20 text-center md:py-28">
        {/* h2: the hero above owns the page's h1. */}
        <h2 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">
          YOUR REWARDS
        </h2>
        <p className="mt-6 leading-relaxed text-neutral-600">
          Points for every scan, redeemable for merch and exclusives. The
          rewards program is going through final review — join the waitlist and
          you&apos;ll be first in when doors open.
        </p>
        <div className="mt-10">
          <NewsletterForm />
        </div>
      </section>
      <Footer />
    </main>
  );
}

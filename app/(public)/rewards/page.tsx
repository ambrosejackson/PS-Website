import type { Metadata } from "next";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { Footer } from "@/components/site/Footer";
import { getHeroesForPage } from "@/lib/data";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Your Rewards",
  description:
    "Private Stock rewards are coming soon — join the waitlist to be first in line.",
};

export default async function RewardsPage() {
  const heroes = await getHeroesForPage("/rewards");
  return (
    <main>
      <HeroSwitcher heroes={heroes} heightClassName="h-[45svh]" />
      <section className="mx-auto max-w-2xl px-5 py-20 text-center md:py-28">
        <h1 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">
          YOUR REWARDS
        </h1>
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

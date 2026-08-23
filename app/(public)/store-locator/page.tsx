import type { Metadata } from "next";
import Link from "next/link";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { AvailabilityMap } from "@/components/site/AvailabilityMap";
import { Footer } from "@/components/site/Footer";
import { BRANDS, brandBySlug } from "@/lib/brands";
import { getHeroesForPage, getStoreLocations } from "@/lib/data";
import { availabilityComingSoon } from "@/lib/showRealAvailability";
import { NewsletterSection } from "@/components/site/NewsletterSection";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Store Locator",
  description:
    "Find dispensaries carrying Private Stock brands — Outfitters, TerpKings, Higher Self, and Savage Squad Strains.",
};

const TIER_LABEL: Record<string, string> = {
  live: "On the menu now",
  recent: "Carried recently",
  listed: "Carries our brands",
};

const FILTER_BASE =
  "inline-flex items-center border px-4 py-2 font-condensed text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors";

export default async function StoreLocatorPage({
  searchParams,
}: {
  /** ?brand=<slug> — deep-linked from the landing page's BUY NOW buttons. */
  searchParams: Promise<{ brand?: string }>;
}) {
  const [heroes, stores, params] = await Promise.all([
    getHeroesForPage("/store-locator"),
    getStoreLocations(),
    searchParams,
  ]);

  // Production on mock PSM data → "coming soon" (lib/showRealAvailability.ts).
  const comingSoon = availabilityComingSoon();
  // Unknown slugs fall back to "all" rather than showing an empty list.
  const brand = params.brand ? brandBySlug(params.brand.toLowerCase()) : undefined;
  const visible = brand
    ? stores.filter((s) =>
        s.brands.some((b) => b.toLowerCase() === brand.name.toLowerCase()),
      )
    : stores;

  return (
    <main>
      <HeroSwitcher heroes={heroes} heightClassName="h-[45svh]" />
      <section className="mx-auto max-w-screen-2xl px-6 py-14 md:px-12 md:py-20">
        <h1 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">
          STORE LOCATOR
        </h1>
        {comingSoon ? (
          <div className="mt-10 border border-hairline bg-[#fafafa] px-6 py-16 text-center md:py-24">
            <p className="font-condensed text-xs font-semibold uppercase tracking-[0.3em] text-caption">Coming soon</p>
            <h2 className="mt-4 font-condensed text-3xl font-bold uppercase tracking-tight text-ink md:text-4xl">
              Find Private Stock at licensed Illinois dispensaries
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-neutral-500">
              Live store availability for Outfitters, TerpKings, Higher Self and Savage Squad Strains is on its way.
              Until then, ask for our brands at your local licensed dispensary — and join the list below to hear the
              moment the locator goes live.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {BRANDS.map((b) => (
                <Link
                  key={b.slug}
                  href={`/${b.slug}`}
                  className={`${FILTER_BASE} border-hairline text-neutral-500 hover:border-ink hover:text-ink`}
                >
                  {b.name}
                </Link>
              ))}
            </div>
          </div>
        ) : stores.length > 0 ? (
          <>
            <p className="mt-3 max-w-xl text-sm text-amber-600">
              Preview build — showing mock store data until the live feed
              connects.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/store-locator"
                aria-current={brand ? undefined : "page"}
                className={`${FILTER_BASE} ${
                  brand
                    ? "border-hairline text-neutral-500 hover:border-ink hover:text-ink"
                    : "border-ink bg-ink text-white"
                }`}
              >
                All Brands
              </Link>
              {BRANDS.map((b) => {
                const active = brand?.slug === b.slug;
                return (
                  <Link
                    key={b.slug}
                    href={`/store-locator?brand=${b.slug}`}
                    aria-current={active ? "page" : undefined}
                    className={`${FILTER_BASE} ${
                      active
                        ? "border-ink bg-ink text-white"
                        : "border-hairline text-neutral-500 hover:border-ink hover:text-ink"
                    }`}
                  >
                    {b.name}
                  </Link>
                );
              })}
            </div>
            {visible.length > 0 ? (
              <div className="mt-10 grid gap-10 md:grid-cols-2">
                <ul className="divide-y">
                  {visible.map((s) => (
                    <li key={s.id} className="py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          {s.menu_url ? (
                            <a
                              href={s.menu_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="nav-underline text-sm font-medium text-neutral-900"
                            >
                              {s.name}
                            </a>
                          ) : (
                            <span className="text-sm font-medium text-neutral-900">
                              {s.name}
                            </span>
                          )}
                          <p className="text-xs text-neutral-500">
                            {[s.address_line1, s.city, s.state, s.zip]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          {s.brands.length > 0 && (
                            <p className="mt-1 text-[11px] text-neutral-400">
                              {s.brands.join(" · ")}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full border px-3 py-1 text-[10px] tracking-widest text-neutral-500">
                          {TIER_LABEL[s.availability_tier ?? ""] ?? "Listed"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <AvailabilityMap stores={visible} />
              </div>
            ) : (
              <p className="mt-10 rounded border border-dashed p-10 text-center text-sm text-neutral-400">
                No listed stores are carrying {brand?.name} right now — try
                another brand or view all stores.
              </p>
            )}
          </>
        ) : (
          <p className="mt-10 rounded border border-dashed p-10 text-center text-sm text-neutral-400">
            The store locator comes online with the live store data feed —
            check back soon.
          </p>
        )}
      </section>
      {comingSoon && <NewsletterSection />}
      <Footer />
    </main>
  );
}

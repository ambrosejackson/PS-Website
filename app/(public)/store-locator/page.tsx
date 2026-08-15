import type { Metadata } from "next";
import { HeroSwitcher } from "@/components/site/HeroSwitcher";
import { AvailabilityMap } from "@/components/site/AvailabilityMap";
import { Footer } from "@/components/site/Footer";
import { getHeroesForPage, getStoreLocations } from "@/lib/data";

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

export default async function StoreLocatorPage() {
  const [heroes, stores] = await Promise.all([
    getHeroesForPage("/store-locator"),
    getStoreLocations(),
  ]);

  return (
    <main>
      <HeroSwitcher heroes={heroes} heightClassName="h-[45svh]" />
      <section className="mx-auto max-w-screen-2xl px-6 py-14 md:px-12 md:py-20">
        <h1 className="font-condensed text-4xl font-bold uppercase tracking-tight text-ink">
          STORE LOCATOR
        </h1>
        {stores.length > 0 ? (
          <>
            <p className="mt-3 max-w-xl text-sm text-amber-600">
              Preview build — showing mock store data until the live feed
              connects.
            </p>
            <div className="mt-10 grid gap-10 md:grid-cols-2">
              <ul className="divide-y">
                {stores.map((s) => (
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
              <AvailabilityMap stores={stores} />
            </div>
          </>
        ) : (
          <p className="mt-10 rounded border border-dashed p-10 text-center text-sm text-neutral-400">
            The store locator comes online with the live store data feed —
            check back soon.
          </p>
        )}
      </section>
      <Footer />
    </main>
  );
}

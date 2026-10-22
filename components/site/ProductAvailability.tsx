"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AvailabilityMap } from "@/components/site/AvailabilityMap";
import { useZipDistance } from "@/components/site/useZipDistance";
import type { ProductStoreAvailability, StoreLocation } from "@/lib/data";
import { formatMiles } from "@/lib/geo";

/**
 * "Buy now near you" on product pages (PRD-PRODUCT-PAGE-AVAILABILITY, D-118).
 * Lists every store whose menu shows this strain in any format, with the
 * sizes seen on that menu (page's own size first), a deep link to the menu,
 * and the shared ZIP → distance search (D-116). With no ZIP: Chicago first,
 * then by city. Shows ALL matching stores, not a top five (PRD decision 4).
 * When no store lists the strain, falls back to stores carrying the brand.
 */

const TIER_LABEL: Record<string, string> = {
  live: "On the menu now",
  recent: "Carried recently",
  listed: "Carries our brands",
};

const TIER_STYLE: Record<string, string> = {
  live: "border-ink bg-ink text-white",
  recent: "border-hairline text-neutral-500",
  listed: "border-hairline text-neutral-400",
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function addressLine(s: StoreLocation): string {
  return [s.address_line1, s.city, s.state].filter(Boolean).join(", ");
}

function directionsHref(s: StoreLocation): string {
  const q = [s.name, s.address_line1, s.city, s.state, s.zip].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

/** Default order with no ZIP: Chicago first (most stores), then by city, then name. */
function defaultOrder(a: StoreLocation, b: StoreLocation): number {
  const ac = (a.city ?? "").toLowerCase() === "chicago" ? 0 : 1;
  const bc = (b.city ?? "").toLowerCase() === "chicago" ? 0 : 1;
  return ac - bc || (a.city ?? "").localeCompare(b.city ?? "") || a.name.localeCompare(b.name);
}

type Ranked = ProductStoreAvailability & { miles: number | null };

export function ProductAvailability({
  strainName,
  brand,
  brandSlug,
  stores,
  brandStores,
}: {
  strainName: string;
  brand: string;
  brandSlug: string;
  stores: ProductStoreAvailability[];
  brandStores: StoreLocation[];
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const { query, onQueryChange, zipMode, zipUnknown, zip, milesTo } = useZipDistance();

  const ranked = useMemo<Ranked[]>(() => {
    const withMiles = stores.map((s) => ({ ...s, miles: milesTo(s.store) }));
    if (zipMode) {
      // Pinless stores cannot be ranked by distance; keep them, at the end.
      return withMiles.sort((a, b) => {
        if (a.miles == null && b.miles == null) return defaultOrder(a.store, b.store);
        if (a.miles == null) return 1;
        if (b.miles == null) return -1;
        return a.miles - b.miles;
      });
    }
    // Server order already puts page-size matches and live stores first; keep that, then geography.
    return withMiles.sort(
      (a, b) =>
        Number(b.hasPageVariant) - Number(a.hasPageVariant) ||
        Number(b.store.availability_tier === "live") - Number(a.store.availability_tier === "live") ||
        defaultOrder(a.store, b.store),
    );
  }, [stores, zipMode, milesTo]);

  const liveCount = stores.filter((s) => s.store.availability_tier === "live").length;
  const mapStores = useMemo(() => ranked.map((r) => r.store), [ranked]);
  const locatorHref = `/store-locator?brand=${brandSlug}`;

  // ---- Fallback: no store lists this strain ----
  if (stores.length === 0) {
    const fallback = [...brandStores].sort(defaultOrder).slice(0, 6);
    return (
      <div className="mt-8 border border-dashed border-hairline p-8 md:p-10">
        <p className="text-sm text-neutral-600">
          No dispensary menu is showing <span className="font-medium text-ink">{strainName}</span> right now.
          {fallback.length > 0 ? ` These stores carry ${brand} — call ahead or check their menu.` : ""}
        </p>
        {fallback.length > 0 && (
          <ul className="mt-6 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {fallback.map((s) => (
              <li key={s.id} className="text-sm">
                {s.menu_url ? (
                  <a href={s.menu_url} target="_blank" rel="noopener noreferrer" className="nav-underline font-medium text-ink">
                    {s.name}
                  </a>
                ) : (
                  <span className="font-medium text-ink">{s.name}</span>
                )}
                <p className="text-xs text-neutral-500">{addressLine(s)}</p>
              </li>
            ))}
          </ul>
        )}
        <Link
          href={locatorHref}
          className="nav-underline mt-6 inline-block font-condensed text-[11px] font-semibold uppercase tracking-[0.16em] text-ink"
        >
          All {brand} stores on the locator
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex-1 md:max-w-sm">
          <span className="sr-only">Enter your ZIP code to sort by distance</span>
          <input
            type="search"
            inputMode="numeric"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Your ZIP code — sort by distance"
            className="w-full border border-hairline bg-white px-4 py-2.5 text-sm text-ink placeholder:text-neutral-400 focus:border-ink focus:outline-none"
          />
        </label>
        <p className="font-condensed text-[11px] uppercase tracking-[0.16em] text-neutral-500">
          {zipMode ? (
            <>
              {ranked.length} {ranked.length === 1 ? "store" : "stores"}, nearest to {zip} first
            </>
          ) : (
            <>
              {ranked.length} {ranked.length === 1 ? "store" : "stores"}
            </>
          )}
          {liveCount > 0 && <> · {liveCount} on the menu now</>}
        </p>
      </div>

      {zipUnknown && (
        <p className="mt-3 text-xs text-neutral-500">
          {zip} isn’t an Illinois ZIP code we recognize — showing all stores.
        </p>
      )}

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <ul className="divide-y divide-hairline border-t border-hairline">
          {ranked.map(({ store, variants, checked_at, menuHref, miles }) => {
            const tier = store.availability_tier ?? "listed";
            const live = tier === "live";
            const isOpen = selected === store.id;
            return (
              <li
                key={store.id}
                id={`store-${store.id}`}
                className={`py-5 transition-colors ${isOpen ? "bg-[#fafafa]" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelected(isOpen ? null : store.id)}
                      className="text-left font-condensed text-base font-semibold uppercase tracking-tight text-ink"
                    >
                      {store.name}
                    </button>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                      {addressLine(store)}
                      {miles != null && <span className="text-neutral-400"> · {formatMiles(miles)}</span>}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-1.5">
                      {variants.map((v) => (
                        <span
                          key={v.label}
                          className={`border px-2 py-0.5 font-condensed text-[10px] uppercase tracking-[0.14em] ${
                            v.matchesPage ? "border-ink text-ink" : "border-hairline text-neutral-500"
                          }`}
                          title={v.matchesPage ? "This size" : undefined}
                        >
                          {v.label}
                        </span>
                      ))}
                    </p>
                    <p className="mt-2 text-[11px] text-neutral-400">
                      {live ? `On the menu as of ${shortDate(checked_at)}` : "Carried here recently"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 border px-2.5 py-1 font-condensed text-[10px] uppercase tracking-[0.14em] ${
                      TIER_STYLE[tier] ?? TIER_STYLE.listed
                    }`}
                  >
                    {TIER_LABEL[tier] ?? TIER_LABEL.listed}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-4">
                  {menuHref && (
                    <a
                      href={menuHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="nav-underline font-condensed text-[11px] font-semibold uppercase tracking-[0.16em] text-ink"
                    >
                      See menu
                    </a>
                  )}
                  <a
                    href={directionsHref(store)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-underline font-condensed text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500"
                  >
                    Get directions
                  </a>
                </div>
              </li>
            );
          })}
        </ul>

        <div>
          <AvailabilityMap
            stores={mapStores}
            selectedId={selected}
            onSelect={(id) => {
              setSelected(id);
              document.getElementById(`store-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
          <Link
            href={locatorHref}
            className="nav-underline mt-4 inline-block font-condensed text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500"
          >
            Find more {brand} stores
          </Link>
        </div>
      </div>
    </>
  );
}

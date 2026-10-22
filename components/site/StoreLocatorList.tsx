"use client";

import { useMemo, useState } from "react";
import { AvailabilityMap } from "@/components/site/AvailabilityMap";
import type { StoreWithProducts } from "@/lib/data";
import { ZIP_RE, formatMiles, lookupIlZip, milesBetween } from "@/lib/geo";

/**
 * Interactive half of the store locator (D-059/D-061). Brand filtering stays in
 * the URL (server-rendered, so /store-locator?brand=terpkings deep links and
 * indexes); city/ZIP search and map↔list selection live here.
 *
 * Search has two modes (D-098):
 *  - a 5-digit Illinois ZIP → the NEAREST_COUNT closest stores by straight-line
 *    distance from that ZIP's centroid, with miles shown;
 *  - anything else → substring match on name / chain / city / zip / street.
 * Stores with no coordinates cannot be ranked and are left out of ZIP results.
 */

const NEAREST_COUNT = 5;

type ZipState =
  | { kind: "none" }
  | { kind: "found"; zip: string; lat: number; lng: number }
  | { kind: "unknown"; zip: string };

type RankedStore = StoreWithProducts & { miles?: number };

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

function directionsHref(s: StoreWithProducts): string {
  const q = [s.name, s.address_line1, s.city, s.state, s.zip].filter(Boolean).join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

function checkedAgo(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "checked today";
  if (days === 1) return "checked yesterday";
  return `checked ${days} days ago`;
}

export function StoreLocatorList({ stores }: { stores: StoreWithProducts[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  // Last resolved ZIP lookup. Only applies while the input still holds that
  // ZIP, so stale async results and edits never leak into each other.
  const [zipState, setZipState] = useState<ZipState>({ kind: "none" });

  const trimmed = query.trim();
  const typedZip = ZIP_RE.test(trimmed) ? trimmed : null;

  function onQueryChange(next: string) {
    setQuery(next);
    const zip = next.trim();
    if (!ZIP_RE.test(zip)) return;
    // Resolve the ZIP to coordinates; the centroid table loads on first use.
    lookupIlZip(zip).then((hit) => {
      setZipState(hit ? { kind: "found", zip, lat: hit[0], lng: hit[1] } : { kind: "unknown", zip });
    });
  }

  const zipMode = zipState.kind === "found" && zipState.zip === typedZip;

  const visible = useMemo<RankedStore[]>(() => {
    if (zipMode) {
      return stores
        .filter((s) => s.latitude != null && s.longitude != null)
        .map((s) => ({ ...s, miles: milesBetween(zipState.lat, zipState.lng, s.latitude as number, s.longitude as number) }))
        .sort((a, b) => (a.miles as number) - (b.miles as number))
        .slice(0, NEAREST_COUNT);
    }
    const q = trimmed.toLowerCase();
    if (!q) return stores;
    return stores.filter((s) =>
      [s.name, s.chain_name, s.city, s.zip, s.address_line1]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q)),
    );
  }, [stores, trimmed, zipMode, zipState]);

  const liveCount = visible.filter((s) => s.availability_tier === "live").length;
  const zipUnknown = zipState.kind === "unknown" && zipState.zip === typedZip;

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="flex-1 md:max-w-sm">
          <span className="sr-only">Search by city, ZIP or dispensary name</span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="City, ZIP or dispensary name"
            className="w-full border border-hairline bg-white px-4 py-2.5 text-sm text-ink placeholder:text-neutral-400 focus:border-ink focus:outline-none"
          />
        </label>
        <p className="font-condensed text-[11px] uppercase tracking-[0.16em] text-neutral-500">
          {zipMode ? (
            <>
              {visible.length} nearest to {zipState.zip}
            </>
          ) : (
            <>
              {visible.length} {visible.length === 1 ? "dispensary" : "dispensaries"}
            </>
          )}
          {liveCount > 0 && <> · {liveCount} on the menu now</>}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 border border-dashed border-hairline p-10 text-center text-sm text-neutral-400">
          {zipUnknown
            ? `${zipState.zip} isn’t an Illinois ZIP code we recognize. Try a nearby ZIP or a city name.`
            : `Nothing matches “${query}”. Try a city or ZIP code.`}
        </p>
      ) : (
        <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ul className="divide-y divide-hairline border-t border-hairline">
            {visible.map((s) => {
              const tier = s.availability_tier ?? "listed";
              const isOpen = selected === s.id;
              return (
                <li
                  key={s.id}
                  id={`store-${s.id}`}
                  className={`py-5 transition-colors ${isOpen ? "bg-[#fafafa]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelected(isOpen ? null : s.id)}
                        className="text-left font-condensed text-base font-semibold uppercase tracking-tight text-ink"
                      >
                        {s.name}
                      </button>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                        {[s.address_line1, s.city, s.state, s.zip].filter(Boolean).join(", ")}
                        {s.miles != null && (
                          <span className="text-neutral-400"> · {formatMiles(s.miles)}</span>
                        )}
                      </p>
                      {s.brands.length > 0 && (
                        <p className="mt-2 flex flex-wrap gap-1.5">
                          {s.brands.map((b) => (
                            <span
                              key={b}
                              className="border border-hairline px-2 py-0.5 font-condensed text-[10px] uppercase tracking-[0.14em] text-neutral-500"
                            >
                              {b}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 border px-2.5 py-1 font-condensed text-[10px] uppercase tracking-[0.14em] ${
                        TIER_STYLE[tier] ?? TIER_STYLE.listed
                      }`}
                    >
                      {TIER_LABEL[tier] ?? TIER_LABEL.listed}
                    </span>
                  </div>

                  {s.products.length > 0 && (
                    <details className="mt-3" open={isOpen}>
                      <summary className="cursor-pointer font-condensed text-[11px] uppercase tracking-[0.16em] text-neutral-500 hover:text-ink">
                        {s.products.length} {s.products.length === 1 ? "product" : "products"} on their menu
                        {checkedAgo(s.availability_checked_at) && (
                          <span className="normal-case tracking-normal text-neutral-400">
                            {" "}
                            — {checkedAgo(s.availability_checked_at)}
                          </span>
                        )}
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {s.products.map((p) => (
                          <li key={`${p.brand}-${p.product_name}-${p.variant}`} className="text-xs text-neutral-600">
                            {p.menu_product_url ? (
                              <a
                                href={p.menu_product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="nav-underline"
                              >
                                {p.product_name}
                              </a>
                            ) : (
                              p.product_name
                            )}
                            {p.variant && <span className="text-neutral-400"> · {p.variant}</span>}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  <div className="mt-3 flex flex-wrap gap-4">
                    {s.menu_url && (
                      <a
                        href={s.menu_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="nav-underline font-condensed text-[11px] font-semibold uppercase tracking-[0.16em] text-ink"
                      >
                        See menu
                      </a>
                    )}
                    <a
                      href={directionsHref(s)}
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

          <AvailabilityMap
            stores={visible}
            selectedId={selected}
            onSelect={(id) => {
              setSelected(id);
              document.getElementById(`store-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        </div>
      )}
    </>
  );
}

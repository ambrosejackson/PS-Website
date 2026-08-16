"use client";

import { useState } from "react";
import { AvailabilityMap } from "@/components/site/AvailabilityMap";
import type { StoreLocation } from "@/lib/data";

/**
 * "Find Higher Self Near You" — our live locator styled to the reference
 * capture (search field + blue Search + Use My Location + rounded map card).
 * Brand-filtered; MOCK_PSM_DATA until the publish pipeline lands.
 */
export function HigherSelfLocator({ stores }: { stores: StoreLocation[] }) {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? stores.filter((s) =>
        [s.city, s.zip, s.name]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q)),
      )
    : stores;

  return (
    <div className="mx-auto max-w-3xl">
      {notice && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
          {notice}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter city or zip code…"
          className="h-12 flex-1 rounded-full border border-neutral-200 bg-white px-5 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-[#8fd0f8]"
          aria-label="Search by city or zip code"
        />
        <button
          onClick={() => setNotice(null)}
          className="h-12 rounded-full bg-[#8fd0f8] px-6 text-sm font-semibold text-white transition-colors hover:bg-[#6bbdf0]"
        >
          Search
        </button>
        <button
          onClick={() =>
            setNotice("Location access isn't wired up yet — showing Illinois.")
          }
          className="h-12 rounded-full border border-neutral-200 bg-white px-6 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Use My Location
        </button>
      </div>
      <div className="mt-5 rounded-2xl bg-neutral-100 p-2">
        <AvailabilityMap stores={filtered} />
      </div>
      <p className="mt-3 text-center text-xs text-neutral-400">
        {filtered.length > 0
          ? `${filtered.length} retailer${filtered.length === 1 ? "" : "s"} carrying Higher Self${q ? ` near “${query.trim()}”` : " across Illinois"}`
          : "No retailers match that search yet."}
      </p>
    </div>
  );
}

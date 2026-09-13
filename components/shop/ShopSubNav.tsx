"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BRANDS } from "@/lib/brands";
import { TABS } from "@/lib/merchCategories";
import { HOUSE_BRAND_SLUG } from "@/lib/merch/queries";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

export type SubNavCollection = { name: string; slug: string };

/**
 * Sub-nav bar under the hero (§6.2 #3 / §6.3 #3). Left: Shop all + the seven
 * TABS with the header's underline hover. Right: brand chips (grid pages) and a
 * Collections ▾ dropdown. `mode="home"` links to /apparel/shop; `mode="grid"`
 * filters in place on `basePath` and is sticky under the header. Mobile: tabs
 * scroll horizontally; on grid pages collections + brands collapse into a
 * Filter sheet.
 */
export function ShopSubNav({
  mode,
  collections,
  basePath = "/apparel/shop",
  activeTab = null,
  activeBrand = null,
}: {
  mode: "home" | "grid";
  collections: SubNavCollection[];
  basePath?: string;
  activeTab?: string | null;
  activeBrand?: string | null;
}) {
  const grid = mode === "grid";
  const target = grid ? basePath : "/apparel/shop";
  const [filterOpen, setFilterOpen] = useState(false);

  function href(tab: string | null, brand: string | null = grid ? activeBrand : null) {
    const p = new URLSearchParams();
    if (tab) p.set("tab", tab);
    if (brand) p.set("brand", brand);
    const q = p.toString();
    return q ? `${target}?${q}` : target;
  }

  const tabLink = (slug: string | null, label: string) => {
    const active = grid && (slug ?? null) === (activeTab ?? null);
    return (
      <Link
        key={slug ?? "all"}
        href={href(slug)}
        aria-current={active ? "page" : undefined}
        className={`nav-underline shrink-0 py-3 font-condensed text-xs font-semibold uppercase tracking-[0.12em] text-ink ${
          active ? "[&::after]:origin-left [&::after]:scale-x-100" : ""
        }`}
      >
        {label}
      </Link>
    );
  };

  const brandChips = [{ slug: HOUSE_BRAND_SLUG, name: "Private Stock" }, ...BRANDS.map((b) => ({ slug: b.slug, name: b.name }))];

  return (
    <div className={`border-b border-hairline bg-white ${grid ? "sticky top-0 z-30" : ""}`}>
      <div className="flex items-center gap-4 px-3 md:px-5">
        <nav aria-label="Shop categories" className="-mb-px flex min-w-0 flex-1 gap-5 overflow-x-auto [scrollbar-width:none] md:gap-7 [&::-webkit-scrollbar]:hidden">
          {tabLink(null, "Shop all")}
          {TABS.map((t) => tabLink(t.slug, t.label))}
        </nav>
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          {grid && (
            <div className="flex items-center gap-1.5" aria-label="Filter by brand">
              {brandChips.map((b) => {
                const active = activeBrand === b.slug;
                return (
                  <Link
                    key={b.slug}
                    href={href(activeTab, active ? null : b.slug)}
                    aria-pressed={active}
                    className={`rounded-full border px-2.5 py-1 font-condensed text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                      active ? "border-ink bg-ink text-white" : "border-hairline text-ink hover:border-ink"
                    }`}
                  >
                    {b.name}
                  </Link>
                );
              })}
            </div>
          )}
          {collections.length > 0 && <CollectionsDropdown collections={collections} />}
        </div>
        {grid && (
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="shrink-0 border border-hairline px-3 py-1.5 font-condensed text-[11px] font-semibold uppercase tracking-wide text-ink md:hidden"
          >
            Filter{activeBrand ? " ·" : ""}
          </button>
        )}
        {!grid && collections.length > 0 && (
          <div className="shrink-0 md:hidden">
            <CollectionsDropdown collections={collections} />
          </div>
        )}
      </div>

      {grid && (
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetContent side="bottom" className="max-h-[80svh] overflow-y-auto bg-white px-5 pb-8 pt-10 motion-reduce:transition-none">
            <SheetTitle className="font-condensed text-lg font-bold uppercase tracking-wide text-ink">Filter</SheetTitle>
            <SheetDescription className="sr-only">Filter by brand or jump to a collection.</SheetDescription>
            <p className="mt-4 font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-500">Brand</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {brandChips.map((b) => {
                const active = activeBrand === b.slug;
                return (
                  <Link
                    key={b.slug}
                    href={href(activeTab, active ? null : b.slug)}
                    onClick={() => setFilterOpen(false)}
                    aria-pressed={active}
                    className={`rounded-full border px-3 py-1.5 font-condensed text-[11px] font-semibold uppercase tracking-wide ${
                      active ? "border-ink bg-ink text-white" : "border-hairline text-ink"
                    }`}
                  >
                    {b.name}
                  </Link>
                );
              })}
            </div>
            {collections.length > 0 && (
              <>
                <p className="mt-6 font-condensed text-xs font-semibold uppercase tracking-wide text-neutral-500">Collections</p>
                <ul className="mt-2 divide-y divide-hairline">
                  {collections.map((c) => (
                    <li key={c.slug}>
                      <Link href={`/apparel/collections/${c.slug}`} onClick={() => setFilterOpen(false)} className="block py-3 font-condensed text-sm font-semibold uppercase tracking-wide text-ink">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function CollectionsDropdown({ collections }: { collections: SubNavCollection[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="nav-underline py-3 font-condensed text-xs font-semibold uppercase tracking-[0.12em] text-ink"
      >
        Collections ▾
      </button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-40 min-w-56 border border-hairline bg-white py-1 shadow-sm">
          {collections.map((c) => (
            <li key={c.slug} role="none">
              <Link
                role="menuitem"
                href={`/apparel/collections/${c.slug}`}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 font-condensed text-xs font-semibold uppercase tracking-wide text-ink hover:bg-neutral-100"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
